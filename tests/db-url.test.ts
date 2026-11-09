import { describe, it, expect } from "vitest";
import { resolveDatabaseUrl, sameDatabase } from "@/lib/db/url";

const PROD = "postgresql://u:p@ep-prod-123.us-east-2.aws.neon.tech/neondb?sslmode=require";
const DEV = "postgresql://u:p@ep-dev-456.us-east-2.aws.neon.tech/neondb?sslmode=require";

describe("resolveDatabaseUrl", () => {
  it("uses DATABASE_URL on Vercel", () => {
    expect(resolveDatabaseUrl({ VERCEL: "1", DATABASE_URL: PROD, DATABASE_URL_DEV: DEV })).toBe(PROD);
  });
  it("uses the dev URL everywhere else, even with NODE_ENV=production", () => {
    expect(resolveDatabaseUrl({ NODE_ENV: "production", DATABASE_URL: PROD, DATABASE_URL_DEV: DEV })).toBe(DEV);
  });
  it("never falls back to production when the dev URL is missing", () => {
    expect(() => resolveDatabaseUrl({ DATABASE_URL: PROD })).toThrow(/DATABASE_URL_DEV/);
  });
  it("refuses a dev URL that is really production (pooler or not)", () => {
    expect(() => resolveDatabaseUrl({ DATABASE_URL: PROD, DATABASE_URL_DEV: PROD.replace("ep-prod-123", "ep-prod-123-pooler") })).toThrow(/production/);
  });
  it("needs an explicit DB_TARGET=prod for scripts to reach production", () => {
    expect(resolveDatabaseUrl({ DB_TARGET: "prod", DATABASE_URL: PROD, DATABASE_URL_DEV: DEV })).toBe(PROD);
    expect(() => resolveDatabaseUrl({ DB_TARGET: "prod", DATABASE_URL_DEV: DEV })).toThrow(/DATABASE_URL is not set/);
  });
});

describe("sameDatabase", () => {
  it("ignores credentials and query strings", () => {
    expect(sameDatabase(PROD, "postgresql://x:y@ep-prod-123.us-east-2.aws.neon.tech/neondb")).toBe(true);
    expect(sameDatabase(PROD, DEV)).toBe(false);
  });
});
