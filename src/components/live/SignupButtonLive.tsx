"use client";
import "@designcodeio/threeui/style.css";
import { useRouter } from "next/navigation";
import { LiquidMetalButton } from "@designcodeio/threeui/components/LiquidMetalButton";

export default function SignupButtonLive() {
  const router = useRouter();
  return <LiquidMetalButton variant="pill" text="Get started" onClick={() => router.push("/signup")} />;
}
