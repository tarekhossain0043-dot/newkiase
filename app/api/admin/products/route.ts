import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/admin";

function isStoredProductImage(value: string) {
  try {
    const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!base) return false;
    const expected = new URL(base);
    const image = new URL(value);
    return image.origin === expected.origin && image.pathname.startsWith("/storage/v1/object/public/product-images/");
  } catch { return false; }
}

export async function GET() {
  try {
    const { supabase } = await requireAdmin();
    const { data, error } = await supabase
      .from("products")
      .select("*, categories(name), product_images(id, storage_path, alt_text, sort_order), product_variants(id, sku, option_name, option_value, price_delta, stock_quantity, is_active)")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return NextResponse.json({ products: data ?? [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load products.";
    if (message.includes("Supabase is not configured")) {
      return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
    }
    return NextResponse.json({ error: "Unable to load products." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { supabase } = await requireAdmin();
    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const sku = typeof body.sku === "string" ? body.sku.trim() : "";
    const slug = typeof body.slug === "string" ? body.slug.trim().toLowerCase() : "";
    const price = Number(body.price);
    const stock = Number(body.stock_quantity ?? 0);

    if (!name || name.length > 160 || !sku || sku.length > 80 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      return NextResponse.json({ error: "Name, SKU and a valid URL slug are required." }, { status: 400 });
    }
    if (!Number.isFinite(price) || price < 0 || !Number.isInteger(stock) || stock < 0) {
      return NextResponse.json({ error: "Price and stock must be valid non-negative numbers." }, { status: 400 });
    }

    const payload = {
      name, sku, slug, price, stock_quantity: stock,
      brand: typeof body.brand === "string" ? body.brand.trim().slice(0, 120) : "",
      description: typeof body.description === "string" ? body.description.trim().slice(0, 10000) : "",
      color: typeof body.color === "string" ? body.color.trim().slice(0, 80) : "",
      sizes: Array.isArray(body.sizes) ? body.sizes.filter((v: unknown) => typeof v === "string").slice(0, 30) : [],
      category_id: typeof body.category_id === "string" ? body.category_id : null,
      status: body.status === "active" || body.status === "archived" ? body.status : "draft",
      is_featured: body.is_featured === true,
      compare_at_price: body.compare_at_price == null ? null : Number(body.compare_at_price),
    };

    const { data, error } = await supabase.from("products").insert(payload).select("*").single();
    if (error) {
      const duplicate = error.code === "23505";
      return NextResponse.json({ error: duplicate ? "SKU or slug already exists." : "Could not create product." }, { status: duplicate ? 409 : 400 });
    }
    if (typeof body.image_url === "string" && body.image_url.trim()) {
      const { error: imageError } = await supabase.from("product_images").insert({ product_id: data.id, storage_path: body.image_url.trim().slice(0, 2000), alt_text: name, sort_order: 0 });
      if (imageError) { await supabase.from("products").delete().eq("id", data.id); return NextResponse.json({ error: "Product image URL could not be saved." }, { status: 400 }); }
    }
    return NextResponse.json({ product: data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Unable to create product. Check admin access and Supabase setup." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { supabase } = await requireAdmin();
    const body = await request.json();
    if (typeof body.id !== "string" || !body.id) return NextResponse.json({ error: "Product id is required." }, { status: 400 });
    const allowed = ["name","sku","slug","brand","description","price","compare_at_price","stock_quantity","sizes","color","status","is_featured","category_id"] as const;
    const patch: Record<string, unknown> = {};
    for (const key of allowed) if (key in body) patch[key] = body[key];
    patch.updated_at = new Date().toISOString();
    const { data, error } = await supabase.from("products").update(patch).eq("id", body.id).select("*").maybeSingle();
    if (error) return NextResponse.json({ error: "Could not update product." }, { status: 400 });
    if (!data) return NextResponse.json({ error: "Product not found." }, { status: 404 });
    if (typeof body.image_url === "string") {
      const imageUrl = body.image_url.trim().slice(0, 2000);
      const { data: existingImages, error: readImageError } = await supabase.from("product_images").select("id").eq("product_id", data.id).order("sort_order").limit(1);
      if (readImageError) return NextResponse.json({ error: "Product updated but image could not be checked." }, { status: 400 });
      if (imageUrl && existingImages?.[0]) { const { error: imageError } = await supabase.from("product_images").update({ storage_path: imageUrl, alt_text: data.name }).eq("id", existingImages[0].id); if (imageError) return NextResponse.json({ error: "Product updated but image could not be saved." }, { status: 400 }); }
      else if (imageUrl) { const { error: imageError } = await supabase.from("product_images").insert({ product_id: data.id, storage_path: imageUrl, alt_text: data.name, sort_order: 0 }); if (imageError) return NextResponse.json({ error: "Product updated but image could not be saved." }, { status: 400 }); }
      else if (existingImages?.[0]) await supabase.from("product_images").delete().eq("id", existingImages[0].id);
    }
    return NextResponse.json({ product: data });
  } catch {
    return NextResponse.json({ error: "Unable to update product." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { supabase } = await requireAdmin();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Product id is required." }, { status: 400 });
    const { error } = await supabase.from("products").update({ status: "archived", updated_at: new Date().toISOString() }).eq("id", id);
    if (error) return NextResponse.json({ error: "Could not archive product." }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Unable to archive product." }, { status: 500 });
  }
}
