import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/admin";

const allowedTables = ["refund_requests", "payment_transactions", "shipping_zones", "promotions", "coupons"] as const;
type TableName = typeof allowedTables[number];

function validTable(value: unknown): value is TableName {
  return typeof value === "string" && allowedTables.includes(value as TableName);
}

export async function GET(request: Request) {
  try {
    const { supabase } = await requireAdmin();
    const url = new URL(request.url);
    const table = url.searchParams.get("table");
    if (table) {
      if (!validTable(table)) return NextResponse.json({ error: "Unsupported finance table." }, { status: 400 });
      const { data, error } = await supabase.from(table).select("*").order(table === "refund_requests" ? "requested_at" : table === "payment_transactions" ? "created_at" : "created_at", { ascending: false }).limit(500);
      if (error) throw error;
      return NextResponse.json({ records: data ?? [] });
    }
    const [refunds, transactions, shipping, promotions, coupons] = await Promise.all([
      supabase.from("refund_requests").select("*, orders(order_number,customer_name,total), payments(method,transaction_reference)").order("requested_at", { ascending: false }).limit(500),
      supabase.from("payment_transactions").select("*, orders(order_number,customer_name), payments(method)").order("created_at", { ascending: false }).limit(500),
      supabase.from("shipping_zones").select("*").order("created_at", { ascending: false }),
      supabase.from("promotions").select("*").order("created_at", { ascending: false }),
      supabase.from("coupons").select("*").order("created_at", { ascending: false }),
    ]);
    for (const result of [refunds, transactions, shipping, promotions, coupons]) if (result.error) throw result.error;
    return NextResponse.json({ refunds: refunds.data ?? [], transactions: transactions.data ?? [], shippingZones: shipping.data ?? [], promotions: promotions.data ?? [], coupons: coupons.data ?? [] });
  } catch (error) {
    console.error("[admin/finance GET]", error);
    return NextResponse.json({ error: "Could not load finance and operations records. Apply migration 202610290007 and check admin permissions." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { supabase, user } = await requireAdmin();
    const body = await request.json();
    const table = body?.table;
    const values = body?.values;
    if (!validTable(table) || !values || typeof values !== "object" || Array.isArray(values)) return NextResponse.json({ error: "A supported table and record values are required." }, { status: 400 });
    const allowed: Record<TableName, string[]> = {
      refund_requests: ["order_id","payment_id","amount","reason","status","provider_reference","admin_note","requested_by","processed_by","processed_at"],
      payment_transactions: ["order_id","payment_id","transaction_type","provider","provider_reference","amount","status","notes","created_by"],
      shipping_zones: ["name","cities","delivery_fee","free_shipping_threshold","estimated_days","is_active"],
      promotions: ["name","description","promotion_type","config","starts_at","ends_at","is_active","created_by"],
      coupons: ["code","description","discount_type","discount_value","minimum_order","usage_limit","starts_at","expires_at","is_active"],
    };
    const clean: Record<string, unknown> = {};
    for (const key of allowed[table]) if (key in values) clean[key] = values[key];
    if (table === "refund_requests") { clean.requested_by = user.id; }
    if (table === "payment_transactions" || table === "promotions") clean.created_by = user.id;
    if (table === "refund_requests" && (!clean.order_id || !Number.isFinite(Number(clean.amount)) || Number(clean.amount) <= 0 || !String(clean.reason || "").trim())) return NextResponse.json({ error: "Refund requires an order, positive amount, and reason." }, { status: 400 });
    if (table === "payment_transactions" && (!["payment","refund","adjustment"].includes(String(clean.transaction_type)) || !Number.isFinite(Number(clean.amount)) || Number(clean.amount) < 0)) return NextResponse.json({ error: "Transaction type or amount is invalid." }, { status: 400 });
    if (table === "shipping_zones" && (!String(clean.name || "").trim() || !Number.isFinite(Number(clean.delivery_fee)) || Number(clean.delivery_fee) < 0)) return NextResponse.json({ error: "Shipping zone name and a non-negative delivery fee are required." }, { status: 400 });
    if (table === "promotions" && !String(clean.name || "").trim()) return NextResponse.json({ error: "Promotion name is required." }, { status: 400 });
    if (table === "coupons" && (!String(clean.code || "").trim() || !["percentage","fixed"].includes(String(clean.discount_type)) || !Number.isFinite(Number(clean.discount_value)) || Number(clean.discount_value) <= 0)) return NextResponse.json({ error: "Coupon code, discount type, and positive discount value are required." }, { status: 400 });
    const { data, error } = await supabase.from(table).insert(clean).select("*").single();
    if (error) throw error;
    if (table === "payment_transactions" && data.transaction_type === "refund" && data.order_id) {
      const { error: refundError } = await supabase.from("refund_requests").insert({ order_id: data.order_id, payment_id: data.payment_id, amount: data.amount, reason: data.notes || "Refund transaction", status: data.status === "completed" ? "completed" : "processing", provider_reference: data.provider_reference, admin_note: data.notes || "", requested_by: user.id, processed_by: user.id, processed_at: new Date().toISOString() });
      if (refundError) console.error("[admin/finance] transaction saved but refund mirror failed", refundError);
    }
    return NextResponse.json({ record: data }, { status: 201 });
  } catch (error) {
    console.error("[admin/finance POST]", error);
    return NextResponse.json({ error: "Could not create the record. Check required fields, migration, and database constraints." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { supabase, user } = await requireAdmin();
    const body = await request.json();
    const table = body?.table;
    const id = body?.id;
    const values = body?.values;
    if (!validTable(table) || typeof id !== "string" || !values || typeof values !== "object" || Array.isArray(values)) return NextResponse.json({ error: "Table, record id, and update values are required." }, { status: 400 });
    const allowed: Record<TableName, string[]> = {
      refund_requests: ["status","provider_reference","admin_note","processed_by","processed_at"],
      payment_transactions: ["status","provider_reference","notes"],
      shipping_zones: ["name","cities","delivery_fee","free_shipping_threshold","estimated_days","is_active"],
      promotions: ["name","description","promotion_type","config","starts_at","ends_at","is_active"],
      coupons: ["code","description","discount_type","discount_value","minimum_order","usage_limit","starts_at","expires_at","is_active"],
    };
    const clean: Record<string, unknown> = {};
    for (const key of allowed[table]) if (key in values) clean[key] = values[key];
    if (table === "refund_requests" && "status" in clean) {
      if (!["requested","approved","rejected","processing","completed","failed"].includes(String(clean.status))) return NextResponse.json({ error: "Invalid refund status." }, { status: 400 });
      clean.processed_by = user.id;
      clean.processed_at = new Date().toISOString();
    }
    const { data, error } = await supabase.from(table).update(clean).eq("id", id).select("*").maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: "Record not found." }, { status: 404 });
    if (table === "refund_requests" && data.status === "completed") {
      const { error: txError } = await supabase.from("payment_transactions").insert({ order_id: data.order_id, payment_id: data.payment_id, transaction_type: "refund", provider: "manual", provider_reference: data.provider_reference, amount: data.amount, status: "completed", notes: data.admin_note || data.reason, created_by: user.id });
      if (txError) console.error("[admin/finance] refund updated but transaction history insert failed", txError);
    }
    return NextResponse.json({ record: data });
  } catch (error) {
    console.error("[admin/finance PATCH]", error);
    return NextResponse.json({ error: "Could not update the record. Check migration, record id, and database constraints." }, { status: 500 });
  }
}
