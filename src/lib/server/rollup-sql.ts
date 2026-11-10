import { sql } from "drizzle-orm";

/**
 * The retention roll-up as one SQL statement (kept separate from prediction-log.ts, which is
 * server-only, so the database integration test can run the exact same statement).
 *
 * Raw prediction_log rows older than `retentionDays` are deleted and, in the same statement,
 * added into prediction_hourly. Postgres runs every data-modifying CTE exactly once, so a row is
 * never deleted without being counted, or counted twice. Returns one row: { moved, buckets }.
 */
export function rollupStatement(retentionDays: number) {
  return sql`
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
  `;
}
