"use client";

import { useEffect, useState } from "react";

type LoadingConfig = {
  enabled?: boolean;
  style?: "spinner" | "dots" | "bar";
  label?: string;
  background?: string;
  color?: string;
};

export default function RouteLoading() {
  const [config, setConfig] = useState<LoadingConfig>({
    enabled: true,
    style: "spinner",
    label: "Loading your experience…",
    background: "#f7f6f1",
    color: "#766394",
  });

  useEffect(() => {
    let active = true;
    fetch("/api/storefront/settings", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => {
        if (active && data.loading) setConfig(data.loading);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  if (config.enabled === false) return <div className="route-loading-fallback" aria-label="Loading" />;

  return (
    <div
      className="store-loading-overlay route-loading"
      role="status"
      aria-live="polite"
      style={{ background: config.background || "#f7f6f1", color: config.color || "#766394" }}
    >
      <div className={"store-loader " + (config.style || "spinner")}>
        {config.style === "dots" ? <><i /><i /><i /></> : <i />}
      </div>
      <span>{config.label || "Loading your experience…"}</span>
    </div>
  );
}
