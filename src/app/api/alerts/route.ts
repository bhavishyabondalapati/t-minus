import { getAlerts } from "@/lib/server/mbta";
import { clientIp, rateLimit, tooMany } from "@/lib/server/rate-limit";

export async function GET(req: Request) {
  const route = new URL(req.url).searchParams.get("route") ?? "";
  if (!/^[A-Za-z0-9-]{1,32}$/.test(route)) return Response.json({ error: "Bad route" }, { status: 400 });
  const rl = await rateLimit(`alerts:${clientIp(req)}`, 60, 60);
  if (!rl.ok) return tooMany(rl);
  try {
    const r = await getAlerts(route);
    return Response.json({ alerts: r.data, stale: r.stale });
  } catch {
    return Response.json({ alerts: [], degraded: true });
  }
}
