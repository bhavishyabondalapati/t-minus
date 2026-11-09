/**
 * Which database does this process talk to?
 * - On Vercel (VERCEL is set by the platform) -> DATABASE_URL (production).
 * - Anywhere else (local dev, `next start`, tests, scripts) -> DATABASE_URL_DEV only.
 *   It never falls back to DATABASE_URL, so a missing dev URL fails loudly instead of touching production.
 * - Scripts that must hit production say so with DB_TARGET=prod.
 */
export type Env = Record<string, string | undefined>;

export function resolveDatabaseUrl(env: Env = process.env): string {
  const prodForced = env.DB_TARGET === "prod";
  if (env.VERCEL || prodForced) {
    if (!env.DATABASE_URL) throw new Error("DATABASE_URL is not set");
    return env.DATABASE_URL;
  }
  if (!env.DATABASE_URL_DEV) {
    throw new Error("DATABASE_URL_DEV is not set. Local work uses the Neon dev branch, never production.");
  }
  if (env.DATABASE_URL && sameDatabase(env.DATABASE_URL, env.DATABASE_URL_DEV)) {
    throw new Error("DATABASE_URL_DEV points at the production database. Use a separate Neon branch.");
  }
  return env.DATABASE_URL_DEV;
}

/** Compare host + database name, ignoring credentials and query string. */
export function sameDatabase(a: string, b: string): boolean {
  const key = (u: string) => {
    try {
      const p = new URL(u);
      return `${p.hostname.replace("-pooler", "")}${p.pathname}`;
    } catch {
      return u;
    }
  };
  return key(a) === key(b);
}
