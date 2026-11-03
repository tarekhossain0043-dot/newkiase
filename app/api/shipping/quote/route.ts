import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function normalizeArea(value: unknown) {
  return String(value ?? "").normalize("NFKC").trim().toLocaleLowerCase().replace(/[.,]/g, "").replace(/\s+/g, " ");
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const city = normalizeArea(url.searchParams.get("city"));
    const subtotal = Number(url.searchParams.get("subtotal") || 0);
    const paymentMethod = url.searchParams.get("payment") || "cod";
    if (!city || !Number.isFinite(subtotal) || subtotal < 0) {
      return NextResponse.json({ error: "A valid city and subtotal are required." }, { status: 400 });
    }

    const db = createSupabaseServiceClient();
    const [{ data: zones, error }, { data: shippingSetting, error: settingsError }] = await Promise.all([
      db.from("shipping_zones")
        .select("name,cities,delivery_fee,free_shipping_threshold,is_active")
        .eq("is_active", true),
      db.from("site_settings").select("value").eq("key", "shipping").maybeSingle(),
    ]);
    if (error) throw error;
    if (settingsError) throw settingsError;

    const settings = shippingSetting?.value && typeof shippingSetting.value === "object"
      ? shippingSetting.value as Record<string, unknown>
      : {};
    const freeDelivery = settings.free_delivery === true;
    const defaultFee = Math.max(0, Number(settings.default_delivery_fee ?? 80) || 0);
    const freeCodDelivery = settings.free_cod_delivery === true;
    const zone = (zones || []).find((item: any) => {
      const configuredAreas = Array.isArray(item.cities) ? item.cities : [];
      const areas = [...configuredAreas, item.name].map(normalizeArea).filter(Boolean);
      return areas.includes(city);
    });

    const threshold = zone?.free_shipping_threshold == null ? null : Number(zone.free_shipping_threshold);
    const fee = freeDelivery || (paymentMethod === "cod" && freeCodDelivery)
      ? 0
      : zone
        ? (threshold !== null && subtotal >= threshold ? 0 : Math.max(0, Number(zone.delivery_fee) || 0))
        : defaultFee;
    return NextResponse.json({
      delivery_fee: fee,
      label: freeDelivery ? "Free delivery" : paymentMethod === "cod" && freeCodDelivery ? "Free COD delivery" : zone?.name || "Standard delivery",
      matched_zone: zone?.name || null,
      free_shipping: fee === 0,
    }, { headers: { "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0" } });
  } catch (error) {
    console.error("[shipping quote]", error);
    return NextResponse.json({ error: "Could not calculate delivery fee." }, { status: 503 });
  }
}
