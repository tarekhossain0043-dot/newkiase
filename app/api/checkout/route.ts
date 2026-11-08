import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

const validPaymentMethods = ["cod", "bkash_manual", "nagad_manual"] as const;

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    const db = createSupabaseServiceClient();
    const body = await request.json();

    const customerName = typeof body.customer_name === "string" ? body.customer_name.trim() : "";
    const phone = typeof body.customer_phone === "string" ? body.customer_phone.replace(/[\s()-]/g, "") : "";
    const email = typeof body.customer_email === "string" ? body.customer_email.trim().slice(0, 254) : null;
    const address = typeof body.shipping_address === "string" ? body.shipping_address.trim() : "";
    const city = typeof body.shipping_city === "string" ? body.shipping_city.trim() : "";
    const notes = typeof body.notes === "string" ? body.notes.trim().slice(0, 1000) : "";
    const method = body.payment_method;
    const deliveryPaymentMethod = body.delivery_payment_method;
    const items = Array.isArray(body.items) ? body.items : [];

    const senderPhone = typeof body.sender_phone === "string" ? body.sender_phone.replace(/[\s-]/g, "").trim() : "";
    const transactionReference = typeof body.transaction_reference === "string" ? body.transaction_reference.trim().toUpperCase() : "";

    if (!customerName || customerName.length > 120 || !/^\+?\d{8,15}$/.test(phone) || !address || address.length > 1000 || !city || city.length > 100 || !validPaymentMethods.includes(method) || items.length < 1 || items.length > 50) {
      return NextResponse.json({ error: "Please provide valid delivery details, payment method and 1–50 cart items." }, { status: 400 });
    }
    if (method !== "cod" && (!/^01[3-9]\d{8}$/.test(senderPhone) || !/^[A-Z0-9-]{6,30}$/.test(transactionReference))) {
      return NextResponse.json({ error: "A valid 11-digit bKash/Nagad sender number and transaction ID are required." }, { status: 400 });
    }
    if (method === "cod" && deliveryPaymentMethod != null && !["bkash_manual","nagad_manual"].includes(deliveryPaymentMethod)) {
      return NextResponse.json({ error: "Choose bKash or Nagad for the prepaid delivery charge." }, { status: 400 });
    }

    const normalized = new Map<string, {quantity:number;selected_option:string}>();
    for (const item of items) {
      if (!item || typeof item.product_id !== "string" || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 20) {
        return NextResponse.json({ error: "Cart item is invalid." }, { status: 400 });
      }
      const selectedOption = typeof item.selected_option === "string" ? item.selected_option.trim().slice(0,40) : "";
      const existing = normalized.get(item.product_id);
      if (existing && existing.selected_option !== selectedOption) return NextResponse.json({ error: "Please add each product with one selected size per cart item." }, { status: 400 });
      normalized.set(item.product_id, { quantity: (existing?.quantity ?? 0) + item.quantity, selected_option: selectedOption });
    }

    const { data: products, error: productError } = await supabase
      .from("products")
      .select("id, sku, name, price, cost_price, stock_quantity, status, sizes, product_variants(id,sku,option_name,option_value,price_delta,stock_quantity,is_active)")
      .in("id", [...normalized.keys()]);
    if (productError || !products || products.length !== normalized.size) {
      return NextResponse.json({ error: "One or more products are unavailable." }, { status: 400 });
    }

    const orderLines = [];
    const variantReservations: Array<{ id: string; quantity: number; stock: number }> = [];
    let subtotal = 0;
    for (const product of products) {
      const selection = normalized.get(product.id) ?? {quantity:0,selected_option:""};
      const quantity = selection.quantity;
      const variants = (product.product_variants || []).filter((variant: any) => variant.is_active);
      const selectedVariant = variants.length ? variants.find((variant: any) => variant.option_value === selection.selected_option) : null;
      const availableSizes = Array.isArray(product.sizes) ? product.sizes : [];
      if (variants.length && !selectedVariant) return NextResponse.json({ error: "Please select an available option for " + product.name + "." }, { status: 400 });
      if (!variants.length && availableSizes.length && (!selection.selected_option || !availableSizes.includes(selection.selected_option))) return NextResponse.json({ error: "Please select a valid size for " + product.name + "." }, { status: 400 });
      if (selectedVariant && Number(selectedVariant.stock_quantity) < quantity) return NextResponse.json({ error: "Selected option is out of stock for " + product.name + "." }, { status: 409 });
      if (product.status !== "active" || product.stock_quantity < quantity) {
        return NextResponse.json({ error: "A product is out of stock or does not have enough stock." }, { status: 409 });
      }
      const unitPrice = Number(product.price) + (Number(selectedVariant?.price_delta) || 0);
      if (selectedVariant) variantReservations.push({ id: selectedVariant.id, quantity, stock: Number(selectedVariant.stock_quantity) });
      subtotal += unitPrice * quantity;
      orderLines.push({
        product_id: product.id,
        product_name: product.name,
        sku: selectedVariant?.sku || product.sku,
        unit_price: unitPrice,
        cost_price: Number(product.cost_price || 0),
        quantity,
        line_total: unitPrice * quantity,
        selected_option: selection.selected_option,
      });
    }

    // Server-calculated area delivery fee; never trust client-submitted totals.
    const normalizedCity = city.normalize("NFKC").trim().toLocaleLowerCase().replace(/[.,]/g, "").replace(/\s+/g, " ");
    const [{ data: shippingZones, error: shippingError }, { data: shippingSetting, error: settingsError }] = await Promise.all([
      db.from("shipping_zones")
        .select("name,cities,delivery_fee,cod_delivery_fee,free_shipping_threshold,is_active")
        .eq("is_active", true),
      db.from("site_settings").select("value").eq("key", "shipping").maybeSingle(),
    ]);
    if (shippingError || settingsError) return NextResponse.json({ error: "Could not calculate delivery fee. Please try again." }, { status: 503 });
    const settings = shippingSetting?.value && typeof shippingSetting.value === "object"
      ? shippingSetting.value as Record<string, unknown>
      : {};
    const freeDelivery = settings.free_delivery === true;
    const defaultFee = Math.max(0, Number(settings.default_delivery_fee ?? 80) || 0);
    const defaultCodFee = Math.max(0, Number(settings.default_cod_delivery_fee ?? defaultFee) || 0);
    const matchingZone = (shippingZones || []).find((zone: any) => {
      const cities = Array.isArray(zone.cities) ? zone.cities : [];
      const areas = [...cities, zone.name].map((area: unknown) => String(area ?? "").normalize("NFKC").trim().toLocaleLowerCase().replace(/[.,]/g, "").replace(/\s+/g, " ")).filter(Boolean);
      return areas.some((area: string) => area === normalizedCity || area.includes(normalizedCity) || normalizedCity.includes(area));
    });
    const rawThreshold = matchingZone?.free_shipping_threshold == null ? null : Number(matchingZone.free_shipping_threshold);
    const threshold = rawThreshold !== null && Number.isFinite(rawThreshold) && rawThreshold > 0 ? rawThreshold : null;
    const areaFee = matchingZone
      ? Math.max(0, Number(method === "cod" ? (matchingZone.cod_delivery_fee ?? matchingZone.delivery_fee) : matchingZone.delivery_fee) || 0)
      : method === "cod" ? defaultCodFee : defaultFee;
    const deliveryFee = freeDelivery || (threshold !== null && subtotal >= threshold) ? 0 : areaFee;
    const total = subtotal + deliveryFee;
    const { data: paymentSetting, error: paymentSettingError } = await db.from("site_settings").select("value").eq("key", "payment").maybeSingle();
    if (paymentSettingError) return NextResponse.json({ error: "Could not validate payment settings." }, { status: 503 });
    const paymentConfig = paymentSetting?.value && typeof paymentSetting.value === "object" ? paymentSetting.value as Record<string, unknown> : {};
    const walletMethodForRecord = method === "cod" && deliveryFee > 0 ? deliveryPaymentMethod : method;
    if (method === "cod" && deliveryFee > 0 && !["bkash_manual","nagad_manual"].includes(walletMethodForRecord)) return NextResponse.json({ error: "Select bKash or Nagad to prepay the delivery charge." }, { status: 400 });
    if (method === "cod" && deliveryFee > 0 && (!/^01[3-9]\d{8}$/.test(senderPhone) || !/^[A-Z0-9-]{6,30}$/.test(transactionReference))) return NextResponse.json({ error: "A valid sender number and transaction ID are required to prepay delivery." }, { status: 400 });
    const enabled = method === "cod" ? paymentConfig.cod_enabled !== false : method === "bkash_manual" ? paymentConfig.bkash_enabled !== false : paymentConfig.nagad_enabled !== false;
    const deliveryWalletEnabled = walletMethodForRecord === "bkash_manual" ? paymentConfig.bkash_enabled !== false : walletMethodForRecord === "nagad_manual" ? paymentConfig.nagad_enabled !== false : true;
    if (!enabled || !deliveryWalletEnabled) return NextResponse.json({ error: "This payment method is currently unavailable. Please choose another method." }, { status: 400 });
    const paymentStatus = method === "cod" && deliveryFee <= 0 ? "unpaid" : "pending_verification";

    const { data: order, error: orderError } = await db.from("orders").insert({
      customer_id: user?.id ?? null,
      customer_name: customerName,
      customer_phone: phone,
      customer_email: email,
      shipping_address: address,
      shipping_city: city,
      notes,
      payment_method: method,
      payment_status: paymentStatus,
      subtotal,
      delivery_fee: deliveryFee,
      total,
    }).select("*").single();
    if (orderError || !order) { console.error("[checkout] order insert failed:", orderError); return NextResponse.json({ error: "Could not create order.", database_error: orderError?.message, code: orderError?.code, hint: orderError?.hint }, { status: 500 }); }

    const { error: itemsError } = await db.from("order_items").insert(orderLines.map(line => ({ ...line, order_id: order.id })));
    if (itemsError) {
      await db.from("orders").delete().eq("id", order.id);
      console.error("[checkout] order_items insert failed:", itemsError); return NextResponse.json({ error: "Could not save order items.", database_error: itemsError.message, code: itemsError.code, hint: itemsError.hint }, { status: 500 });
    }

    const { error: paymentError } = await db.from("payments").insert({
      order_id: order.id,
      method: walletMethodForRecord,
      status: paymentStatus,
      amount: method === "cod" ? (deliveryFee > 0 ? deliveryFee : total) : total,
      purpose: method === "cod" ? (deliveryFee > 0 ? "delivery_fee" : "cod_collection") : "order_total",
      recipient_number: walletMethodForRecord === "bkash_manual" ? String(paymentConfig.bkash_number || "") : walletMethodForRecord === "nagad_manual" ? String(paymentConfig.nagad_number || "") : null,
      sender_phone: method === "cod" && deliveryFee <= 0 ? null : senderPhone,
      transaction_reference: method === "cod" && deliveryFee <= 0 ? null : transactionReference,
    });
    if (paymentError) {
      await db.from("orders").delete().eq("id", order.id);
      console.error("[checkout] payment insert failed:", paymentError); return NextResponse.json({ error: "Could not save payment details.", database_error: paymentError.message, code: paymentError.code, hint: paymentError.hint }, { status: 500 });
    }

    // Conditional stock updates help prevent overselling when orders arrive together.
    const adjusted: Array<{ id: string; quantity: number; previous: number }> = [];
    const adjustedVariants: Array<{ id: string; previous: number }> = [];
    for (const product of products) {
      const quantity = normalized.get(product.id)?.quantity ?? 0;
      const previous = Number(product.stock_quantity);
      const { data: updated, error: stockError } = await db
        .from("products")
        .update({ stock_quantity: previous - quantity, updated_at: new Date().toISOString() })
        .eq("id", product.id)
        .gte("stock_quantity", quantity)
        .select("id")
        .maybeSingle();
      if (stockError || !updated) {
        for (const item of adjusted.reverse()) await db.from("products").update({ stock_quantity: item.previous }).eq("id", item.id);
        for (const item of adjustedVariants) await db.from("product_variants").update({ stock_quantity: item.previous }).eq("id", item.id);
        await db.from("orders").delete().eq("id", order.id);
        return NextResponse.json({ error: "Stock changed during checkout. Refresh your cart and try again." }, { status: 409 });
      }
      adjusted.push({ id: product.id, quantity, previous });
      const variantReservation = variantReservations.find((variant) => (product.product_variants || []).some((row: any) => row.id === variant.id));
      if (variantReservation) {
        const { data: variantUpdated, error: variantError } = await db.from("product_variants")
          .update({ stock_quantity: variantReservation.stock - quantity })
          .eq("id", variantReservation.id).gte("stock_quantity", quantity).select("id").maybeSingle();
        if (variantError || !variantUpdated) {
          for (const item of adjusted.reverse()) await db.from("products").update({ stock_quantity: item.previous }).eq("id", item.id);
          for (const item of adjustedVariants) await db.from("product_variants").update({ stock_quantity: item.previous }).eq("id", item.id);
          await db.from("orders").delete().eq("id", order.id);
          return NextResponse.json({ error: "Selected option stock changed during checkout. Refresh and try again." }, { status: 409 });
        }
        adjustedVariants.push({ id: variantReservation.id, previous: variantReservation.stock });
      }
      await db.from("inventory_history").insert({
        product_id: product.id,
        quantity_change: -quantity,
        quantity_after: previous - quantity,
        reason: "Customer checkout",
        reference_order_id: order.id,
        changed_by: user?.id ?? null,
      });
    }

    const { error: notificationError } = await db.from("admin_notifications").insert({
      type: "order",
      title: "New order received",
      description: (order.order_number || "Order") + " · " + customerName + " · ৳" + total.toLocaleString("en-BD"),
      reference_id: order.id,
    });
    if (notificationError) console.error("[checkout] admin notification insert failed:", notificationError);

    return NextResponse.json({ order_number: order.order_number, status: order.status, payment_status: order.payment_status, subtotal, delivery_fee: deliveryFee, total }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("Supabase is not configured")) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
    console.error("[checkout] unexpected failure:", error);
    return NextResponse.json({ error: "Unable to place order.", database_error: message || "Unknown server error" }, { status: 500 });
  }
}
