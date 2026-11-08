"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function DemoButton({ className = "btn", label = "Try the demo" }: { className?: string; label?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <span style={{ display: "inline-grid", gap: 6 }}>
      <button
        type="button"
        className={className}
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError("");
          const res = await fetch("/api/auth/demo", { method: "POST" }).catch(() => null);
          if (res?.ok) {
            router.push("/app");
            router.refresh();
          } else {
            setError("The demo is unavailable right now.");
            setBusy(false);
          }
        }}
      >
        {busy ? "Opening…" : label}
      </button>
      <span className="err" role="alert">{error}</span>
    </span>
  );
}
