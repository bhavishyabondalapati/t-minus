"use client";
import "@designcodeio/threeui/style.css";
import { DiagnosticsPanel } from "@designcodeio/threeui/components/DiagnosticsPanel";

export default function DiagnosticsLive({ dark }: { dark: boolean }) {
  return <DiagnosticsPanel mode={dark ? "dark" : "light"} opacity={0.8} hue={28} />;
}
