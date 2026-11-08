import type { Metadata } from "next";
import { asc } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { lineColor } from "@/lib/line-colors";

export const metadata: Metadata = { title: "Reliability", description: "Average delay by line and hour, measured from real MBTA predictions." };
export const revalidate = 300;

function hourLabel(h: number) {
  const ap = h < 12 ? "a" : "p";
  return `${h % 12 === 0 ? 12 : h % 12}${ap}`;
}

export default async function Reliability() {
  let rows: (typeof schema.delayStats.$inferSelect)[] = [];
  let failed = false;
  try {
    rows = await getDb().select().from(schema.delayStats).orderBy(asc(schema.delayStats.routeId), asc(schema.delayStats.hour));
  } catch {
    failed = true;
  }
  const byRoute = Map.groupBy(rows, (r) => r.routeId);
  const updated = rows.reduce((m, r) => Math.max(m, r.updatedAt.getTime()), 0);
  const maxAbs = Math.max(120, ...rows.map((r) => Math.abs(r.avgDelaySec)));

  return (
    <div className="wrap section">
      <p className="label">Reliability</p>
      <h1 className="display section-title">How late is the T, really?</h1>
      <p className="note" style={{ maxWidth: "64ch" }}>
        Every prediction we show is logged, then compared with when the train actually arrived. Delay is measured against the published schedule. A train counts as on time when it is within five minutes. Stats are precomputed every 15 minutes.
      </p>
      {updated > 0 && <p className="label" style={{ marginTop: 12 }}>Updated {new Date(updated).toLocaleString("en-US", { timeZone: "America/New_York" })} ET</p>}

      {failed && <p className="err" role="alert">The statistics database is unreachable right now.</p>}
      {!failed && rows.length === 0 && (
        <div className="panel" style={{ marginTop: 28 }}>
          <p className="display" style={{ fontSize: "1.8rem" }}>Still collecting data.</p>
          <p className="note">We only publish numbers we measured. The first results appear after trains have arrived and the next scheduled job runs.</p>
        </div>
      )}

      <div style={{ display: "grid", gap: 28, marginTop: 32 }}>
        {[...byRoute.entries()].map(([route, list]) => {
          const n = list.reduce((a, r) => a + r.samples, 0);
          const pct = list.reduce((a, r) => a + r.onTimePct * r.samples, 0) / n;
          return (
            <section key={route} className="panel" aria-labelledby={`h-${route}`}>
              <div className="panel-head">
                <h2 id={`h-${route}`} className="badge" style={{ ["--line" as string]: lineColor(route) }}><i /> {route}</h2>
                <span className="label">{Math.round(pct)}% on time · {n} arrivals</span>
              </div>
              <div className="bars" role="img" aria-label={`Average delay in minutes for ${route} by hour of day. See the table below for exact values.`}>
                {list.map((r) => (
                  <div key={r.hour} className="bar-col" title={`${hourLabel(r.hour)}: ${(r.avgDelaySec / 60).toFixed(1)} min`}>
                    <div className="bar" style={{ height: `${Math.max(3, (Math.abs(r.avgDelaySec) / maxAbs) * 100)}%`, background: r.avgDelaySec > 180 ? "var(--bad)" : "var(--accent)" }} />
                    <span className="num bar-x">{hourLabel(r.hour)}</span>
                  </div>
                ))}
              </div>
              <details style={{ marginTop: 16 }}>
                <summary className="label" style={{ cursor: "pointer" }}>Show table</summary>
                <table className="rel-table">
                  <caption className="sr-only">{route} delay by hour</caption>
                  <thead><tr><th scope="col">Hour (ET)</th><th scope="col">Avg delay (min)</th><th scope="col">On time</th><th scope="col">Arrivals</th></tr></thead>
                  <tbody>
                    {list.map((r) => (
                      <tr key={r.hour}><th scope="row">{hourLabel(r.hour)}</th><td className="num">{(r.avgDelaySec / 60).toFixed(1)}</td><td className="num">{Math.round(r.onTimePct)}%</td><td className="num">{r.samples}</td></tr>
                    ))}
                  </tbody>
                </table>
              </details>
            </section>
          );
        })}
      </div>
    </div>
  );
}
