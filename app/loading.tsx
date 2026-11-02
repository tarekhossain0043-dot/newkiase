import { createSupabaseServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

const DEFAULT_LOADING = {
  enabled: true,
  style: "spinner" as "spinner" | "dots" | "bar",
  label: "Loading your experience…",
  background: "#f7f6f1",
  color: "#766394",
};

export default async function RouteLoading() {
  let config = DEFAULT_LOADING;
  try {
    const db = createSupabaseServiceClient();
    const { data } = await db.from("site_settings").select("value").eq("key", "loading").maybeSingle();
    if (data?.value && typeof data.value === "object") config = { ...DEFAULT_LOADING, ...data.value };
  } catch {
    // Keep a usable default loader if the settings service is temporarily unavailable.
  }

  if (config.enabled === false) return <div className="route-loading-fallback" aria-label="Loading" />;
  return (
    <div className="store-loading-overlay route-loading" role="status" aria-live="polite"
      style={{ background: config.background || "#f7f6f1", color: config.color || "#766394" }}>
      <div className={"store-loader " + (config.style || "spinner")}>
        {config.style === "dots" ? <><i /><i /><i /></> : <i />}
      </div>
      <span>{config.label || "Loading your experience…"}</span>
    </div>
  );
}
