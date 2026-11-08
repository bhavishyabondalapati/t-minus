import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { credentialsSchema } from "@/lib/validation";
import { createSession, hashPassword } from "@/lib/server/auth";
import { clientIp, rateLimit, tooMany } from "@/lib/server/rate-limit";

export async function POST(req: Request) {
  const rl = await rateLimit(`signup:${clientIp(req)}`, 5, 3600);
  if (!rl.ok) return tooMany(rl);
  const parsed = credentialsSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const { email, password } = parsed.data;
  const db = getDb();
  const [exists] = await db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.email, email)).limit(1);
  if (exists) return Response.json({ error: "That email is already registered" }, { status: 409 });
  const [user] = await db
    .insert(schema.users)
    .values({ email, passwordHash: await hashPassword(password) })
    .returning({ id: schema.users.id });
  await createSession(user!.id);
  return Response.json({ ok: true }, { status: 201 });
}
