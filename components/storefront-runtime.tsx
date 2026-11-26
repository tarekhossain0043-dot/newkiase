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
        root.style.setProperty("--purple", appearance.primary_color || "#5b4bdb");
        root.style.setProperty("--lime", appearance.accent_color || "#d8ed8b");
        root.style.setProperty("--card", appearance.card_background || (dark ? "#242424" : "#ffffff"));
        root.style.setProperty("--store-radius", appearance.border_radius || "4px");
        if (appearance.font_family) root.style.setProperty("--store-font", appearance.font_family);
        document.body.style.backgroundImage = appearance.page_background_image ? `linear-gradient(${appearance.theme === "dark" ? "rgba(0,0,0,.72)" : "rgba(255,255,255,.68)"}, ${appearance.theme === "dark" ? "rgba(0,0,0,.72)" : "rgba(255,255,255,.68)"}), url("${String(appearance.page_background_image).replace(/"/g, "%22")}")` : "none";
        document.body.style.backgroundAttachment = "fixed";
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (window.location.pathname.startsWith("/admin") || window.matchMedia("(pointer: fine)").matches === false || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    document.body.classList.add("has-nexora-cursor");
    const ring = document.createElement("div");
    const dot = document.createElement("div");
    const ripple = document.createElement("div");
    ring.className = "nexora-cursor-ring";
    dot.className = "nexora-cursor-dot";
    ripple.className = "nexora-cursor-ripple";
    ring.setAttribute("aria-hidden", "true");
    dot.setAttribute("aria-hidden", "true");
    ripple.setAttribute("aria-hidden", "true");
    document.body.append(ripple, ring, dot);
    let x = window.innerWidth / 2, y = window.innerHeight / 2;
    let tx = x, ty = y, raf = 0;
    const render = () => {
      x += (tx - x) * 0.18;
      y += (ty - y) * 0.18;
      ring.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
      dot.style.transform = `translate3d(${tx}px, ${ty}px, 0) translate(-50%, -50%)`;
      raf = requestAnimationFrame(render);
    };
    const move = (event: PointerEvent) => { tx = event.clientX; ty = event.clientY; };
    const down = (event: PointerEvent) => {
      ring.classList.add("is-pressed");
      ripple.style.left = `${event.clientX}px`;
      ripple.style.top = `${event.clientY}px`;
      ripple.classList.remove("is-active");
      void ripple.offsetWidth;
      ripple.classList.add("is-active");
    };
    const up = () => ring.classList.remove("is-pressed");
    const over = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      ring.classList.toggle("is-interactive", !!target?.closest("a,button,[role='button'],input,select,textarea,label"));
    };
    const hide = () => ring.classList.add("is-hidden");
    const show = () => ring.classList.remove("is-hidden");
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerover", over, { passive: true });
    window.addEventListener("pointerdown", down);
    window.addEventListener("pointerup", up);
    document.addEventListener("mouseleave", hide);
    document.addEventListener("mouseenter", show);
    raf = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerover", over);
      window.removeEventListener("pointerdown", down);
      window.removeEventListener("pointerup", up);
      document.removeEventListener("mouseleave", hide);
      document.removeEventListener("mouseenter", show);
      ring.remove(); dot.remove(); ripple.remove();
      document.body.classList.remove("has-nexora-cursor");
    };
  }, []);

  return null;
}
