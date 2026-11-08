import "server-only";
import { inArray, sql } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import type { Prediction } from "./mbta";

/** Record predictions we just fetched, and mark any whose vehicle is now stopped at the stop. */
export async function logPredictions(preds: Prediction[]) {
  const rows = preds
    .filter((p) => p.arrivalTime ?? p.departureTime)
    .map((p) => ({
      predictionId: p.id,
      tripId: p.tripId,
      routeId: p.routeId,
      stopId: p.stopId,
      directionId: p.directionId,
      predictedAt: new Date((p.arrivalTime ?? p.departureTime)!),
      scheduledAt: p.scheduledArrival ? new Date(p.scheduledArrival) : null,
      lastSeenAt: new Date(),
    }));
  if (rows.length === 0) return;
  const db = getDb();
  await db
    .insert(schema.predictionLog)
    .values(rows)
    .onConflictDoUpdate({
      target: schema.predictionLog.predictionId,
      set: {
        predictedAt: sql`excluded.predicted_at`,
        lastSeenAt: sql`excluded.last_seen_at`,
        scheduledAt: sql`coalesce(excluded.scheduled_at, ${schema.predictionLog.scheduledAt})`,
      },
      setWhere: sql`${schema.predictionLog.resolved} = false`,
    });

  const arrived = preds.filter(
    (p) => p.vehicleStatus === "STOPPED_AT" && p.vehicleStopId === p.stopId && p.vehicleUpdatedAt,
  );
  for (const p of arrived) {
    await db
      .update(schema.predictionLog)
      .set({
        actualAt: new Date(p.vehicleUpdatedAt!),
        actualSource: "vehicle",
        resolved: true,
        delaySec: sql`case when ${schema.predictionLog.scheduledAt} is null then null
          else extract(epoch from (${new Date(p.vehicleUpdatedAt!)}::timestamptz - ${schema.predictionLog.scheduledAt}))::int end`,
      })
      .where(sql`${schema.predictionLog.predictionId} = ${p.id} and ${schema.predictionLog.resolved} = false`);
  }
}

/** Anything unresolved and clearly in the past: use the last prediction we saw as the arrival. */
export async function resolveStale() {
  const db = getDb();
  const res = await db.execute(sql`
    update prediction_log set
      actual_at = predicted_at,
      actual_source = 'last_prediction',
      resolved = true,
      delay_sec = case when scheduled_at is null then null
                       else extract(epoch from (predicted_at - scheduled_at))::int end
    where resolved = false and predicted_at < now() - interval '10 minutes'
  `);
  return res.rowCount ?? 0;
}

export async function recomputeStats() {
  const db = getDb();
  await db.execute(sql`
    with agg as (
      select route_id,
             extract(hour from actual_at at time zone 'America/New_York')::int as hour,
             avg(delay_sec)::real as avg_delay_sec,
             (100.0 * avg(case when delay_sec <= 300 then 1 else 0 end))::real as on_time_pct,
             count(*)::int as samples
      from prediction_log
      where resolved and delay_sec is not null and actual_at > now() - interval '30 days'
      group by 1, 2
    ), up as (
      insert into delay_stats (route_id, hour, avg_delay_sec, on_time_pct, samples, updated_at)
      select route_id, hour, avg_delay_sec, on_time_pct, samples, now() from agg
      on conflict (route_id, hour) do update set
        avg_delay_sec = excluded.avg_delay_sec, on_time_pct = excluded.on_time_pct,
        samples = excluded.samples, updated_at = excluded.updated_at
      returning 1
    )
    delete from delay_stats d where not exists (select 1 from agg a where a.route_id = d.route_id and a.hour = d.hour)
  `);
}

export async function purgeOld() {
  const db = getDb();
  await db.execute(sql`delete from prediction_log where first_seen_at < now() - interval '60 days'`);
  await db.execute(sql`delete from sessions where expires_at < now()`);
  await db.execute(sql`delete from api_cache where expires_at < now() - interval '2 days'`);
}

export { inArray };
