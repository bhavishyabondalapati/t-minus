"use client";
import "@designcodeio/threeui/style.css";
import { PredictiveArcCanvas } from "@designcodeio/threeui/components/PredictiveArcCanvas";

export default function ArcLive({ dark }: { dark: boolean }) {
  return <PredictiveArcCanvas variant="predictive" mode={dark ? "dark" : "light"} hue={140} saturation={1.1} />;
}
