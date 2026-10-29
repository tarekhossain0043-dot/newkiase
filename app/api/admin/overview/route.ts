import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { supabase } = await requireAdmin();
    const url = new URL(request.url);
    const period = url.searchParams.get("period") || "7 days";
    const days = period === "30 days" ? 30 : period === "90 days" ? 90 : 7;
    const now = new Date();
    const start = new Date(now);
    start.setDate(start.getDate() - (days - 1));
    start.setHours(0, 0, 0, 0);

    const [{ data: orders, error: ordersError }, { count: customers, error: customersError }] = await Promise.all([
      supabase.from("orders").select("id,total,status,created_at,customer_id,order_number,payment_status").order("created_at", { ascending: false }).limit(10000),
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "customer"),
    ]);
    if (ordersError) throw ordersError;
    if (customersError) throw customersError;
    const all = orders || [];
    const revenueEligible = (o: any) => !["cancelled", "returned"].includes(String(o.status).toLowerCase());
    const totalSales = all.filter(revenueEligible).reduce((sum: number, o: any) => sum + Number(o.total || 0), 0);
    const netRevenue = all.filter((o: any) => revenueEligible(o) && o.payment_status === "verified").reduce((sum: number, o: any) => sum + Number(o.total || 0), 0);
    const startMs = start.getTime();
    const currentPeriod = all.filter((o: any) => new Date(o.created_at).getTime() >= startMs);
    const previousStart = new Date(start);
    previousStart.setDate(previousStart.getDate() - days);
    const previousPeriod = all.filter((o: any) => {
      const time = new Date(o.created_at).getTime();
      return time >= previousStart.getTime() && time < startMs;
    });
    const sumRevenue = (rows: any[]) => rows.filter(revenueEligible).reduce((sum: number, o: any) => sum + Number(o.total || 0), 0);
    const percentChange = (current: number, previous: number) => previous === 0 ? (current > 0 ? 100 : 0) : Math.round(((current - previous) / previous) * 1000) / 10;
    const chart = Array.from({ length: days }, (_, index) => {
      const day = new Date(start);
      day.setDate(start.getDate() + index);
      const key = day.toISOString().slice(0, 10);
      const matching = currentPeriod.filter((o: any) => new Date(o.created_at).toISOString().slice(0, 10) === key);
      return { label: days === 7 ? day.toLocaleDateString("en-US", { weekday: "short" }) : days === 30 ? String(day.getDate()) : day.toLocaleDateString("en-US", { month: "short", day: "numeric" }), date: key, sales: Math.round(sumRevenue(matching) * 100) / 100, orders: matching.length };
    });
    const notifications = all.slice(0, 8).map((o: any) => ({
      id: o.id,
      title: "New order received",
      description: `${o.order_number || "Order"} · ${moneySafe(Number(o.total || 0))} · ${String(o.status || "pending").replaceAll("_", " ")}`,
      created_at: o.created_at,
      read: false,
    }));
    const recent = all.slice(0, 5);
    const previousRevenue = sumRevenue(previousPeriod);
    const currentRevenue = sumRevenue(currentPeriod);
    return NextResponse.json({
      metrics: {
        totalSales, totalOrders: all.length, totalCustomers: customers || 0, netRevenue,
        salesChange: percentChange(currentRevenue, previousRevenue),
        ordersChange: percentChange(currentPeriod.length, previousPeriod.length),
        customersChange: 0,
        netRevenueChange: 0,
      },
      chart,
      notifications,
      recentOrderIds: recent.map((o: any) => o.id),
      period,
      generatedAt: now.toISOString(),
    }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    return NextResponse.json({ error: "Could not load live dashboard analytics. Check admin access and database configuration." }, { status: 500 });
  }
}
function moneySafe(n: number) { return "৳" + n.toLocaleString("en-BD"); }
