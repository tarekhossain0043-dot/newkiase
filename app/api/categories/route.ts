import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.from("categories")
      .select("id,name,slug,description,image_url,sort_order")
      .eq("is_active", true).order("sort_order", { ascending: true }).order("name");
    if (error) throw error;
    return NextResponse.json({ categories: data ?? [] }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Public categories API:", error);
    return NextResponse.json({ error: "Could not load categories." }, { status: 500 });
  }
}
