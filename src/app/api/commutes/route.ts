import { desc, eq, count } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { requireUser } from "@/lib/server/auth";
import { commuteInputSchema } from "@/lib/validation";
import { getLines, getStops } from "@/lib/server/mbta";
import { clientIp, rateLimit, tooMany } from "@/lib/server/rate-limit";

const MAX_COMMUTES = 10;

export async function GET() {
  const user = await requireUser();
  if (user instanceof Response) return user;
  const rows = await getDb().select().from(schema.commutes).where(eq(schema.commutes.userId, user.id)).orderBy(desc(schema.commutes.id));
  return Response.json({ commutes: rows });
}

export async function POST(req: Request) {
  const user = await requireUser();
  if (user instanceof Response) return user;
  const rl = await rateLimit(`commute:${clientIp(req)}:${user.id}`, 30, 600);
  if (!rl.ok) return tooMany(rl);

  const parsed = commuteInputSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  const input = parsed.data;
  if (input.originStopId === input.destStopId) {
    return Response.json({ error: "Origin and destination must differ" }, { status: 400 });
  }

  const db = getDb();
  const [{ n }] = await db.select({ n: count() }).from(schema.commutes).where(eq(schema.commutes.userId, user.id));
  if (n >= MAX_COMMUTES) return Response.json({ error: `You can save up to ${MAX_COMMUTES} commutes` }, { status: 400 });

  try {
    const lines = (await getLines()).data;
    if (!lines.some((l) => l.id === input.routeId)) return Response.json({ error: "Unknown line" }, { status: 400 });
    const forward = (await getStops(input.routeId, 0)).data;
    const o = forward.findIndex((s) => s.id === input.originStopId);
    const d = forward.findIndex((s) => s.id === input.destStopId);
    if (o < 0 || d < 0) return Response.json({ error: "Both stops must be on the chosen line" }, { status: 400 });
    // Direction 0 follows the listed order; direction 1 runs the other way.
    const directionId = d > o ? 0 : 1;
    const [row] = await db
      .insert(schema.commutes)
      .values({
        userId: user.id,
        name: input.name,
        routeId: input.routeId,
        originStopId: input.originStopId,
        originStopName: forward[o]!.name,
        destStopId: input.destStopId,
        destStopName: forward[d]!.name,
        directionId,
        walkMinutes: input.walkMinutes,
      })
      .returning();
    return Response.json({ commute: row }, { status: 201 });
  } catch {
    return Response.json({ error: "MBTA data is unavailable right now. Try again shortly." }, { status: 503 });
  }
}
