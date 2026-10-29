import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/admin";

const makeSlug = (value: string) => value.toLowerCase().trim().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export async function GET() {
  try {
    const { supabase } = await requireAdmin();
    const { data, error } = await supabase.from("categories").select("*").order("sort_order").order("name");
    if (error) throw error;
    return NextResponse.json({ categories: data ?? [] });
  } catch {
    return NextResponse.json({ error: "Unable to load categories. Check admin access." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { supabase } = await requireAdmin();
    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const slug = makeSlug(typeof body.slug === "string" && body.slug.trim() ? body.slug : name) || ("category-" + Date.now());
    if (!name || name.length > 100 || !slug) return NextResponse.json({ error: "A valid category name is required." }, { status: 400 });
    const { data, error } = await supabase.from("categories").insert({
      name, slug,
      description: typeof body.description === "string" ? body.description.trim().slice(0, 1000) : null,
      image_url: typeof body.image_url === "string" && body.image_url.trim() ? body.image_url.trim().slice(0, 2000) : null,
      sort_order: Number.isInteger(Number(body.sort_order)) ? Number(body.sort_order) : 0,
      is_active: body.is_active !== false,
    }).select("*").single();
    if (error) return NextResponse.json({ error: error.code === "23505" ? "Category name or slug already exists." : "Could not create category." }, { status: error.code === "23505" ? 409 : 400 });
    return NextResponse.json({ category: data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Unable to create category. Check admin access." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { supabase } = await requireAdmin();
    const body = await request.json();
    if (typeof body.id !== "string" || !body.id) return NextResponse.json({ error: "Category id is required." }, { status: 400 });
    const patch: Record<string, unknown> = {};
    if (typeof body.name === "string") patch.name = body.name.trim().slice(0, 100);
    if (typeof body.slug === "string") patch.slug = makeSlug(body.slug);
    if (typeof body.description === "string") patch.description = body.description.trim().slice(0, 1000);
    if (typeof body.image_url === "string" || body.image_url === null) patch.image_url = body.image_url;
    if (body.sort_order !== undefined && Number.isInteger(Number(body.sort_order))) patch.sort_order = Number(body.sort_order);
    if (typeof body.is_active === "boolean") patch.is_active = body.is_active;
    const { data, error } = await supabase.from("categories").update(patch).eq("id", body.id).select("*").maybeSingle();
    if (error) return NextResponse.json({ error: error.code === "23505" ? "Category name or slug already exists." : "Could not update category." }, { status: error.code === "23505" ? 409 : 400 });
    if (!data) return NextResponse.json({ error: "Category not found." }, { status: 404 });
    return NextResponse.json({ category: data });
  } catch {
    return NextResponse.json({ error: "Unable to update category." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { supabase } = await requireAdmin();
    const id = new URL(request.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Category id is required." }, { status: 400 });
    const { error } = await supabase.from("categories").update({ is_active: false }).eq("id", id);
    if (error) return NextResponse.json({ error: "Could not archive category." }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Unable to archive category." }, { status: 500 });
  }
}
