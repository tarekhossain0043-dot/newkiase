import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
const resources = ["banners", "expenses", "roles", "settings"] as const;
type Resource = typeof resources[number];

export async function GET(request: Request) {
  try {
    const { supabase } = await requireAdmin();
    const resource = new URL(request.url).searchParams.get("resource") as Resource | null;
    if (!resource || !resources.includes(resource)) return NextResponse.json({ error: "Unsupported workspace resource." }, { status: 400 });
    if (resource === "settings") {
      const { data, error } = await supabase.from("site_settings").select("key,value,updated_at").order("key");
      if (error) throw error;
      return NextResponse.json({ records: data ?? [] });
    }
    if (resource === "roles") {
      const { data, error } = await supabase.from("profiles").select("id,full_name,phone,role,created_at").order("created_at", { ascending: false }).limit(500);
      if (error) throw error;
      return NextResponse.json({ records: data ?? [] });
    }
    const table = resource === "banners" ? "banners" : "operating_expenses";
    const { data, error } = await supabase.from(table).select("*").order(resource === "banners" ? "sort_order" : "expense_date", { ascending: false }).limit(500);
    if (error) throw error;
    return NextResponse.json({ records: data ?? [] });
  } catch (error) {
    console.error("[admin/workspace GET]", error);
    return NextResponse.json({ error: "Could not load workspace records. Check the required Supabase migration and admin access." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { supabase, user } = await requireAdmin();
    const body = await request.json();
    const resource = body?.resource as Resource;
    const values = body?.values;
    if (!resources.includes(resource) || !values || typeof values !== "object" || Array.isArray(values) || resource === "roles" || resource === "settings") return NextResponse.json({ error: "Invalid create request." }, { status: 400 });
    const allowed = resource === "banners"
      ? ["title","subtitle","image_path","cta_label","cta_href","sort_order","is_active","starts_at","ends_at"]
      : ["title","category","amount","expense_date","notes"];
    const clean: Record<string, unknown> = {};
    for (const key of allowed) if (key in values) clean[key] = values[key];
    if (resource === "expenses") clean.created_by = user.id;
    if (resource === "banners" && !String(clean.title || "").trim()) return NextResponse.json({ error: "Banner title is required." }, { status: 400 });
    if (resource === "expenses" && (!String(clean.title || "").trim() || !Number.isFinite(Number(clean.amount)) || Number(clean.amount) <= 0)) return NextResponse.json({ error: "Expense title and positive amount are required." }, { status: 400 });
    const { data, error } = await supabase.from(resource === "expenses" ? "operating_expenses" : "banners").insert(clean).select("*").single();
    if (error) throw error;
    return NextResponse.json({ record: data }, { status: 201 });
  } catch (error) {
    console.error("[admin/workspace POST]", error);
    return NextResponse.json({ error: "Could not create record." }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { supabase } = await requireAdmin();
    const body = await request.json();
    const resource = body?.resource as Resource;
    const id = body?.id;
    const values = body?.values;
    if (!resources.includes(resource) || !values || typeof values !== "object" || Array.isArray(values)) return NextResponse.json({ error: "Invalid update request." }, { status: 400 });
    if (resource === "roles") {
      if (!id || !["admin","customer"].includes(String(values.role))) return NextResponse.json({ error: "A valid profile ID and role are required." }, { status: 400 });
      const { data: current } = await supabase.auth.getUser();
      if (current.user?.id === id && values.role !== "admin") return NextResponse.json({ error: "You cannot remove your own admin role." }, { status: 400 });
      const { data, error } = await supabase.from("profiles").update({ role: values.role }).eq("id", id).select("id,full_name,phone,role,created_at").single();
      if (error) throw error;
      return NextResponse.json({ record: data });
    }
    if (resource === "settings") {
      const key = String(body.key || "");
      if (!["storefront","shipping","payment"].includes(key)) return NextResponse.json({ error: "Unsupported settings key." }, { status: 400 });
      const { data: auth } = await supabase.auth.getUser();
      const { data, error } = await supabase.from("site_settings").upsert({ key, value: values, updated_by: auth.user?.id, updated_at: new Date().toISOString() }, { onConflict: "key" }).select("*").single();
      if (error) throw error;
      return NextResponse.json({ record: data });
    }
    if (!id) return NextResponse.json({ error: "Record ID is required." }, { status: 400 });
    const allowed = resource === "banners"
      ? ["title","subtitle","image_path","cta_label","cta_href","sort_order","is_active","starts_at","ends_at"]
      : ["title","category","amount","expense_date","notes"];
    const clean: Record<string, unknown> = {};
    for (const key of allowed) if (key in values) clean[key] = values[key];
    const { data, error } = await supabase.from(resource === "expenses" ? "operating_expenses" : "banners").update(clean).eq("id", id).select("*").single();
    if (error) throw error;
    return NextResponse.json({ record: data });
  } catch (error) {
    console.error("[admin/workspace PATCH]", error);
    return NextResponse.json({ error: "Could not update record." }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { supabase } = await requireAdmin();
    const url = new URL(request.url);
    const resource = url.searchParams.get("resource");
    const id = url.searchParams.get("id");
    if (!["banners","expenses"].includes(String(resource)) || !id) return NextResponse.json({ error: "Invalid delete request." }, { status: 400 });
    const { error } = await supabase.from(resource as "banners" | "operating_expenses").delete().eq("id", id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[admin/workspace DELETE]", error);
    return NextResponse.json({ error: "Could not delete record." }, { status: 400 });
  }
}
