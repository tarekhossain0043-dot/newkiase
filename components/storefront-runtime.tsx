"use client";

import { useEffect } from "react";

export default function StorefrontRuntime() {
  useEffect(() => {
    let active = true;
    fetch("/api/storefront/settings", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => {
        if (!active) return;
        const appearance = data.appearance || {};
        const dark = appearance.theme === "dark";
        const root = document.documentElement;
        root.dataset.theme = dark ? "dark" : "light";
        root.style.setProperty("--paper", appearance.page_background || (dark ? "#171717" : "#f7f6f1"));
        root.style.setProperty("--ink", appearance.text_color || (dark ? "#f5f5f5" : "#24241f"));
        root.style.setProperty("--muted", appearance.muted_color || (dark ? "#b5b5b5" : "#77766f"));
        root.style.setProperty("--purple", appearance.primary_color || "#766394");
        root.style.setProperty("--lime", appearance.accent_color || "#d8ed8b");
        root.style.setProperty("--card", appearance.card_background || (dark ? "#242424" : "#ffffff"));
        root.style.setProperty("--store-radius", appearance.border_radius || "4px");
        if (appearance.font_family) root.style.setProperty("--store-font", appearance.font_family);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  return null;
}
