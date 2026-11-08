import { getLines } from "@/lib/server/mbta";
import { clientIp, rateLimit, tooMany } from "@/lib/server/rate-limit";

export async function GET(req: Request) {
  const rl = await rateLimit(`lines:${clientIp(req)}`, 60, 60);
  if (!rl.ok) return tooMany(rl);
  try {
    const r = await getLines();
    return Response.json({ lines: r.data, stale: r.stale });
  } catch {
    return Response.json({ lines: [], degraded: true }, { status: 200 });
  }
}
