"use client";
import "@designcodeio/threeui/style.css";
import { PerformanceGauges } from "@designcodeio/threeui/components/PerformanceGauges";

export default function GaugesLive({ dark }: { dark: boolean }) {
  return <PerformanceGauges mode={dark ? "dark" : "light"} hue={28} />;
}
