import { resolveDatabaseUrl } from "../src/lib/db/url";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

/** E2E may only drive a local server. Any deployed URL (including production) is refused. */
export function assertSafeBaseUrl(url: string): void {
  let host: string;
  try {
    host = new URL(url).hostname;
  } catch {
    throw new Error(`E2E refused: "${url}" is not a valid URL.`);
  }
  if (!LOCAL_HOSTS.has(host)) {
    throw new Error(`E2E refused to run against ${host}. End-to-end tests only run against localhost, on the Neon dev branch.`);
  }
}

/** E2E must be using the dev database, and must not be flagged as production. */
export function assertSafeEnv(env: Record<string, string | undefined>): string {
  if (env.VERCEL) throw new Error("E2E refused: VERCEL is set, so this looks like a production environment.");
  if (env.DB_TARGET === "prod") throw new Error("E2E refused: DB_TARGET=prod.");
  return resolveDatabaseUrl(env); // throws if DATABASE_URL_DEV is missing or equals production
}
