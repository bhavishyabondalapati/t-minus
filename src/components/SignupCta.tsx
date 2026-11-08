"use client";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useSceneSlot } from "@/lib/use-scene-slot";

const SignupButtonLive = dynamic(() => import("./live/SignupButtonLive"), { ssr: false });

/** Plain link by default. The ThreeUI liquid-metal button takes over when it holds the live slot. */
export default function SignupCta() {
  const { ref, running } = useSceneSlot("cta", 3);
  return (
    <div ref={ref} style={{ minHeight: 64, display: "grid", alignItems: "center", justifyItems: "start" }}>
      {running ? <SignupButtonLive /> : <Link href="/signup" className="btn btn-primary">Get started</Link>}
    </div>
  );
}
