import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { requireAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdmin();
    const db = createSupabaseServiceClient();
    const { data, error } = await db.from("admin_notifications").select("id,type,title,description,reference_id,is_read,created_at").order("created_at", { ascending: false }).limit(100);
    if (error) throw error;
    return NextResponse.json({ notifications: data || [] });
  } catch (error) {
    console.error("[admin/notifications] GET failed:", error);
    return NextResponse.json({ error: "Could not load notifications." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    await requireAdmin();
    const body = await request.json();
    const db = createSupabaseServiceClient();
    if (body.mark_all_read === true) {
      const { error } = await db.from("admin_notifications").update({ is_read: true }).eq("is_read", false);
      if (error) throw error;
    } else if (typeof body.id === "string") {
      const { error } = await db.from("admin_notifications").update({ is_read: true }).eq("id", body.id);
      if (error) throw error;
    } else {
      return NextResponse.json({ error: "A notification ID is required." }, { status: 400 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[admin/notifications] PATCH failed:", error);
    return NextResponse.json({ error: "Could not update notification." }, { status: 500 });
  }
}
