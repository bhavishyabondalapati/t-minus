import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";
import { resolveDatabaseUrl } from "./url";

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb() {
  if (!_db) {
    _db = drizzle(neon(resolveDatabaseUrl()), { schema });
  }
  return _db;
}

export { schema };
