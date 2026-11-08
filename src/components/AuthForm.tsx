"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import DemoButton from "./DemoButton";

export default function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const isLogin = mode === "login";

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    const res = await fetch(`/api/auth/${mode}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: fd.get("email"), password: fd.get("password") }),
    }).catch(() => null);
    if (res?.ok) {
      router.push("/app");
      router.refresh();
      return;
    }
    const body = await res?.json().catch(() => null);
    setError(body?.error ?? "Something went wrong. Try again.");
    setBusy(false);
  }

  return (
    <div className="panel auth-panel">
      <h1 className="display" style={{ fontSize: "3rem" }}>{isLogin ? "Sign in" : "Create account"}</h1>
      <form onSubmit={submit} noValidate style={{ display: "grid", gap: 16, marginTop: 20 }}>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" className="input" autoComplete="email" required />
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <input id="password" name="password" type="password" className="input" autoComplete={isLogin ? "current-password" : "new-password"} required minLength={isLogin ? 1 : 8} aria-describedby="pw-hint" />
          {!isLogin && <span id="pw-hint" className="note">At least 8 characters.</span>}
        </div>
        <p className="err" role="alert" aria-live="assertive">{error}</p>
        <button className="btn btn-primary" disabled={busy} type="submit">{busy ? "Working…" : isLogin ? "Sign in" : "Create account"}</button>
      </form>
      <hr style={{ border: 0, borderTop: "1px solid var(--rule)", margin: "24px 0" }} />
      <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap", justifyContent: "space-between" }}>
        <DemoButton />
        <p className="note">
          {isLogin ? <>New here? <Link href="/signup">Create an account</Link></> : <>Have an account? <Link href="/login">Sign in</Link></>}
        </p>
      </div>
    </div>
  );
}
