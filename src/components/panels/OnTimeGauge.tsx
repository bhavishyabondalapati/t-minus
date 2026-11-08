"use client";
import dynamic from "next/dynamic";
import Scene from "../Scene";
import { PanelPoster } from "../posters";
import { useTheme } from "../ThemeToggle";

const GaugesLive = dynamic(() => import("../live/GaugesLive"), { ssr: false });

export interface StatRow { routeId: string; hour: number; avgDelaySec: number; onTimePct: number; samples: number }

export function summarize(stats: StatRow[], routeId: string) {
  const rows = stats.filter((s) => s.routeId === routeId);
  const n = rows.reduce((a, r) => a + r.samples, 0);
  if (n === 0) return null;
  const pct = rows.reduce((a, r) => a + r.onTimePct * r.samples, 0) / n;
  const avg = rows.reduce((a, r) => a + r.avgDelaySec * r.samples, 0) / n;
  return { pct, avg, n };
}

export default function OnTimeGauge({ routeId, lineName, stats, toggle = true }: { routeId: string; lineName: string; stats: StatRow[]; toggle?: boolean }) {
  const dark = useTheme() === "dark";
  const s = summarize(stats, routeId);
  const R = 70;
  const C = 2 * Math.PI * R;
  const frac = s ? s.pct / 100 : 0;
  const ring = (
    <div className="gauge-poster" aria-hidden="true">
      <svg viewBox="0 0 180 180" focusable="false">
        <circle cx="90" cy="90" r={R} fill="none" stroke="var(--rule)" strokeWidth="10" />
        {s && <circle cx="90" cy="90" r={R} fill="none" stroke="var(--accent)" strokeWidth="10" strokeLinecap="round"
          strokeDasharray={`${C * frac} ${C}`} transform="rotate(-90 90 90)" />}
      </svg>
    </div>
  );
  return (
    <Scene id="gauge" priority={1} className="gauge-scene" label="On-time gauge" poster={ring} live={<GaugesLive dark={dark} />} toggle={toggle}>
      <div className="gauge-body">
        <div className="panel-head">
          <p className="label">On-time · {lineName}</p>
          <p className="num gauge-num" data-testid="ontime">{s ? `${Math.round(s.pct)}%` : "—"}</p>
        </div>
        <p className="note gauge-note">
          {s ? `${s.n} arrivals measured · avg ${s.avg >= 0 ? "+" : ""}${Math.round(s.avg / 60 * 10) / 10} min vs schedule` : "Still collecting data for this line. Check back soon."}
        </p>
      </div>
    </Scene>
  );
}
