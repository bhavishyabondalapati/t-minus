import "server-only";
import { inArray, sql } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import type { Prediction } from "./mbta";

/** A prediction must move by at least this many seconds before we record the new value. */
export const CHANGE_THRESHOLD_SEC = 30;

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
      // Write only when the prediction really moved. Unchanged rows (the common case on every
      // SSE tick) cost no write at all, and so create no dead tuples.
      setWhere: sql`${schema.predictionLog.resolved} = false
        and abs(extract(epoch from (excluded.predicted_at - ${schema.predictionLog.predictedAt}))) >= ${CHANGE_THRESHOLD_SEC}`,
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

export const RETENTION_DAYS = 14;

/**
 * Roll raw rows older than the retention window into hourly aggregates, then delete them.
 * One statement, so a row is never deleted without being counted (or counted twice).
 */
export async function rollupOld(retentionDays = RETENTION_DAYS): Promise<number> {
  const res = await getDb().execute(sql`
    with moved as (
      delete from prediction_log
      where first_seen_at < now() - make_interval(days => ${retentionDays})
      returning route_id, stop_id, direction_id, coalesce(actual_at, predicted_at) as at, delay_sec
    ), agg as (
      select route_id, stop_id, direction_id, date_trunc('hour', at) as hour_start,
             count(*)::int as n_total,
             count(delay_sec)::int as n_delay,
             coalesce(sum(delay_sec), 0)::bigint as sum_delay_sec,
             (count(*) filter (where delay_sec <= 300))::int as n_ontime
      from moved group by 1, 2, 3, 4
    ), up as (
      insert into prediction_hourly (route_id, stop_id, direction_id, hour_start, n_total, n_delay, sum_delay_sec, n_ontime)
      select route_id, stop_id, direction_id, hour_start, n_total, n_delay, sum_delay_sec, n_ontime from agg
      on conflict (route_id, stop_id, direction_id, hour_start) do update set
        n_total = prediction_hourly.n_total + excluded.n_total,
        n_delay = prediction_hourly.n_delay + excluded.n_delay,
        sum_delay_sec = prediction_hourly.sum_delay_sec + excluded.sum_delay_sec,
        n_ontime = prediction_hourly.n_ontime + excluded.n_ontime
      returning 1
    )
    select (select count(*) from moved)::int as moved, (select count(*) from up)::int as buckets
  `);
  return Number((res.rows[0] as { moved?: number } | undefined)?.moved ?? 0);
}

/** Delay by line and Boston hour of day over the last 30 days, from raw rows plus hourly roll-ups. */
export async function recomputeStats() {
  const db = getDb();
  await db.execute(sql`
    with src as (
      select route_id, extract(hour from actual_at at time zone 'America/New_York')::int as hour,
             1 as n, delay_sec::bigint as sum_delay, (case when delay_sec <= 300 then 1 else 0 end) as ontime
      from prediction_log
      where resolved and delay_sec is not null and actual_at > now() - interval '30 days'
      union all
      select route_id, extract(hour from hour_start at time zone 'America/New_York')::int,
             n_delay, sum_delay_sec, n_ontime
      from prediction_hourly
      where n_delay > 0 and hour_start > now() - interval '30 days'
    ), agg as (
      select route_id, hour,
             (sum(sum_delay)::float8 / sum(n))::real as avg_delay_sec,
             (100.0 * sum(ontime) / sum(n))::real as on_time_pct,
             sum(n)::int as samples
      from src group by 1, 2
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
  await db.execute(sql`delete from prediction_hourly where hour_start < now() - interval '90 days'`);
  await db.execute(sql`delete from sessions where expires_at < now()`);
  await db.execute(sql`delete from api_cache where expires_at < now() - interval '2 days'`);
}

export { inArray };
