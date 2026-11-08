import { eq, sql } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";

export interface Cached<T> {
  data: T;
  /** True when the upstream call failed and we served an expired copy. */
  stale: boolean;
  /** True when this call hit the upstream API (cache miss). */
  fresh: boolean;
  fetchedAt: number;
}

/**
 * Read-through Postgres cache.
 * - Fresh row -> return it.
 * - Otherwise call `load`. On success store it with the TTL.
 * - On failure serve the expired row if there is one, else rethrow.
 */
export async function cached<T>(key: string, ttlSec: number, load: () => Promise<T>): Promise<Cached<T>> {
  const db = getDb();
  let row: { body: unknown; fetchedAt: Date; expiresAt: Date } | undefined;
  try {
    [row] = await db.select().from(schema.apiCache).where(eq(schema.apiCache.key, key)).limit(1);
  } catch {
    row = undefined; // cache table unreachable: behave as a miss
  }
  const now = Date.now();
  if (row && row.expiresAt.getTime() > now) {
    return { data: row.body as T, stale: false, fresh: false, fetchedAt: row.fetchedAt.getTime() };
  }
  try {
    const data = await load();
    const expiresAt = new Date(now + ttlSec * 1000);
    try {
      await db
        .insert(schema.apiCache)
        .values({ key, body: data as never, fetchedAt: new Date(now), expiresAt })
        .onConflictDoUpdate({
          target: schema.apiCache.key,
          set: { body: sql`excluded.body`, fetchedAt: sql`excluded.fetched_at`, expiresAt: sql`excluded.expires_at` },
        });
    } catch {
      /* cache write failure must not break the response */
    }
    return { data, stale: false, fresh: true, fetchedAt: now };
  } catch (err) {
    if (row) return { data: row.body as T, stale: true, fresh: false, fetchedAt: row.fetchedAt.getTime() };
    throw err;
  }
}
