"use client";
import "@designcodeio/threeui/style.css";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AnimatedTopDock } from "@designcodeio/threeui/components/AnimatedTopDock";

/**
 * The ThreeUI dock has fixed labels and no onSelect prop, so clicks are caught on a wrapper
 * and mapped to routes by the button's text. The real nav (SiteNav) stays in the DOM for
 * keyboard, screen-reader and no-JS users.
 */
const ROUTES: Record<string, string> = {
  SYSTEM: "/",
  METHOD: "/#how",
  WORK: "/app",
  ACCESS: "/login",
  NOTES: "/reliability",
};

export default function DockLive({ onReady }: { onReady?: () => void }) {
  const router = useRouter();
  useEffect(() => { onReady?.(); }, [onReady]);
  return (
    <div
      className="dock-host"
      onClick={(e) => {
        const btn = (e.target as HTMLElement).closest("button");
        const label = btn?.textContent?.trim().toUpperCase();
        if (label && ROUTES[label]) router.push(ROUTES[label]);
      }}
    >
      <AnimatedTopDock variant="sable" />
    </div>
  );
}
