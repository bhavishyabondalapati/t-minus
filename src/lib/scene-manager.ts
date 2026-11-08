"use client";
import { useSyncExternalStore } from "react";

/**
 * Only one WebGL scene may run at a time.
 * - Every scene registers with a priority.
 * - A scene with priority >= 100 (the loader) always wins while it is mounted.
 * - Otherwise a scene the user pinned wins.
 * - Otherwise the highest-priority registered scene wins.
 */
const entries = new Map<string, number>();
let pinned: string | null = null;
let activeId: string | null = null;
const listeners = new Set<() => void>();

function compute(): string | null {
  let best: string | null = null;
  let bestP = -Infinity;
  for (const [id, p] of entries) {
    if (p > bestP) {
      best = id;
      bestP = p;
    }
  }
  if (bestP >= 100) return best;
  if (pinned && entries.has(pinned)) return pinned;
  return best;
}

function update() {
  const next = compute();
  if (next !== activeId) {
    activeId = next;
    listeners.forEach((l) => l());
  }
}

export function registerScene(id: string, priority: number): () => void {
  entries.set(id, priority);
  update();
  return () => {
    entries.delete(id);
    if (pinned === id) pinned = null;
    update();
  };
}

export function pinScene(id: string | null) {
  pinned = id;
  update();
}

export function getPinned() {
  return pinned;
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function useActiveScene(): string | null {
  return useSyncExternalStore(subscribe, () => activeId, () => null);
}

export function usePinned(): string | null {
  return useSyncExternalStore(subscribe, () => pinned, () => null);
}

export function useMediaQuery(query: string, serverValue = false): boolean {
  return useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia(query);
      m.addEventListener("change", cb);
      return () => m.removeEventListener("change", cb);
    },
    () => window.matchMedia(query).matches,
    () => serverValue,
  );
}

/** True when WebGL scenes must not run: phones and reduced-motion users get static images. */
export function useStaticOnly(): boolean {
  const reduced = useMediaQuery("(prefers-reduced-motion: reduce)", false);
  const small = useMediaQuery("(max-width: 767px)", false);
  return reduced || small;
}
