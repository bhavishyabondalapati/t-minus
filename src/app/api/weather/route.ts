import { getWeather } from "@/lib/server/nws";
import { clientIp, rateLimit, tooMany } from "@/lib/server/rate-limit";

export async function GET(req: Request) {
  const rl = await rateLimit(`weather:${clientIp(req)}`, 60, 60);
  if (!rl.ok) return tooMany(rl);
  return Response.json(await getWeather(), { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } });
}
