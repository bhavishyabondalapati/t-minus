import { getStops } from "@/lib/server/mbta";
import { clientIp, rateLimit, tooMany } from "@/lib/server/rate-limit";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!/^[A-Za-z0-9-]{1,32}$/.test(id)) return Response.json({ error: "Bad line" }, { status: 400 });
  const rl = await rateLimit(`stops:${clientIp(req)}`, 60, 60);
  if (!rl.ok) return tooMany(rl);
  try {
    // Direction 0 lists every station in order; direction 1 is the same list reversed on most lines.
    const r = await getStops(id, 0);
    return Response.json({ stops: r.data, stale: r.stale });
  } catch {
    return Response.json({ stops: [], degraded: true });
  }
}
