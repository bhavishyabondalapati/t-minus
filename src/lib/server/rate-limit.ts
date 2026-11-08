import { sql, lt } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";

export interface RateResult {
  ok: boolean;
  remaining: number;
  retryAfterSec: number;
}

/** Fixed-window counter stored in Postgres. Fails open if the DB is unreachable. */
export async function rateLimit(key: string, limit: number, windowSec: number): Promise<RateResult> {
  const nowSec = Math.floor(Date.now() / 1000);
  const windowStart = nowSec - (nowSec % windowSec);
  try {
    const [row] = await getDb()
      .insert(schema.rateLimits)
      .values({ key, windowStart, count: 1 })
      .onConflictDoUpdate({
        target: [schema.rateLimits.key, schema.rateLimits.windowStart],
        set: { count: sql`${schema.rateLimits.count} + 1` },
      })
      .returning({ count: schema.rateLimits.count });
    const count = row?.count ?? 1;
    return {
      ok: count <= limit,
      remaining: Math.max(0, limit - count),
      retryAfterSec: windowStart + windowSec - nowSec,
    };
  } catch {
    return { ok: true, remaining: limit, retryAfterSec: 0 };
  }
}

export async function purgeOldRateLimits(olderThanSec = 3600) {
  const cutoff = Math.floor(Date.now() / 1000) - olderThanSec;
  await getDb().delete(schema.rateLimits).where(lt(schema.rateLimits.windowStart, cutoff));
}

export function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

export function tooMany(r: RateResult) {
  return Response.json(
    { error: "Too many requests. Please slow down." },
    { status: 429, headers: { "Retry-After": String(Math.max(1, r.retryAfterSec)) } },
  );
}
