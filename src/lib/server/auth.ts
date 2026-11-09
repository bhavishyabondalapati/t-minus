import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { and, eq, gt } from "drizzle-orm";
import { hash, verify } from "@node-rs/argon2";
import { getDb, schema } from "@/lib/db";
import { demoWriteBlock } from "@/lib/demo-policy";

export const SESSION_COOKIE = "tm_session";
const SESSION_DAYS = 14;

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

export const hashPassword = (pw: string) => hash(pw, { memoryCost: 19456, timeCost: 2, parallelism: 1 });

let dummy: string | null = null;
/** Verify against a throwaway hash so unknown emails cost the same time as wrong passwords. */
export async function verifyPassword(stored: string | null, pw: string): Promise<boolean> {
  if (!stored) {
    dummy ??= await hashPassword("not-a-real-password");
    await verify(dummy, pw).catch(() => false);
    return false;
  }
  return verify(stored, pw).catch(() => false);
}

export async function createSession(userId: number) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  await getDb().insert(schema.sessions).values({ tokenHash: sha256(token), userId, expiresAt });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await getDb().delete(schema.sessions).where(eq(schema.sessions.tokenHash, sha256(token)));
  jar.delete(SESSION_COOKIE);
}

export interface SessionUser {
  id: number;
  email: string;
  isDemo: boolean;
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const [row] = await getDb()
      .select({ id: schema.users.id, email: schema.users.email, isDemo: schema.users.isDemo })
      .from(schema.sessions)
      .innerJoin(schema.users, eq(schema.users.id, schema.sessions.userId))
      .where(and(eq(schema.sessions.tokenHash, sha256(token)), gt(schema.sessions.expiresAt, new Date())))
      .limit(1);
    return row ?? null;
  } catch {
    return null;
  }
}

/** For route handlers: returns the user or a 401 Response. */
export async function requireUser(): Promise<SessionUser | Response> {
  const u = await getSessionUser();
  return u ?? Response.json({ error: "Not signed in" }, { status: 401 });
}

/** For route handlers that change data: signed in, and not the read-only demo account. */
export async function requireWritableUser(): Promise<SessionUser | Response> {
  const u = await requireUser();
  if (u instanceof Response) return u;
  return demoWriteBlock(u) ?? u;
}
