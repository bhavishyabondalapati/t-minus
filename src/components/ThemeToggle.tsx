"use client";
import { useSyncExternalStore } from "react";

function currentTheme(): "light" | "dark" {
  const set = document.documentElement.dataset.theme;
  if (set === "light" || set === "dark") return set;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}
const listeners = new Set<() => void>();
const subscribe = (cb: () => void) => {
  listeners.add(cb);
  const m = window.matchMedia("(prefers-color-scheme: dark)");
  m.addEventListener("change", cb);
  return () => {
    listeners.delete(cb);
    m.removeEventListener("change", cb);
  };
};

export function useTheme() {
  return useSyncExternalStore(subscribe, currentTheme, () => "light" as const);
}

export default function ThemeToggle() {
  const theme = useTheme();
  const next = theme === "dark" ? "light" : "dark";
  return (
    <button
      type="button"
      className="btn btn-sm"
      aria-label={`Switch to ${next} mode`}
      onClick={() => {
        document.documentElement.dataset.theme = next;
        try { localStorage.setItem("tm-theme", next); } catch {}
        listeners.forEach((l) => l());
      }}
    >
      {theme === "dark" ? "☀ Light" : "☾ Dark"}
    </button>
  );
}
