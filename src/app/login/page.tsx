import type { Metadata } from "next";
import AuthForm from "@/components/AuthForm";
export const metadata: Metadata = { title: "Sign in" };
export default function Page() {
  return <div className="wrap auth-wrap"><AuthForm mode="login" /></div>;
}
