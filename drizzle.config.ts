import { defineConfig } from "drizzle-kit";
import { config } from "dotenv";
import { resolveDatabaseUrl } from "./src/lib/db/url";

config({ path: ".env.local" });
config();

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: resolveDatabaseUrl() },
});
