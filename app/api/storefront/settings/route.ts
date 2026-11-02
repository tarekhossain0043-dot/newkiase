import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

const storefrontDefaults = {
  store_name: "NEXORA",
  tagline: "Everyday, Elevated",
  announcement_enabled: true,
  announcement_text: "✦ YOUR EVERYDAY ESSENTIALS, ALL IN ONE PLACE",
  announcement_secondary: "Free delivery on orders over ৳3,000 ↗",
  hero_eyebrow: "✳ MEET YOUR NEW FAVOURITE STORE",
  hero_title: "Good finds.",
  hero_emphasis: "Great",
  hero_suffix: "everyday.",
  hero_description: "Discover shoes, beauty, accessories and everyday care essentials from brands you love — all in one convenient store.",
  hero_cta_label: "Explore categories",
  hero_cta_href: "#categories",
  footer_email: "",
  footer_phone: "",
  facebook_url: "",
  instagram_url: "",
};

const storefrontKeys = Object.keys(storefrontDefaults);
const paymentKeys = ["cod_enabled","bkash_enabled","nagad_enabled","bkash_number","nagad_number","bkash_instructions","nagad_instructions"];\nconst appearanceDefaults = { theme: "light", primary_color: "#766394", accent_color: "#d8ed8b", page_background: "#f7f6f1", text_color: "#24241f", muted_color: "#77766f", card_background: "#ffffff", font_family: "DM Sans", border_radius: "4px" };\nconst loadingDefaults = { enabled: true, style: "spinner", label: "Loading your experience…", background: "#f7f6f1", color: "#766394", duration_ms: 450 };

const paymentDefaults = {
  cod_enabled: true,
  bkash_enabled: true,
  nagad_enabled: true,
  bkash_number: "+8801747295464",
  nagad_number: "+8801747295464",
  bkash_instructions: "Send Money",
  nagad_instructions: "Send Money",
};

export async function GET() {
  try {
    const db = createSupabaseServiceClient();
    const [{ data: storefront }, { data: payment }, { data: banners }, { data: brands }, { data: appearance }, { data: loading }] = await Promise.all([
      db.from("site_settings").select("value").eq("key", "storefront").maybeSingle(),
      db.from("site_settings").select("value").eq("key", "payment").maybeSingle(),
      db.from("banners").select("id,title,subtitle,image_path,cta_label,cta_href,sort_order").eq("is_active", true).or("starts_at.is.null,starts_at.lte." + new Date().toISOString()).or("ends_at.is.null,ends_at.gt." + new Date().toISOString()).order("sort_order").limit(10),\n      db.from("site_settings").select("value").eq("key", "brands").maybeSingle(),\n      db.from("site_settings").select("value").eq("key", "appearance").maybeSingle(),\n      db.from("site_settings").select("value").eq("key", "loading").maybeSingle(),
    ]);
    return NextResponse.json({
      storefront: { ...storefrontDefaults, ...(storefront?.value && typeof storefront.value === "object" ? storefront.value : {}) },
      payment: { ...paymentDefaults, ...(payment?.value && typeof payment.value === "object" ? payment.value : {}) },
      banners: banners ?? [],\n      brands: Array.isArray(brands?.value) ? brands.value.filter((x: any) => x && x.is_active !== false) : [],\n      appearance: { ...appearanceDefaults, ...(appearance?.value && typeof appearance.value === "object" ? appearance.value : {}) },\n      loading: { ...loadingDefaults, ...(loading?.value && typeof loading.value === "object" ? loading.value : {}) },
    }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    console.error("[storefront settings]", error);
    return NextResponse.json({ error: "Could not load store settings." }, { status: 503 });
  }
}
