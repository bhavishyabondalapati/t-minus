/**
 * Runs the real retention roll-up statement against the Neon DEV database, inside a transaction
 * that is always rolled back, so nothing is left behind. Skipped unless RUN_DB_TESTS=1.
 * Run with: npm run test:db
 * resolveDatabaseUrl() refuses to return the production URL off Vercel, so this cannot touch prod.
 */
import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { sql } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { resolveDatabaseUrl } from "@/lib/db/url";
import { rollupStatement } from "@/lib/server/rollup-sql";

const enabled = process.env.RUN_DB_TESTS === "1";

const ROUTE = "TEST-ROLLUP";
type Row = Record<string, unknown>;

describe.skipIf(!enabled)("retention roll-up (dev database, rolled back)", () => {
  const pool = enabled ? new Pool({ connectionString: resolveDatabaseUrl() }) : null;
  afterAll(async () => pool?.end());

  it("moves only old rows, aggregates them per hour, and adds into existing buckets", async () => {
    const client = await pool!.connect();
    const db = drizzle({ client });
    const q = async (s: ReturnType<typeof sql>) => (await db.execute(s)).rows as Row[];
    try {
      await client.query("BEGIN");
      const before = Number((await q(sql`select count(*)::int n from prediction_log where route_id <> ${ROUTE}`))[0].n);

      // Hour bucket 20 days ago, at a fixed minute so all three rows land in the same hour.
      const hour = (await q(sql`select date_trunc('hour', now() - interval '20 days') as h`))[0].h as Date;
      const at = (min: number) => new Date(new Date(hour).getTime() + min * 60_000);
      const rows: Array<[string, number, Date, number | null]> = [
        ["a", 0, at(5), 60], // on time
        ["b", 0, at(20), 600], // 10 min late
        ["c", 0, at(40), null], // no delay measurement
        ["d", 1, at(10), 120], // other direction -> its own bucket
      ];
      for (const [id, dir, when, delay] of rows) {
        await q(sql`insert into prediction_log (prediction_id, route_id, stop_id, direction_id, first_seen_at, predicted_at, actual_at, delay_sec, resolved)
          values (${"test-rollup-" + id}, ${ROUTE}, 'S1', ${dir}, ${when}, ${when}, ${when}, ${delay}, true)`);
      }
      // A recent row (2 days old) must stay.
      await q(sql`insert into prediction_log (prediction_id, route_id, stop_id, direction_id, first_seen_at, predicted_at)
        values ('test-rollup-recent', ${ROUTE}, 'S1', 0, now() - interval '2 days', now() - interval '2 days')`);
      // An existing bucket for direction 0 must be added to, not overwritten.
      await q(sql`insert into prediction_hourly values (${ROUTE}, 'S1', 0, ${hour}, 10, 8, 800, 7)`);

      const result = (await q(rollupStatement(14)))[0];
      expect(Number(result.moved)).toBe(4);
      expect(Number(result.buckets)).toBe(2);

      const left = await q(sql`select prediction_id from prediction_log where route_id = ${ROUTE}`);
      expect(left.map((r) => r.prediction_id)).toEqual(["test-rollup-recent"]);

      const buckets = await q(sql`select direction_id, n_total, n_delay, sum_delay_sec::int s, n_ontime
        from prediction_hourly where route_id = ${ROUTE} order by direction_id`);
      expect(buckets).toEqual([
        { direction_id: 0, n_total: 13, n_delay: 10, s: 1460, n_ontime: 8 },
        { direction_id: 1, n_total: 1, n_delay: 1, s: 120, n_ontime: 1 },
      ]);

      // Running it again moves nothing more.
      expect(Number((await q(rollupStatement(14)))[0].moved)).toBe(0);
      // Real dev rows (all younger than 14 days) were not touched.
      const after = Number((await q(sql`select count(*)::int n from prediction_log where route_id <> ${ROUTE}`))[0].n);
      expect(after).toBe(before);
    } finally {
      await client.query("ROLLBACK");
      client.release();
    }
  }, 60_000);
});
