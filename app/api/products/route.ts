import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { searchParams } = new URL(request.url);
    const q = (searchParams.get("q") || "").trim();
    const category = (searchParams.get("category") || "").trim();
    const brand = (searchParams.get("brand") || "").trim();
    const limit = Math.min(Math.max(Number(searchParams.get("limit") || 100), 1), 200);

    let query = supabase
      .from("products")
      .select("id, sku, name, slug, brand, description, price, compare_at_price, stock_quantity, sizes, color, status, is_featured, categories(id, name, slug), product_images(id, storage_path, alt_text, sort_order), product_variants(id, option_name, option_value, sku, price_delta, stock_quantity, is_active)")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(limit);

    const id = (searchParams.get("id") || "").trim();
    if (id) query = query.eq("id", id);
    if (category) query = query.eq("categories.slug", category);
    if (brand) query = query.ilike("brand", brand);
    if (q) query = query.or(`name.ilike.%${q.replace(/[,%()]/g, " ")}%,brand.ilike.%${q.replace(/[,%()]/g, " ")}%,sku.ilike.%${q.replace(/[,%()]/g, " ")}%`);

    const { data, error } = await query;
    if (error) {
      console.error("Public products query failed:", error.message);
      return NextResponse.json({ error: "Could not load products." }, { status: 500 });
    }

    return NextResponse.json({ products: data ?? [] }, {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch (error) {
    console.error("Public products API error:", error);
    return NextResponse.json({ error: "Could not load products." }, { status: 500 });
  }
}
