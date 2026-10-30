import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Please sign in to update your customer profile." }, { status: 401 });
    let body: any = {};
    try { body = await request.json(); } catch {}
    const metadata = user.user_metadata || {};
    const fullName = typeof body.full_name === "string" ? body.full_name.trim().slice(0, 120) : String(metadata.full_name || metadata.name || "").trim().slice(0, 120);
    const phone = typeof body.phone === "string" ? body.phone.trim().slice(0, 30) : String(metadata.phone || "").trim().slice(0, 30);
    const { data: existing } = await supabase.from("profiles").select("full_name,phone").eq("id", user.id).maybeSingle();
    const { error } = await supabase.from("profiles").upsert({
      id: user.id,
      full_name: fullName || existing?.full_name || "",
      phone: phone || existing?.phone || null,
      email: user.email || null,
    }, { onConflict: "id" });
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Customer profile sync:", error);
    return NextResponse.json({ error: "Could not sync customer profile." }, { status: 500 });
  }
}
