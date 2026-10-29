import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/admin";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const { supabase } = await requireAdmin();
    const [{ data: profiles, error: profileError }, { data: orders, error: orderError }] = await Promise.all([
      supabase.from("profiles").select("id,full_name,phone,role,created_at").eq("role", "customer").order("created_at", { ascending: false }).limit(2000),
      supabase.from("orders").select("customer_id,customer_name,customer_email,total,status,created_at").order("created_at", { ascending: false }).limit(10000),
    ]);
    if (profileError) throw profileError;
    if (orderError) throw orderError;
    const byUser = new Map<string, any>();
    const byEmail = new Map<string, any>();
    for (const order of orders || []) {
      const key = order.customer_id || (order.customer_email ? "email:"+order.customer_email.toLowerCase() : "");
      if (!key) continue;
      const row = byUser.get(key) || { orderCount: 0, totalSpent: 0, lastOrderAt: null, latestName: order.customer_name || "", email: order.customer_email || "" };
      row.orderCount += 1;
      if (!["cancelled", "returned"].includes(String(order.status).toLowerCase())) row.totalSpent += Number(order.total || 0);
      if (!row.lastOrderAt || new Date(order.created_at) > new Date(row.lastOrderAt)) row.lastOrderAt = order.created_at;
      if (!row.latestName) row.latestName = order.customer_name || "";
      if (!row.email) row.email = order.customer_email || "";
      byUser.set(key, row);
      if(order.customer_email) byEmail.set(order.customer_email.toLowerCase(),row);
    }
    const customers = (profiles || []).map((profile: any) => {
      const stats = byUser.get(profile.id) || { orderCount: 0, totalSpent: 0, lastOrderAt: null, latestName: "", email: "" };
      return { ...profile, email: stats.email || "", orderCount: stats.orderCount, totalSpent: stats.totalSpent, lastOrderAt: stats.lastOrderAt };
    });
    return NextResponse.json({ customers }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch {
    return NextResponse.json({ error: "Could not load customers. Check admin access and database configuration." }, { status: 500 });
  }
}