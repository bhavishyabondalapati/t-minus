"use client";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import Scene from "../Scene";
import { PanelPoster } from "../posters";
import { useTheme } from "../ThemeToggle";

const DiagnosticsLive = dynamic(() => import("../live/DiagnosticsLive"), { ssr: false });

interface AlertRow { id: string; header: string; effect: string; severity: number }

export default function LineStatus({ routeId, lineName, toggle = true }: { routeId: string; lineName: string; toggle?: boolean }) {
  const dark = useTheme() === "dark";
  const [alerts, setAlerts] = useState<AlertRow[] | null>(null);
  const [degraded, setDegraded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/alerts?route=${encodeURIComponent(routeId)}`)
      .then((r) => r.json())
      .then((d) => { if (!cancelled) { setAlerts(d.alerts ?? []); setDegraded(!!d.degraded); } })
      .catch(() => { if (!cancelled) { setAlerts([]); setDegraded(true); } });
    return () => { cancelled = true; };
  }, [routeId]);

  const worst = alerts?.reduce((m, a) => Math.max(m, a.severity), 0) ?? 0;
  const level = worst >= 7 ? "Major disruption" : worst >= 4 ? "Delays" : alerts && alerts.length ? "Notices" : "Normal service";

  return (
    <Scene id="diag" priority={1} className="diag-scene" label="Diagnostics panel backdrop" poster={<PanelPoster tone="ink" />} live={<DiagnosticsLive dark={dark} />} toggle={toggle}>
      <div className="diag-body">
        <div className="panel-head">
          <p className="label">Line status · {lineName}</p>
          <span className="label" style={{ color: worst >= 7 ? "var(--bad)" : worst >= 4 ? "var(--warn)" : "var(--ok)" }}>
            {alerts === null ? "Checking…" : degraded ? "Alerts unavailable" : level}
          </span>
        </div>
        <ul className="diag-list" aria-label={`Alerts for ${lineName}`}>
          {alerts?.length === 0 && !degraded && <li className="note">No active alerts. Trains are running as scheduled.</li>}
          {degraded && <li className="note">Could not reach the MBTA alerts feed. Showing nothing rather than guessing.</li>}
          {alerts?.map((a) => (
            <li key={a.id}>
              <span className="label" style={{ color: a.severity >= 7 ? "var(--bad)" : a.severity >= 4 ? "var(--warn)" : "var(--dim)" }}>
                {a.effect.replaceAll("_", " ")}
              </span>
              <span>{a.header}</span>
            </li>
          ))}
        </ul>
      </div>
    </Scene>
  );
}
