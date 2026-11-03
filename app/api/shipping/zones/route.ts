import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function normalizeArea(value: unknown) {
  return String(value ?? "").normalize("NFKC").trim().replace(/\\s+/g, " ");
}

export async function GET() {
  try {
    const db = createSupabaseServiceClient();
    const { data, error } = await db
      .from("shipping_zones")
      .select("name,cities,is_active")
      .eq("is_active", true)
      .order("name", { ascending: true });
    if (error) throw error;

    const seen = new Set<string>();
    const areas: string[] = [];
    for (const zone of data ?? []) {
      const candidates = [...(Array.isArray(zone.cities) ? zone.cities : []), zone.name];
      for (const candidate of candidates) {
        const area = normalizeArea(candidate);
        const key = area.toLocaleLowerCase();
        if (area && !seen.has(key)) {
          seen.add(key);
          areas.push(area);
        }
      }
    }

    return NextResponse.json(
      { areas },
      { headers: { "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0" } }
    );
  } catch (error) {
    console.error("[shipping zones]", error);
    return NextResponse.json({ error: "Could not load delivery areas." }, { status: 503 });
  }
}
