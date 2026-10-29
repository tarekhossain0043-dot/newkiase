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

    const [
      { data: orders, error: ordersError },
      { count: customers, error: customersError },
      { data: items, error: itemsError },
      { data: payments, error: paymentsError },
      { data: products, error: productsError },
    ] = await Promise.all([
      supabase.from("orders").select("id,total,status,created_at,customer_id,order_number,payment_status").order("created_at", { ascending: false }).limit(10000),
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "customer"),
      supabase.from("order_items").select("product_id,product_name,line_total,unit_price,quantity,order_id,orders!inner(status)").limit(10000),
      supabase.from("payments").select("method,status,order_id,orders!inner(status,total)").limit(10000),
      supabase.from("products").select("id,cost_price").limit(10000),
    ]);
    if (ordersError) throw ordersError;
    if (customersError) throw customersError;
    if (itemsError) throw itemsError;
    if (paymentsError) throw paymentsError;
    if (productsError) throw productsError;

    const all = orders || [];
    const revenueEligible = (o: any) => !["cancelled", "returned"].includes(String(o.status).toLowerCase());
    const sumRevenue = (rows: any[]) => rows.filter(revenueEligible).reduce((sum: number, o: any) => sum + Number(o.total || 0), 0);
    const totalSales = sumRevenue(all);
    const netRevenue = all.filter((o: any) => revenueEligible(o) && o.payment_status === "verified").reduce((sum: number, o: any) => sum + Number(o.total || 0), 0);
    const startMs = start.getTime();
    const currentPeriod = all.filter((o: any) => new Date(o.created_at).getTime() >= startMs);
    const previousStart = new Date(start);
    previousStart.setDate(previousStart.getDate() - days);
    const previousPeriod = all.filter((o: any) => {
      const time = new Date(o.created_at).getTime();
      return time >= previousStart.getTime() && time < startMs;
    });
    const percentChange = (current: number, previous: number) => previous === 0 ? (current > 0 ? 100 : 0) : Math.round(((current - previous) / previous) * 1000) / 10;
    const chart = Array.from({ length: days }, (_, index) => {
      const day = new Date(start);
      day.setDate(start.getDate() + index);
      const key = day.toISOString().slice(0, 10);
      const matching = currentPeriod.filter((o: any) => new Date(o.created_at).toISOString().slice(0, 10) === key);
      const orderIds = new Set(matching.map((o: any) => o.id));
      const costMap = new Map((products || []).map((p: any) => [p.id, Number(p.cost_price || 0)]));
      const soldItems = (items || []).filter((item: any) => orderIds.has(item.order_id));
      const cost = soldItems.reduce((sum: number, item: any) => sum + Number(item.quantity || 0) * Number(costMap.get(item.product_id) || 0), 0);
      const sales = sumRevenue(matching);
      return { label: days === 7 ? day.toLocaleDateString("en-US", { weekday: "short" }) : days === 30 ? String(day.getDate()) : day.toLocaleDateString("en-US", { month: "short", day: "numeric" }), date: key, sales: Math.round(sales * 100) / 100, orders: matching.length, cost: Math.round(cost * 100) / 100, profit: Math.round((sales-cost)*100)/100, loss: Math.round(Math.max(0,cost-sales)*100)/100 };
    });

    const topProductMap = (items || []).filter((item: any) => !["cancelled", "returned"].includes(String(item.orders?.status || "").toLowerCase())).reduce((acc: Record<string, any>, item: any) => {
      const name = String(item.product_name || "Product");
      if (!acc[name]) acc[name] = { name, revenue: 0, units: 0 };
      acc[name].revenue += Number(item.line_total || 0);
      acc[name].units += Number(item.quantity || 0);
      return acc;
    }, {} as Record<string, any>);
    const totalPaymentRevenue = sumRevenue(all);
    const paymentTotals = (payments || []).filter((p: any) => !["cancelled", "returned"].includes(String(p.orders?.status || "").toLowerCase())).reduce((acc: Record<string, number>, p: any) => {
      const method = String(p.method || "other");
      acc[method] = (acc[method] || 0) + Number(p.orders?.total || 0);
      return acc;
    }, {} as Record<string, number>);
    const paymentBreakdown = Object.entries(paymentTotals).map(([method, total]) => ({ method, total, percent: totalPaymentRevenue > 0 ? Math.round(Number(total) / totalPaymentRevenue * 100) : 0 }));
    const notifications = all.slice(0, 8).map((o: any) => ({
      id: o.id,
      title: "New order received",
      description: `${o.order_number || "Order"} · ${moneySafe(Number(o.total || 0))} · ${String(o.status || "pending").replaceAll("_", " ")}`,
      created_at: o.created_at,
      read: false,
    }));

    return NextResponse.json({
      metrics: {
        totalSales,
        totalOrders: all.length,
        totalCustomers: customers || 0,
        netRevenue,
        salesChange: percentChange(sumRevenue(currentPeriod), sumRevenue(previousPeriod)),
        ordersChange: percentChange(currentPeriod.length, previousPeriod.length),
      },
      chart,
      notifications,
      topProducts: Object.values(topProductMap).sort((a: any, b: any) => b.revenue - a.revenue).slice(0, 4),
      paymentBreakdown,
      period,
      generatedAt: now.toISOString(),
    }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch {
    return NextResponse.json({ error: "Could not load live dashboard analytics. Check admin access and database configuration." }, { status: 500 });
  }
}
function moneySafe(n: number) { return "৳" + n.toLocaleString("en-BD"); }
