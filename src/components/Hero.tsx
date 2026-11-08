"use client";
import Link from "next/link";
import dynamic from "next/dynamic";
import Scene from "./Scene";
import DemoButton from "./DemoButton";
import { LandscapePoster, LANDSCAPE_ALT } from "./posters";
import type { LandscapeVariant } from "@/lib/leave-by";

const LandscapeLive = dynamic(() => import("./live/LandscapeLive"), { ssr: false });

export default function Hero({ variant, tempF, forecast }: { variant: LandscapeVariant; tempF: number | null; forecast: string }) {
  return (
    <Scene id="landscape" priority={10} deferUntilInteraction className="hero" label={LANDSCAPE_ALT[variant]} poster={<LandscapePoster variant={variant} />} live={<LandscapeLive variant={variant} />}>
      <div className="hero-shade" aria-hidden="true" />
      <div className="wrap hero-inner">
        <p className="label hero-eyebrow">
          <span className="ticker-dot live" aria-hidden="true" /> Boston · {forecast}{tempF !== null ? ` · ${tempF}°F` : ""}
        </p>
        <h1 className="display hero-title">
          Leave when the <em>train</em> says so.
        </h1>
        <p className="hero-sub">
          T-Minus watches live MBTA arrivals, your walk to the station and the weather, then gives you one number: how long until you have to go.
        </p>
        <div className="hero-actions">
          <Link href="/signup" className="btn btn-primary">Get started</Link>
          <DemoButton className="btn hero-ghost" />
        </div>
      </div>
    </Scene>
  );
}
