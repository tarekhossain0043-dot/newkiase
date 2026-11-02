import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { supabase } = await requireAdmin();
    const productId = new URL(request.url).searchParams.get("product_id");
    let query = supabase.from("product_variants").select("*,products(name,sku)").order("created_at", { ascending: false }).limit(500);
    if (productId) query = query.eq("product_id", productId);
    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json({ variants: data ?? [] });
  } catch {
    return NextResponse.json({ error: "Could not load product variants." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { supabase } = await requireAdmin();
    const body = await request.json();
    const product_id = String(body.product_id || "");
    const option_name = String(body.option_name || "Size").trim().slice(0, 40);
    const option_value = String(body.option_value || "").trim().slice(0, 80);
    const sku = String(body.sku || "").trim().slice(0, 80);
    const price_delta = Number(body.price_delta || 0);
    const stock_quantity = Number(body.stock_quantity || 0);
    if (!product_id || !option_value || !sku || !Number.isFinite(price_delta) || !Number.isInteger(stock_quantity) || stock_quantity < 0) {
      return NextResponse.json({ error: "Product, option value, SKU, valid price adjustment and stock are required." }, { status: 400 });
    }
    const { data, error } = await supabase.from("product_variants").insert({ product_id, option_name, option_value, sku, price_delta, stock_quantity, is_active: body.is_active !== false }).select("*").single();
    if (error) return NextResponse.json({ error: error.code === "23505" ? "Variant SKU or option already exists." : "Could not create variant." }, { status: error.code === "23505" ? 409 : 400 });
    return NextResponse.json({ variant: data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Could not create product variant." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { supabase } = await requireAdmin();
    const body = await request.json();
    if (typeof body.id !== "string" || !body.id) return NextResponse.json({ error: "Variant id is required." }, { status: 400 });
    const patch: Record<string, unknown> = {};
    for (const key of ["option_name", "option_value", "sku"]) if (typeof body[key] === "string") patch[key] = body[key].trim().slice(0, 80);
    if (body.price_delta !== undefined && Number.isFinite(Number(body.price_delta))) patch.price_delta = Number(body.price_delta);
    if (body.stock_quantity !== undefined && Number.isInteger(Number(body.stock_quantity)) && Number(body.stock_quantity) >= 0) patch.stock_quantity = Number(body.stock_quantity);
    if (typeof body.is_active === "boolean") patch.is_active = body.is_active;
    const { data, error } = await supabase.from("product_variants").update(patch).eq("id", body.id).select("*").maybeSingle();
    if (error) return NextResponse.json({ error: "Could not update variant." }, { status: 400 });
    if (!data) return NextResponse.json({ error: "Variant not found." }, { status: 404 });
    return NextResponse.json({ variant: data });
  } catch {
    return NextResponse.json({ error: "Could not update product variant." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { supabase } = await requireAdmin();
    const id = new URL(request.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Variant id is required." }, { status: 400 });
    const { error } = await supabase.from("product_variants").delete().eq("id", id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Could not delete product variant." }, { status: 400 });
  }
}
