import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { createSession } from "@/lib/server/auth";
import { clientIp, rateLimit, tooMany } from "@/lib/server/rate-limit";

export const DEMO_EMAIL = "demo@t-minus.app";

/** Signs in as the shared demo account (created by `npm run db:seed`). */
export async function POST(req: Request) {
  const rl = await rateLimit(`demo:${clientIp(req)}`, 30, 600);
  if (!rl.ok) return tooMany(rl);
  const [user] = await getDb().select().from(schema.users).where(eq(schema.users.email, DEMO_EMAIL)).limit(1);
  if (!user?.isDemo) return Response.json({ error: "Demo account is not set up yet" }, { status: 503 });
  await createSession(user.id);
  return Response.json({ ok: true });
}
