import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { supabase } = await requireAdmin();
    const url = new URL(request.url);
    const period = url.searchParams.get("period") === "month" ? "month" : "week";
    const now = new Date();
    const currentStart = new Date(now);
    currentStart.setHours(0, 0, 0, 0);
    if (period === "week") currentStart.setDate(currentStart.getDate() - 6);
    else currentStart.setDate(1);
    const previousStart = new Date(currentStart);
    if (period === "week") previousStart.setDate(previousStart.getDate() - 7);
    else previousStart.setMonth(previousStart.getMonth() - 1);
    const previousEnd = new Date(currentStart.getTime() - 1);
    const currentEnd = new Date(now);
    currentEnd.setHours(23, 59, 59, 999);

    const [
      { data: orders, error: ordersError },
      { count: customers, error: customersError },
      { data: items, error: itemsError },
      { data: payments, error: paymentsError },
      { data: products, error: productsError },
    ] = await Promise.all([
      supabase.from("orders").select("id,total,status,created_at,customer_id,customer_name,customer_email,customer_phone,order_number,payment_status").order("created_at", { ascending: false }).limit(10000),
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "customer"),
      supabase.from("order_items").select("product_id,product_name,line_total,unit_price,quantity,order_id,orders!inner(status)").limit(10000),
      supabase.from("payments").select("method,status,order_id,orders!inner(status,total)").limit(10000),
      supabase.from("products").select("id,cost_price").limit(10000),
    ]);
    // Orders are the core dashboard source. Other analytics are optional so a
    // missing cost_price column or payments table does not blank the entire dashboard.
    if (ordersError) {
      console.error("[admin/overview] orders query failed:", ordersError);
      return NextResponse.json({
        error: "Dashboard could not read orders from Supabase.",
        diagnostic: { source: "orders", code: ordersError.code ?? null, message: ordersError.message ?? "Unknown database error" },
      }, { status: 500 });
    }
    if (customersError) console.error("[admin/overview] customer count unavailable:", customersError);
    if (itemsError) console.error("[admin/overview] order item analytics unavailable:", itemsError);
    if (paymentsError) console.error("[admin/overview] payment breakdown unavailable:", paymentsError);
    if (productsError) console.error("[admin/overview] product cost analytics unavailable:", productsError);

    const all = orders || [];
        const { data: customerProfiles, error: profileListError } = await supabase.from("profiles").select("id,email,phone").eq("role","customer");
    if (profileListError) console.error("[admin/overview] profile list unavailable:", profileListError);
    const customerKeys = new Set<string>();
    for (const profile of customerProfiles || []) {
      const key = profile.id || (profile.email ? "email:"+String(profile.email).toLowerCase() : profile.phone ? "phone:"+String(profile.phone).replace(/\\D/g,"") : "");
      if (key) customerKeys.add(key);
    }
    for (const order of all) {
      const key = order.customer_id || (order.customer_email ? "email:"+String(order.customer_email).toLowerCase() : order.customer_phone ? "phone:"+String(order.customer_phone).replace(/\\D/g,"") : "order:"+order.id);
      if (key) customerKeys.add(key);
    }
    const safeCustomers = customerKeys.size;
    const safeItems = itemsError ? [] : (items || []);
    const safePayments = paymentsError ? [] : (payments || []);
    const safeProducts = productsError ? [] : (products || []);
    const revenueEligible = (o: any) => !["cancelled", "returned"].includes(String(o.status).toLowerCase());
    const sumRevenue = (rows: any[]) => rows.filter(revenueEligible).reduce((sum: number, o: any) => sum + Number(o.total || 0), 0);
    const totalSales = sumRevenue(all);
    const netRevenue = all.filter((o: any) => revenueEligible(o) && o.payment_status === "verified").reduce((sum: number, o: any) => sum + Number(o.total || 0), 0);
    const inRange = (order: any, from: Date, to: Date) => {
      const time = new Date(order.created_at).getTime();
      return time >= from.getTime() && time <= to.getTime();
    };
    const currentPeriod = all.filter((o: any) => inRange(o, currentStart, currentEnd));
    const previousPeriod = all.filter((o: any) => inRange(o, previousStart, previousEnd));
    const percentChange = (current: number, previous: number) => previous === 0 ? (current > 0 ? 100 : 0) : Math.round(((current - previous) / previous) * 1000) / 10;
    const costMap = new Map(safeProducts.map((p: any) => [p.id, Number(p.cost_price || 0)]));
    const summarize = (rows: any[]) => {
      const eligible = rows.filter(revenueEligible);
      const ids = new Set(eligible.map((o: any) => o.id));
      const sales = eligible.reduce((sum: number, o: any) => sum + Number(o.total || 0), 0);
      const soldItems = safeItems.filter((item: any) => ids.has(item.order_id));
      const cost = soldItems.reduce((sum: number, item: any) => sum + Number(item.quantity || 0) * Number(costMap.get(item.product_id) || 0), 0);
      return { sales, cost, profit: sales - cost };
    };
    const currentTotals = summarize(currentPeriod);
    const previousTotals = summarize(previousPeriod);
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const previousMonthEnd = new Date(currentMonthStart.getTime() - 1);
    const currentMonthTotals = summarize(all.filter((o: any) => inRange(o, currentMonthStart, currentEnd)));
    const previousMonthTotals = summarize(all.filter((o: any) => inRange(o, previousMonthStart, previousMonthEnd)));
    const slotCount = period === "week" ? 7 : new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const chart = Array.from({ length: slotCount }, (_, index) => {
      const currentDay = new Date(currentStart);
      currentDay.setDate(currentStart.getDate() + index);
      const previousDay = new Date(previousStart);
      previousDay.setDate(previousStart.getDate() + index);
      const currentRows = currentPeriod.filter((o: any) => {
        const d = new Date(o.created_at);
        return d.getFullYear() === currentDay.getFullYear() && d.getMonth() === currentDay.getMonth() && d.getDate() === currentDay.getDate();
      });
      const previousRows = previousPeriod.filter((o: any) => {
        const d = new Date(o.created_at);
        return d.getFullYear() === previousDay.getFullYear() && d.getMonth() === previousDay.getMonth() && d.getDate() === previousDay.getDate();
      });
      const current = summarize(currentRows);
      const previous = summarize(previousRows);
      return {
        key: period === "week" ? currentDay.toISOString().slice(0, 10) : String(index + 1),
        label: period === "week" ? currentDay.toLocaleDateString("en-US", { weekday: "short" }) : String(index + 1),
        currentProfit: Math.round(current.profit * 100) / 100,
        previousProfit: Math.round(previous.profit * 100) / 100,
        currentCost: Math.round(current.cost * 100) / 100,
        previousCost: Math.round(previous.cost * 100) / 100,
      };
    });

    const topProductMap = safeItems.filter((item: any) => !["cancelled", "returned"].includes(String(item.orders?.status || "").toLowerCase())).reduce((acc: Record<string, any>, item: any) => {
      const name = String(item.product_name || "Product");
      if (!acc[name]) acc[name] = { name, revenue: 0, units: 0 };
      acc[name].revenue += Number(item.line_total || 0);
      acc[name].units += Number(item.quantity || 0);
      return acc;
    }, {} as Record<string, any>);
    const totalPaymentRevenue = sumRevenue(all);
    const paymentTotals = safePayments.filter((p: any) => !["cancelled", "returned"].includes(String(p.orders?.status || "").toLowerCase())).reduce((acc: Record<string, number>, p: any) => {
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
        totalCustomers: safeCustomers,
        netRevenue,
        salesChange: percentChange(sumRevenue(currentPeriod), sumRevenue(previousPeriod)),
        ordersChange: percentChange(currentPeriod.length, previousPeriod.length),
      },
      chart,
      financeChart: chart,
      finance: {
        currentMonthProfit: Math.round(currentMonthTotals.profit * 100) / 100,
        previousMonthProfit: Math.round(previousMonthTotals.profit * 100) / 100,
        currentMonthCost: Math.round(currentMonthTotals.cost * 100) / 100,
        previousMonthCost: Math.round(previousMonthTotals.cost * 100) / 100,
        currentPeriodProfit: Math.round(currentTotals.profit * 100) / 100,
        previousPeriodProfit: Math.round(previousTotals.profit * 100) / 100,
        currentPeriodCost: Math.round(currentTotals.cost * 100) / 100,
        previousPeriodCost: Math.round(previousTotals.cost * 100) / 100,
      },
      notifications,
      topProducts: Object.values(topProductMap).sort((a: any, b: any) => b.revenue - a.revenue).slice(0, 4),
      paymentBreakdown,
      period,
      generatedAt: now.toISOString(),
    }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    console.error("[admin/overview] Failed to load dashboard analytics:", error);
    const message = error instanceof Error ? error.message : "Unknown server error";
    return NextResponse.json({
      error: "Could not load live dashboard analytics.",
      diagnostic: { message },
    }, { status: 500 });
  }
}
function moneySafe(n: number) { return "৳" + n.toLocaleString("en-BD"); }
