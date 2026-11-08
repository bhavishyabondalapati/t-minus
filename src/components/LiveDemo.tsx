"use client";
import { useEffect, useRef, useState } from "react";
import Board from "./panels/Board";
import LeaveArc from "./panels/LeaveArc";
import { useArrivals } from "@/lib/use-arrivals";

/** Public demo: Red Line from Park Street toward Alewife, with a walking-time slider. */
export default function LiveDemo() {
  const ref = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);
  const [walk, setWalk] = useState(6);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => { if (e!.isIntersecting) setNear(true); }, { rootMargin: "200px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const a = useArrivals("place-pktrm", "Red", 1, near);

  return (
    <div ref={ref}>
      <div className="grid-2">
        <div style={{ display: "grid", gap: 16, alignContent: "start" }}>
          <Board title="Park Street" toward="Alewife" predictions={a.predictions} status={a.status} />
          <div className="panel">
            <div className="field">
              <label htmlFor="walk">Walk to Park Street: <span className="num" data-testid="walk-value">{walk} min</span></label>
              <input id="walk" type="range" min={0} max={30} value={walk} onChange={(e) => setWalk(Number(e.target.value))} style={{ accentColor: "var(--accent)", width: "100%" }} />
            </div>
            <p className="note" style={{ marginTop: 10 }}>
              Slide it and watch the countdown change. {a.weather?.available ? `Boston is ${a.weather.tempF ?? "--"}°F, ${a.weather.shortForecast.toLowerCase()}.` : "Weather feed offline, assuming clear skies."}
            </p>
          </div>
        </div>
        <LeaveArc predictions={a.predictions} walkMinutes={walk} weather={a.weather} status={a.status} />
      </div>
      <p className="label" style={{ marginTop: 12, display: "flex", gap: 8, alignItems: "center" }}>
        <span className={`ticker-dot ${a.status === "live" ? "live" : ""}`} aria-hidden="true" />
        {a.status === "live" ? "Live from the MBTA" : a.status === "degraded" ? "MBTA feed interrupted, retrying" : "Connecting"}
        {a.stale ? " · showing cached data" : ""}
      </p>
    </div>
  );
}
