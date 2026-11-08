import { createHash, timingSafeEqual } from "node:crypto";
import { getDb, schema } from "@/lib/db";
import { getPredictions } from "@/lib/server/mbta";
import { logPredictions, purgeOld, recomputeStats, resolveStale } from "@/lib/server/prediction-log";
import { purgeOldRateLimits } from "@/lib/server/rate-limit";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const digest = (s: string) => createHash("sha256").update(s).digest();

// Always polled so the stats fill in even when nobody is watching.
const DEFAULT_WATCH = [
  { stop: "place-pktrm", route: "Red", direction: 0 },
  { stop: "place-pktrm", route: "Red", direction: 1 },
  { stop: "place-dwnxg", route: "Orange", direction: 0 },
  { stop: "place-dwnxg", route: "Orange", direction: 1 },
  { stop: "place-state", route: "Blue", direction: 0 },
  { stop: "place-state", route: "Blue", direction: 1 },
];

export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  const given = req.headers.get("authorization")?.replace(/^Bearer /i, "") ?? "";
  if (!secret || !timingSafeEqual(digest(given), digest(secret))) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const saved = await db
    .select({ stop: schema.commutes.originStopId, route: schema.commutes.routeId, direction: schema.commutes.directionId })
    .from(schema.commutes);
  const seen = new Set<string>();
  const targets = [...DEFAULT_WATCH, ...saved].filter((t) => {
    const k = `${t.stop}|${t.route}|${t.direction}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  }).slice(0, 25);

  let polled = 0;
  let failed = 0;
  for (const t of targets) {
    try {
      const p = await getPredictions(t.stop, t.route, t.direction);
      await logPredictions(p.data);
      polled++;
    } catch {
      failed++;
    }
  }
  const resolved = await resolveStale();
  await recomputeStats();
  await purgeOld();
  await purgeOldRateLimits();
  return Response.json({ ok: true, polled, failed, resolved });
}
