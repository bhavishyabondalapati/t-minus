"use client";
import dynamic from "next/dynamic";
import Scene from "../Scene";
import { PanelPoster } from "../posters";
import { fmtClock, useNow, type ArrivalPrediction, type ArrivalStatus } from "@/lib/use-arrivals";

const CrtLive = dynamic(() => import("../live/CrtLive"), { ssr: false });

function rowStatus(p: ArrivalPrediction): { text: string; cls: string } {
  const arr = Date.parse(p.arrivalTime ?? p.departureTime ?? "");
  const sch = Date.parse(p.scheduledArrival ?? "");
  if (!Number.isFinite(arr)) return { text: "—", cls: "crt-dim" };
  if (!Number.isFinite(sch)) return { text: "LIVE", cls: "crt-dim" };
  const late = Math.round((arr - sch) / 60000);
  if (late >= 2) return { text: `+${late} MIN`, cls: "crt-late" };
  return { text: "ON TIME", cls: "crt-ok" };
}

export default function Board({
  id = "board", title, toward, predictions, status, toggle = true, deferUntilInteraction = false,
}: {
  id?: string; title: string; toward: string; predictions: ArrivalPrediction[]; status: ArrivalStatus; toggle?: boolean; deferUntilInteraction?: boolean;
}) {
  const now = useNow(1000);
  const rows = predictions
    .map((p) => ({ p, at: Date.parse(p.arrivalTime ?? p.departureTime ?? "") }))
    .filter((r) => Number.isFinite(r.at) && r.at > now - 30_000)
    .slice(0, 5);

  return (
    <Scene id={id} priority={2} className="board-scene" label="Amber CRT terminal screen" poster={<PanelPoster />} live={<CrtLive />} toggle={toggle} deferUntilInteraction={deferUntilInteraction}>
      <div className="crt board-body" style={{ background: "transparent", border: 0, position: "relative", zIndex: 2 }}>
        <p className="label" style={{ color: "rgb(255 176 32 / 0.7)" }}>
          &gt; DEPARTURES · {title.toUpperCase()} → {toward.toUpperCase()}
        </p>
        {rows.length === 0 ? (
          <p className="crt-cursor" role="status" style={{ padding: "18px 0", minHeight: 190 }}>
            {status === "connecting" ? "LINKING TO MBTA" : status === "degraded" ? "MBTA FEED DOWN, RETRYING" : "NO TRAINS PREDICTED"}
          </p>
        ) : (
          <div role="table" aria-label={`Next trains from ${title} toward ${toward}`} style={{ marginTop: 10, minHeight: 190 }}>
            {rows.map(({ p, at }) => {
              const secs = Math.max(0, Math.round((at - now) / 1000));
              const mins = Math.floor(secs / 60);
              const st = rowStatus(p);
              return (
                <div role="row" className="crt-row" key={p.id}>
                  <span role="cell" className="num" style={{ fontSize: "1.25rem" }}>{secs < 45 ? "BRD" : `${mins}m`}</span>
                  <span role="cell">{toward.toUpperCase()} <span className="crt-dim">· {fmtClock(at)}</span></span>
                  <span role="cell" className={st.cls}>{st.text}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Scene>
  );
}
