import { defineConfig } from "drizzle-kit";
import { config } from "dotenv";
import { resolveDatabaseUrl } from "./src/lib/db/url";

config({ path: ".env.local" });
config();

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { // `generate` only reads the schema; every command that touches a database resolves dev/prod strictly.
  url: process.argv.includes("generate") ? "postgresql://unused/unused" : resolveDatabaseUrl() },
});
