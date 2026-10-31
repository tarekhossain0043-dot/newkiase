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
    const items = Array.isArray(body.items) ? body.items : [];

    if (!customerName || customerName.length > 120 || !/^\+?\d{8,15}$/.test(phone) || !address || address.length > 1000 || !city || city.length > 100 || !validPaymentMethods.includes(method) || items.length < 1 || items.length > 50) {
      return NextResponse.json({ error: "Please provide valid delivery details, payment method and 1–50 cart items." }, { status: 400 });
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
      .select("id, sku, name, price, stock_quantity, status, sizes")
      .in("id", [...normalized.keys()]);
    if (productError || !products || products.length !== normalized.size) {
      return NextResponse.json({ error: "One or more products are unavailable." }, { status: 400 });
    }

    const orderLines = [];
    let subtotal = 0;
    for (const product of products) {
      const selection = normalized.get(product.id) ?? {quantity:0,selected_option:""};
      const quantity = selection.quantity;
      const availableSizes = Array.isArray(product.sizes) ? product.sizes : [];
      if (availableSizes.length && (!selection.selected_option || !availableSizes.includes(selection.selected_option))) return NextResponse.json({ error: "Please select a valid size for " + product.name + "." }, { status: 400 });
      if (product.status !== "active" || product.stock_quantity < quantity) {
        return NextResponse.json({ error: "A product is out of stock or does not have enough stock." }, { status: 409 });
      }
      const unitPrice = Number(product.price);
      subtotal += unitPrice * quantity;
      orderLines.push({
        product_id: product.id,
        product_name: product.name,
        sku: product.sku,
        unit_price: unitPrice,
        quantity,
        line_total: unitPrice * quantity,
        selected_option: selection.selected_option,
      });
    }

    // Server-calculated area delivery fee; never trust client-submitted totals.
    const normalizedCity = city.trim().toLocaleLowerCase();
    const [{ data: shippingZones, error: shippingError }, { data: shippingSetting, error: settingsError }] = await Promise.all([
      db.from("shipping_zones")
        .select("name,cities,delivery_fee,free_shipping_threshold,is_active")
        .eq("is_active", true),
      db.from("site_settings").select("value").eq("key", "shipping").maybeSingle(),
    ]);
    if (shippingError || settingsError) return NextResponse.json({ error: "Could not calculate delivery fee. Please try again." }, { status: 503 });
    const settings = shippingSetting?.value && typeof shippingSetting.value === "object"
      ? shippingSetting.value as Record<string, unknown>
      : {};
    const freeDelivery = settings.free_delivery === true;
    const defaultFee = Math.max(0, Number(settings.default_delivery_fee ?? 0) || 0);
    const matchingZone = (shippingZones || []).find((zone: any) => {
      const cities = Array.isArray(zone.cities) ? zone.cities : [];
      return cities.some((area: string) => String(area).trim().toLocaleLowerCase() === normalizedCity);
    });
    const threshold = matchingZone?.free_shipping_threshold == null ? null : Number(matchingZone.free_shipping_threshold);
    const deliveryFee = freeDelivery
      ? 0
      : matchingZone
        ? (threshold !== null && subtotal >= threshold ? 0 : Math.max(0, Number(matchingZone.delivery_fee) || 0))
        : defaultFee;
    const total = subtotal + deliveryFee;
    const paymentStatus = method === "cod" ? "unpaid" : "pending_verification";

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
    if (orderError || !order) return NextResponse.json({ error: "Could not create order." }, { status: 500 });

    const { error: itemsError } = await db.from("order_items").insert(orderLines.map(line => ({ ...line, order_id: order.id })));
    if (itemsError) {
      await db.from("orders").delete().eq("id", order.id);
      return NextResponse.json({ error: "Could not save order items." }, { status: 500 });
    }

    const { error: paymentError } = await db.from("payments").insert({
      order_id: order.id,
      method,
      status: paymentStatus,
      sender_phone: typeof body.sender_phone === "string" ? body.sender_phone.trim().slice(0, 20) : null,
      transaction_reference: typeof body.transaction_reference === "string" ? body.transaction_reference.trim().slice(0, 80) : null,
    });
    if (paymentError) {
      await db.from("orders").delete().eq("id", order.id);
      return NextResponse.json({ error: "Could not save payment details." }, { status: 500 });
    }

    // Conditional stock updates help prevent overselling when orders arrive together.
    const adjusted: Array<{ id: string; quantity: number; previous: number }> = [];
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
        for (const item of adjusted.reverse()) {
          await db.from("products").update({ stock_quantity: item.previous }).eq("id", item.id);
        }
        await db.from("orders").delete().eq("id", order.id);
        return NextResponse.json({ error: "Stock changed during checkout. Refresh your cart and try again." }, { status: 409 });
      }
      adjusted.push({ id: product.id, quantity, previous });
      await db.from("inventory_history").insert({
        product_id: product.id,
        quantity_change: -quantity,
        quantity_after: previous - quantity,
        reason: "Customer checkout",
        reference_order_id: order.id,
        changed_by: user?.id ?? null,
      });
    }

    return NextResponse.json({ order_number: order.order_number, status: order.status, payment_status: order.payment_status, subtotal, delivery_fee: deliveryFee, total }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("Supabase is not configured")) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
    return NextResponse.json({ error: "Unable to place order." }, { status: 500 });
  }
}
