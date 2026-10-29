import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const { supabase, user } = await requireAdmin();
    const { data, error } = await supabase.from("profiles").select("id,full_name,phone,bio,hobbies,avatar_url,cover_url").eq("id", user.id).single();
    if (error) throw error;
    return NextResponse.json({ profile: { ...data, email: user.email || "" } }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[admin/profile GET] Failed to load admin profile:", error);
    return NextResponse.json({ error: "Could not load admin profile. Apply the latest Supabase profile migration and check Vercel function logs." }, { status: 500 });
  }
}
export async function PATCH(request: Request) {
  try {
    const { supabase, user } = await requireAdmin();
    const body = await request.json();
    const updates: Record<string, string> = {};
    for (const key of ["full_name", "phone", "bio", "hobbies", "avatar_url", "cover_url"]) {
      if (typeof body[key] === "string") updates[key] = body[key].trim().slice(0, key === "bio" || key === "hobbies" ? 1000 : 500);
    }
    const { data, error } = await supabase.from("profiles").update(updates).eq("id", user.id).select("id,full_name,phone,bio,hobbies,avatar_url,cover_url").single();
    if (error) throw error;
    return NextResponse.json({ profile: { ...data, email: user.email || "" } });
  } catch (error) {
    console.error("[admin/profile PATCH] Failed to save admin profile:", error);
    return NextResponse.json({ error: "Could not save admin profile. Apply the latest Supabase profile migration and check Vercel function logs." }, { status: 500 });
  }
}
