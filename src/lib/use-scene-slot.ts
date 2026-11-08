"use client";
import { useEffect, useRef, useState } from "react";
import { registerScene, useActiveScene, useStaticOnly } from "./scene-manager";

/**
 * A scene competes for the single WebGL slot only while it is on screen.
 * Phones and reduced-motion users never get a live scene.
 */
export function useSceneSlot(id: string, priority: number, deferUntilInteraction = false) {
  const staticOnly = useStaticOnly();
  const active = useActiveScene() === id;
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  const [armed, setArmed] = useState(!deferUntilInteraction);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setInView(e!.isIntersecting), { rootMargin: "80px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => (inView && !staticOnly ? registerScene(id, priority) : undefined), [inView, staticOnly, id, priority]);

  useEffect(() => {
    if (armed) return;
    const go = () => setArmed(true);
    const events: (keyof WindowEventMap)[] = ["pointermove", "scroll", "keydown", "touchstart"];
    events.forEach((e) => window.addEventListener(e, go, { once: true, passive: true }));
    const t = window.setTimeout(go, 6000);
    return () => {
      events.forEach((e) => window.removeEventListener(e, go));
      window.clearTimeout(t);
    };
  }, [armed]);

  return { ref, staticOnly, inView, running: !staticOnly && active && inView && armed };
}
