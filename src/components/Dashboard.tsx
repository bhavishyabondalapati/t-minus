"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import LeaveArc from "./panels/LeaveArc";
import Board from "./panels/Board";
import OnTimeGauge, { type StatRow } from "./panels/OnTimeGauge";
import LineStatus from "./panels/LineStatus";
import Scene from "./Scene";
import { PanelPoster } from "./posters";
import dynamic from "next/dynamic";
import { useArrivals } from "@/lib/use-arrivals";
import { lineColor } from "@/lib/line-colors";

const LoaderLive = dynamic(() => import("./live/LoaderLive"), { ssr: false });

export interface CommuteRow {
  id: number; name: string; routeId: string; originStopId: string; originStopName: string;
  destStopId: string; destStopName: string; directionId: number; walkMinutes: number;
}
interface Line { id: string; name: string; color: string; directionDestinations: string[] }
interface Stop { id: string; name: string }

function Loading() {
  return (
    <Scene id="loader" priority={100} label="Uplink progress loader" poster={<PanelPoster />} live={<LoaderLive />} className="loader-scene">
      <p className="label crt-cursor" role="status" style={{ position: "relative", zIndex: 2, padding: 28, color: "#ffb020", minHeight: 160 }}>
        Linking to MBTA
      </p>
    </Scene>
  );
}

function NewCommuteForm({ lines, onCreated, onCancel }: { lines: Line[]; onCreated: (c: CommuteRow) => void; onCancel?: () => void }) {
  const [routeId, setRouteId] = useState("");
  const [stops, setStops] = useState<Stop[]>([]);
  const [loadingStops, setLoadingStops] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!routeId) return;
    let off = false;
    fetch(`/api/lines/${routeId}/stops`).then((r) => r.json()).then((d) => { if (!off) { setStops(d.stops ?? []); setLoadingStops(false); } }).catch(() => { if (!off) { setStops([]); setLoadingStops(false); } });
    return () => { off = true; };
  }, [routeId]);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/commutes", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: fd.get("name"), routeId: fd.get("routeId"), originStopId: fd.get("originStopId"),
        destStopId: fd.get("destStopId"), walkMinutes: fd.get("walkMinutes"),
      }),
    }).catch(() => null);
    const body = await res?.json().catch(() => null);
    setBusy(false);
    if (res?.ok) onCreated(body.commute);
    else setError(body?.error ?? "Could not save. Try again.");
  }

  return (
    <form onSubmit={submit} className="panel" style={{ display: "grid", gap: 14 }} aria-label="Save a commute">
      <h2 className="display" style={{ fontSize: "2rem" }}>Save a commute</h2>
      <div className="field"><label htmlFor="c-name">Name</label><input id="c-name" name="name" className="input" required maxLength={60} placeholder="Morning to work" /></div>
      <div className="field">
        <label htmlFor="c-line">Line</label>
        <select id="c-line" name="routeId" className="input" required value={routeId} onChange={(e) => { setRouteId(e.target.value); setStops([]); setLoadingStops(!!e.target.value); }}>
          <option value="">Choose a line</option>
          {lines.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
      </div>
      <div className="field">
        <label htmlFor="c-origin">Board at</label>
        <select id="c-origin" name="originStopId" className="input" required disabled={!stops.length}>
          <option value="">{loadingStops ? "Loading stops…" : routeId ? "Choose a stop" : "Pick a line first"}</option>
          {stops.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>
      <div className="field">
        <label htmlFor="c-dest">Get off at</label>
        <select id="c-dest" name="destStopId" className="input" required disabled={!stops.length}>
          <option value="">{routeId ? "Choose a stop" : "Pick a line first"}</option>
          {stops.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>
      <div className="field"><label htmlFor="c-walk">Walk to the platform (minutes)</label><input id="c-walk" name="walkMinutes" type="number" min={0} max={60} defaultValue={5} className="input" required /></div>
      <p className="err" role="alert">{error}</p>
      <div style={{ display: "flex", gap: 10 }}>
        <button className="btn btn-primary" type="submit" disabled={busy}>{busy ? "Saving…" : "Save commute"}</button>
        {onCancel && <button className="btn" type="button" onClick={onCancel}>Cancel</button>}
      </div>
    </form>
  );
}

function CommuteView({ c, lines, stats }: { c: CommuteRow; lines: Line[]; stats: StatRow[] }) {
  const line = lines.find((l) => l.id === c.routeId);
  const toward = line?.directionDestinations[c.directionId] ?? c.destStopName;
  const a = useArrivals(c.originStopId, c.routeId, c.directionId);
  const lineName = line?.name ?? c.routeId;
  const waiting = a.status === "connecting" && a.predictions.length === 0;
  return (
    <section aria-labelledby="cv-h" style={{ display: "grid", gap: 20 }}>
      <header>
        <p className="badge" style={{ ["--line" as string]: lineColor(c.routeId) }}><i /> {lineName}</p>
        <h2 id="cv-h" className="display" style={{ fontSize: "clamp(2.2rem,5vw,3.6rem)", marginTop: 6 }}>{c.name}</h2>
        <p className="note">{c.originStopName} → {c.destStopName} · {c.walkMinutes} min walk{a.weather?.available ? ` · ${a.weather.tempF ?? "--"}°F ${a.weather.shortForecast.toLowerCase()}` : ""}</p>
        {a.status === "degraded" && <p className="err" role="status">The MBTA feed is interrupted. Showing the last data we had.</p>}
        {a.stale && <p className="note" role="status">Showing cached data.</p>}
      </header>
      {waiting ? <Loading /> : (
        <>
          <LeaveArc predictions={a.predictions} walkMinutes={c.walkMinutes} weather={a.weather} status={a.status} />
          <Board title={c.originStopName} toward={toward} predictions={a.predictions} status={a.status} />
        </>
      )}
      <div className="grid-2" style={{ gridTemplateColumns: undefined }}>
        <OnTimeGauge routeId={c.routeId} lineName={lineName} stats={stats} />
        <LineStatus routeId={c.routeId} lineName={lineName} />
      </div>
    </section>
  );
}

export default function Dashboard({ email, isDemo, initial, stats }: { email: string; isDemo: boolean; initial: CommuteRow[]; stats: StatRow[] }) {
  const router = useRouter();
  const [commutes, setCommutes] = useState(initial);
  const [selected, setSelected] = useState<number | null>(initial[0]?.id ?? null);
  const [adding, setAdding] = useState(initial.length === 0);
  const [lines, setLines] = useState<Line[]>([]);

  useEffect(() => {
    fetch("/api/lines").then((r) => r.json()).then((d) => setLines(d.lines ?? [])).catch(() => {});
  }, []);

  const current = useMemo(() => commutes.find((c) => c.id === selected) ?? null, [commutes, selected]);

  async function remove(id: number) {
    await fetch(`/api/commutes/${id}`, { method: "DELETE" });
    const rest = commutes.filter((c) => c.id !== id);
    setCommutes(rest);
    if (selected === id) setSelected(rest[0]?.id ?? null);
    if (rest.length === 0) setAdding(true);
  }

  return (
    <div className="wrap dash">
      <aside className="dash-side" aria-label="Your commutes">
        <p className="label">Signed in as</p>
        <p className="mono" style={{ wordBreak: "break-all" }}>{email}{isDemo ? " (demo)" : ""}</p>
        <button className="btn btn-sm" style={{ marginTop: 10 }} onClick={async () => { await fetch("/api/auth/logout", { method: "POST" }); router.push("/"); router.refresh(); }}>Sign out</button>
        <hr style={{ border: 0, borderTop: "1px solid var(--rule)", margin: "20px 0" }} />
        <p className="label">Commutes</p>
        <ul className="commute-list">
          {commutes.map((c) => (
            <li key={c.id}>
              <button type="button" className="commute-btn" aria-pressed={c.id === selected && !adding} onClick={() => { setSelected(c.id); setAdding(false); }}>
                <span className="badge" style={{ ["--line" as string]: lineColor(c.routeId) }}><i />{c.routeId}</span>
                <span>{c.name}</span>
              </button>
              <button type="button" className="btn btn-sm" aria-label={`Delete ${c.name}`} onClick={() => remove(c.id)}>✕</button>
            </li>
          ))}
        </ul>
        {!adding && commutes.length < 10 && <button className="btn btn-sm" onClick={() => setAdding(true)}>+ New commute</button>}
      </aside>
      <div>
        {adding || !current ? (
          <NewCommuteForm lines={lines} onCancel={commutes.length ? () => setAdding(false) : undefined} onCreated={(c) => { setCommutes((p) => [c, ...p]); setSelected(c.id); setAdding(false); }} />
        ) : (
          <CommuteView key={current.id} c={current} lines={lines} stats={stats} />
        )}
      </div>
    </div>
  );
}
