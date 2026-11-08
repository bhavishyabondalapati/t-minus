"use client";
import dynamic from "next/dynamic";
import { useMemo } from "react";
import Scene from "../Scene";
import { PanelPoster } from "../posters";
import { useTheme } from "../ThemeToggle";
import { computeLeaveBy, formatCountdown, type WeatherInput } from "@/lib/leave-by";
import { fmtClock, useNow, type ArrivalPrediction, type ArrivalStatus } from "@/lib/use-arrivals";

const ArcLive = dynamic(() => import("../live/ArcLive"), { ssr: false });

const HORIZON_SEC = 20 * 60;

export default function LeaveArc({
  predictions, walkMinutes, weather, status, toggle = true,
}: {
  predictions: ArrivalPrediction[]; walkMinutes: number; weather: WeatherInput | null; status: ArrivalStatus; toggle?: boolean;
}) {
  const now = useNow(1000);
  const dark = useTheme() === "dark";
  const result = useMemo(
    () => computeLeaveBy({ predictions, now, walkMinutes, weather }),
    [predictions, now, walkMinutes, weather],
  );
  const next = result.next;
  const frac = next ? Math.min(1, Math.max(0, 1 - next.secondsUntilLeave / HORIZON_SEC)) : 0;
  const R = 150;
  const C = Math.PI * R; // half circle
  const urgencyColor = next?.urgency === "now" ? "var(--bad)" : next?.urgency === "soon" ? "var(--warn)" : "var(--accent)";

  return (
    <Scene id="arc" priority={5} className="arc-scene" label="Dotted arc backdrop that sweeps as your leave time approaches" poster={<PanelPoster tone="ink" />} live={<ArcLive dark={dark} />} toggle={toggle}>
      <div className="arc-body">
        <p className="label">Leave in</p>
        <svg viewBox="0 0 360 200" className="arc-svg" aria-hidden="true" focusable="false">
          <path d="M30 180 A150 150 0 0 1 330 180" fill="none" stroke="var(--rule)" strokeWidth="6" strokeLinecap="round" />
          <path d="M30 180 A150 150 0 0 1 330 180" fill="none" stroke={urgencyColor} strokeWidth="6" strokeLinecap="round"
            strokeDasharray={`${C * frac} ${C}`} style={{ transition: "stroke-dasharray 1s linear" }} />
        </svg>
        <div className="arc-readout">
          <div className="num arc-time" data-testid="countdown" style={{ color: urgencyColor }}>
            {next ? formatCountdown(next.secondsUntilLeave) : "--:--"}
          </div>
          <p className="mono arc-sub" role="status" aria-live="polite" data-testid="leave-sub">
            {status === "connecting" && !next && "Linking to MBTA…"}
            {status === "degraded" && !next && "MBTA feed unavailable. Retrying."}
            {next && (
              next.urgency === "now" ? "Leave now" : `Train at ${fmtClock(next.boardAtMs)}`
            )}
            {!next && status === "live" && (result.options.length ? "Next train is too close. Catch the one after." : "No trains predicted yet")}
          </p>
        </div>
        <p className="note arc-math">
          Walk {result.walkMin} min + buffer {result.bufferMin} min{weather && weather.category !== "clear" ? ` (${weather.category})` : ""}
        </p>
      </div>
    </Scene>
  );
}
