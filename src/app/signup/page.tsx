import type { Metadata } from "next";
import AuthForm from "@/components/AuthForm";
export const metadata: Metadata = { title: "Create account" };
export default function Page() {
  return <div className="wrap auth-wrap"><AuthForm mode="signup" /></div>;
}
