import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const city = (url.searchParams.get("city") || "").trim().toLocaleLowerCase();
    const subtotal = Number(url.searchParams.get("subtotal") || 0);
    if (!city || !Number.isFinite(subtotal) || subtotal < 0) {
      return NextResponse.json({ error: "A valid city and subtotal are required." }, { status: 400 });
    }

    const db = createSupabaseServiceClient();
    const { data: zones, error } = await db
      .from("shipping_zones")
      .select("name,cities,delivery_fee,free_shipping_threshold")
      .eq("is_active", true);
    if (error) throw error;

    const zone = (zones || []).find((item: any) =>
      Array.isArray(item.cities) &&
      item.cities.some((area: string) => String(area).trim().toLocaleLowerCase() === city)
    );

    if (!zone) {
      return NextResponse.json({ delivery_fee: 0, label: "Free delivery" });
    }

    const threshold = zone.free_shipping_threshold == null ? null : Number(zone.free_shipping_threshold);
    const fee = threshold !== null && subtotal >= threshold ? 0 : Number(zone.delivery_fee) || 0;
    return NextResponse.json({
      delivery_fee: Math.max(0, fee),
      label: zone.name || "Area delivery",
      free_shipping: fee === 0,
    });
  } catch (error) {
    console.error("[shipping quote]", error);
    return NextResponse.json({ error: "Could not calculate delivery fee." }, { status: 503 });
  }
}
