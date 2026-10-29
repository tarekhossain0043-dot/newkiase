import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/admin";

const validStatuses = ["pending","confirmed","processing","shipped","delivered","cancelled","returned"];
const validPaymentStatuses = ["unpaid","pending_verification","verified","rejected","refunded"];

export async function GET() {
  try {
    const { supabase } = await requireAdmin();
    const { data, error } = await supabase
      .from("orders")
      .select("*, order_items(*), payments(*)")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw error;
    return NextResponse.json({ orders: data ?? [] });
  } catch {
    return NextResponse.json({ error: "Unable to load orders. Check admin access and Supabase setup." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { supabase, user } = await requireAdmin();
    const body = await request.json();
    if (typeof body.id !== "string") return NextResponse.json({ error: "Order id is required." }, { status: 400 });

    if (typeof body.status === "string") {
      if (!validStatuses.includes(body.status)) return NextResponse.json({ error: "Invalid order status." }, { status: 400 });
      const { data, error } = await supabase.from("orders").update({ status: body.status, updated_at: new Date().toISOString() }).eq("id", body.id).select("*").maybeSingle();
      if (error || !data) return NextResponse.json({ error: "Could not update order." }, { status: 400 });
      return NextResponse.json({ order: data });
    }

    if (typeof body.payment_status === "string") {
      if (!validPaymentStatuses.includes(body.payment_status)) return NextResponse.json({ error: "Invalid payment status." }, { status: 400 });
      const { data: payment, error: paymentError } = await supabase.from("payments").update({
        status: body.payment_status,
        verified_by: body.payment_status === "verified" || body.payment_status === "rejected" ? user.id : null,
        verified_at: body.payment_status === "verified" || body.payment_status === "rejected" ? new Date().toISOString() : null,
        admin_note: typeof body.admin_note === "string" ? body.admin_note.slice(0, 1000) : "",
        updated_at: new Date().toISOString(),
      }).eq("order_id", body.id).select("*").maybeSingle();
      if (paymentError || !payment) return NextResponse.json({ error: "Could not update payment record." }, { status: 400 });
      const { error: orderError } = await supabase.from("orders").update({ payment_status: body.payment_status, updated_at: new Date().toISOString() }).eq("id", body.id);
      if (orderError) return NextResponse.json({ error: "Payment changed but order status sync failed; review the order." }, { status: 500 });
      return NextResponse.json({ payment });
    }

    return NextResponse.json({ error: "No supported update supplied." }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Unable to update order." }, { status: 500 });
  }
}
