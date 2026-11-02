import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/admin";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const body = await request.json();
    const full_name = String(body.full_name || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const phone = String(body.phone || "").trim();
    if (!full_name || !email) {
      return NextResponse.json({ error: "Customer name and email are required." }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    }

    const service = createSupabaseServiceClient();
    const { data, error } = await service.auth.admin.inviteUserByEmail(email, {
      data: { full_name, phone, role: "customer" },
      redirectTo: process.env.NEXT_PUBLIC_SITE_URL
        ? process.env.NEXT_PUBLIC_SITE_URL + "/account"
        : undefined,
    });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (!data.user) {
      return NextResponse.json({ error: "Customer invitation could not be created." }, { status: 500 });
    }

    const { error: profileError } = await service.from("profiles").upsert({
      id: data.user.id,
      full_name,
      email,
      phone,
      role: "customer",
    }, { onConflict: "id" });
    if (profileError) {
      console.error("[admin/customers] profile upsert failed:", profileError);
      return NextResponse.json({ error: "Invitation sent, but the customer profile could not be saved. Refresh the customer list before retrying." }, { status: 500 });
    }

    return NextResponse.json({ success: true, customer: { id: data.user.id, full_name, email, phone } }, { status: 201 });
  } catch (error) {
    console.error("[admin/customers] create failed:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not add customer." }, { status: 500 });
  }
}
