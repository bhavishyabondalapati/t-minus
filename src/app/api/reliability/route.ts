import { asc } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { clientIp, rateLimit, tooMany } from "@/lib/server/rate-limit";

export async function GET(req: Request) {
  const rl = await rateLimit(`rel:${clientIp(req)}`, 60, 60);
  if (!rl.ok) return tooMany(rl);
  const rows = await getDb().select().from(schema.delayStats).orderBy(asc(schema.delayStats.routeId), asc(schema.delayStats.hour));
  return Response.json({ stats: rows }, { headers: { "Cache-Control": "public, s-maxage=300" } });
}
