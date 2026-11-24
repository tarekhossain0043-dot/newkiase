"use client";

import { motion, useMotionValue, useSpring } from "framer-motion";
import { useEffect, useState } from "react";

export function MotionReveal({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 30, filter: "blur(5px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, amount: 0.12, margin: "0px 0px -55px 0px" }}
      transition={{ duration: 0.72, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

export function NexoraCursor() {
  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const springX = useSpring(x, { stiffness: 500, damping: 38, mass: 0.45 });
  const springY = useSpring(y, { stiffness: 500, damping: 38, mass: 0.45 });
  const [interactive, setInteractive] = useState(false);

  useEffect(() => {
    const move = (event: MouseEvent) => { x.set(event.clientX); y.set(event.clientY); };
    const over = (event: MouseEvent) => setInteractive(Boolean((event.target as HTMLElement | null)?.closest("a,button,[role='button'],input,select,textarea,.interactive")));
    window.addEventListener("mousemove", move, { passive: true });
    window.addEventListener("mouseover", over, { passive: true });
    return () => { window.removeEventListener("mousemove", move); window.removeEventListener("mouseover", over); };
  }, [x, y]);

  return (
    <motion.div
      aria-hidden="true"
      className={`nexora-cursor ${interactive ? "nexora-cursor--active" : ""}`}
      style={{ x: springX, y: springY }}
    >
      <span />
    </motion.div>
  );
}
