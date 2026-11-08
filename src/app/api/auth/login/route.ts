import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { loginSchema } from "@/lib/validation";
import { createSession, verifyPassword } from "@/lib/server/auth";
import { clientIp, rateLimit, tooMany } from "@/lib/server/rate-limit";

export async function POST(req: Request) {
  const ipLimit = await rateLimit(`login:ip:${clientIp(req)}`, 20, 900);
  if (!ipLimit.ok) return tooMany(ipLimit);
  const parsed = loginSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Enter a valid email and password" }, { status: 400 });
  const { email, password } = parsed.data;
  const emailLimit = await rateLimit(`login:email:${email}`, 5, 900);
  if (!emailLimit.ok) return tooMany(emailLimit);

  const [user] = await getDb().select().from(schema.users).where(eq(schema.users.email, email)).limit(1);
  const ok = await verifyPassword(user?.passwordHash ?? null, password);
  if (!user || !ok) return Response.json({ error: "Wrong email or password" }, { status: 401 });
  await createSession(user.id);
  return Response.json({ ok: true });
}
