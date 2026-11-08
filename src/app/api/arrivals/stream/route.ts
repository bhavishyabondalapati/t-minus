import { streamQuerySchema } from "@/lib/validation";
import { getPredictions } from "@/lib/server/mbta";
import { getWeather } from "@/lib/server/nws";
import { logPredictions } from "@/lib/server/prediction-log";
import { clientIp, rateLimit, tooMany } from "@/lib/server/rate-limit";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const TICK_MS = 10_000;
const LIFETIME_MS = 50_000; // then the browser's EventSource reconnects on its own

export async function GET(req: Request) {
  const url = new URL(req.url);
  const parsed = streamQuerySchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) return Response.json({ error: "Bad query" }, { status: 400 });
  const rl = await rateLimit(`sse:${clientIp(req)}`, 12, 60);
  if (!rl.ok) return tooMany(rl);
  const { stop, route, direction } = parsed.data;

  const enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) =>
        controller.enqueue(enc.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      controller.enqueue(enc.encode(`retry: 3000\n\n`));
      const started = Date.now();

      async function tick() {
        try {
          const [preds, weather] = await Promise.all([getPredictions(stop, route, direction), getWeather()]);
          if (preds.fresh) void logPredictions(preds.data).catch(() => {});
          send("arrivals", {
            serverTime: Date.now(),
            predictions: preds.data,
            stale: preds.stale,
            weather: {
              available: weather.available,
              category: weather.category,
              precipProbability: weather.precipProbability,
              shortForecast: weather.shortForecast,
              tempF: weather.tempF,
            },
          });
        } catch {
          send("degraded", { serverTime: Date.now(), message: "MBTA data is temporarily unavailable" });
        }
      }

      await tick();
      while (!req.signal.aborted && Date.now() - started + TICK_MS < LIFETIME_MS) {
        await new Promise((r) => setTimeout(r, TICK_MS));
        if (req.signal.aborted) break;
        await tick();
      }
      try {
        controller.close();
      } catch {
        /* already closed */
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-store, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
