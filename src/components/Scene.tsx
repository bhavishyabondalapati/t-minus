"use client";
import { pinScene } from "@/lib/scene-manager";
import { useSceneSlot } from "@/lib/use-scene-slot";

interface Props {
  id: string;
  priority?: number;
  /** Static image fallback. Always rendered first, and kept for mobile and reduced motion. */
  poster: React.ReactNode;
  /** The lazy WebGL scene. Mounted only when this scene holds the single live slot. */
  live: React.ReactNode;
  /** Accessible description of what the scene shows. */
  label: string;
  className?: string;
  /** Offer a keyboard-accessible switch so people can choose which scene is live. */
  toggle?: boolean;
  /** Wait for first user input (or a timeout) before loading, to protect page load. */
  deferUntilInteraction?: boolean;
  children?: React.ReactNode;
}

export default function Scene({ id, priority = 1, poster, live, label, className = "", toggle = false, deferUntilInteraction = false, children }: Props) {
  const { ref, running, staticOnly } = useSceneSlot(id, priority, deferUntilInteraction);
  return (
    <div ref={ref} className={`scene ${className}`} data-scene={id} data-running={running}>
      <div className="scene-poster" role="img" aria-label={label}>
        {poster}
      </div>
      {running && <div className="scene-live" aria-hidden="true">{live}</div>}
      {children}
      {toggle && !staticOnly && (
        <button type="button" className="btn btn-sm scene-toggle" aria-pressed={running} onClick={() => pinScene(running ? null : id)}>
          {running ? "● Live" : "○ Go live"}<span className="sr-only"> shader, {label}</span>
        </button>
      )}
    </div>
  );
}
