"use client";
import Link from "next/link";
import { useState } from "react";
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
  const [dockReady, setDockReady] = useState(false);
  return (
    <header className="site-nav">
      <div className="wrap site-nav-row">
        <Link href="/" className="brand">
          <span className="brand-mark" aria-hidden="true">T−</span>
          <span className="display brand-word">T-Minus</span>
        </Link>
        {/* Plain links for no-JS, phones and reduced motion. The ThreeUI dock replaces them once it has loaded. */}
        <nav aria-label="Primary" className="nav-links" hidden={dockReady && !staticOnly}>
          {NAV.map((n) => (
            <Link key={n.href} href={n.href}>{n.label}</Link>
          ))}
          <Link href="/login">Sign in</Link>
        </nav>
        <ThemeToggle />
      </div>
      {!staticOnly && (
        <div className="dock-wrap" data-testid="dock">
          <DockLive onReady={() => setDockReady(true)} />
        </div>
      )}
    </header>
  );
}
