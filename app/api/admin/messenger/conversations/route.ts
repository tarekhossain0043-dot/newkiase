import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

async function requireAdmin() {
  const authClient = await createSupabaseServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: profile, error } = await authClient.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (error || profile?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return null;
}

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    const db = createSupabaseServiceClient();
    const { data, error } = await db.from("messenger_conversations")
      .select("id,psid,ai_enabled,handoff_at,last_customer_message_at,updated_at")
      .order("updated_at", { ascending: false }).limit(100);
    if (error) throw error;
    return NextResponse.json({ conversations: data || [] }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Messenger conversations fetch failed:", error);
    return NextResponse.json({ error: "Could not load Messenger conversations." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    const body = await request.json();
    const psid = typeof body.psid === "string" ? body.psid.trim() : "";
    if (!psid || psid.length > 128 || typeof body.ai_enabled !== "boolean") {
      return NextResponse.json({ error: "A valid psid and boolean ai_enabled value are required." }, { status: 400 });
    }
    const db = createSupabaseServiceClient();
    const { data, error } = await db.from("messenger_conversations").upsert({
      psid, ai_enabled: body.ai_enabled,
      handoff_at: body.ai_enabled ? null : new Date().toISOString(),
      updated_at: new Date().toISOString()
    }, { onConflict: "psid" }).select("id,psid,ai_enabled,handoff_at,updated_at").single();
    if (error) throw error;
    return NextResponse.json({ conversation: data });
  } catch (error) {
    console.error("Messenger handoff update failed:", error);
    return NextResponse.json({ error: "Could not update AI handoff state." }, { status: 500 });
  }
}
