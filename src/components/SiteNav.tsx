"use client";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useStaticOnly } from "@/lib/scene-manager";
import ThemeToggle from "./ThemeToggle";

const DockLive = dynamic(() => import("./live/DockLive"), { ssr: false });

export const NAV = [
  { href: "/", label: "Live board" },
  { href: "/#how", label: "How it works" },
  { href: "/app", label: "My commutes" },
  { href: "/reliability", label: "Reliability" },
];

export default function SiteNav() {
  const staticOnly = useStaticOnly();
  return (
    <header className="site-nav">
      <div className="wrap site-nav-row">
        <Link href="/" className="brand" aria-label="T-Minus home">
          <span className="brand-mark" aria-hidden="true">T−</span>
          <span className="display brand-word">T-Minus</span>
        </Link>
        {/* Real, always-present navigation. Visually hidden on wide screens once the dock is shown. */}
        <nav aria-label="Primary" className={staticOnly ? "nav-links" : "nav-links nav-links-compact"}>
          {NAV.map((n) => (
            <Link key={n.href} href={n.href}>{n.label}</Link>
          ))}
          <Link href="/login">Sign in</Link>
        </nav>
        <ThemeToggle />
      </div>
      {!staticOnly && (
        <div className="dock-wrap" aria-hidden="true" data-testid="dock">
          <DockLive />
        </div>
      )}
    </header>
  );
}
