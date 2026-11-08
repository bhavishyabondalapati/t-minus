"use client";
import { useState } from "react";
import type { LandscapeVariant } from "@/lib/leave-by";

/**
 * ThreeUI's <LandscapeScene> hardcodes sandbox="allow-scripts", which gives the scene an opaque
 * origin, and in our app it then renders blank. So we embed the same ThreeUI landscape.html
 * (copied from @designcodeio/threeui/assets, MIT) ourselves, same-origin, using the identical
 * variant -> time/weather query mapping as the component. See DECISIONS.md.
 */
const MAP: Record<LandscapeVariant, { time: string; weather: string }> = {
  sunrise: { time: "morning", weather: "clear" },
  noon: { time: "noon", weather: "clear" },
  sunset: { time: "sunset", weather: "clear" },
  night: { time: "night", weather: "clear" },
  rain: { time: "noon", weather: "rain" },
  storm: { time: "sunset", weather: "storm" },
  snow: { time: "noon", weather: "snow" },
};

export default function LandscapeLive({ variant }: { variant: LandscapeVariant }) {
  const [ready, setReady] = useState(false);
  const m = MAP[variant];
  return (
    <iframe
      title={`Procedural landscape, ${variant}`}
      src={`/landscape.html?variant=${variant}&time=${m.time}&weather=${m.weather}`}
      sandbox="allow-scripts allow-same-origin"
      onLoad={() => setReady(true)}
      style={{ opacity: ready ? 1 : 0, transition: "opacity 0.6s" }}
    />
  );
}
