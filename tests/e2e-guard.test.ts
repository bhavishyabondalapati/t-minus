import { describe, it, expect } from "vitest";
import { assertSafeBaseUrl, assertSafeEnv } from "../e2e/guard";
import { demoWriteBlock, DEMO_READONLY_MESSAGE } from "@/lib/demo-policy";

const PROD = "postgresql://u:p@ep-prod-1.us-east-2.aws.neon.tech/neondb";
const DEV = "postgresql://u:p@ep-dev-2.us-east-2.aws.neon.tech/neondb";

describe("E2E guard", () => {
  it("allows localhost only", () => {
    expect(() => assertSafeBaseUrl("http://localhost:3100")).not.toThrow();
    expect(() => assertSafeBaseUrl("http://127.0.0.1:3100")).not.toThrow();
  });
  it.each(["https://t-minus-drab.vercel.app", "https://example.com", "http://localhost.evil.com", "not a url"])("refuses %s", (u) => {
    expect(() => assertSafeBaseUrl(u)).toThrow(/E2E refused/);
  });
  it("refuses production environments and production databases", () => {
    expect(() => assertSafeEnv({ VERCEL: "1", DATABASE_URL: PROD, DATABASE_URL_DEV: DEV })).toThrow(/refused/);
    expect(() => assertSafeEnv({ DB_TARGET: "prod", DATABASE_URL: PROD, DATABASE_URL_DEV: DEV })).toThrow(/refused/);
    expect(() => assertSafeEnv({ DATABASE_URL: PROD, DATABASE_URL_DEV: PROD })).toThrow(/production/);
    expect(() => assertSafeEnv({ DATABASE_URL: PROD })).toThrow(/DATABASE_URL_DEV/);
  });
  it("accepts a separate dev database", () => {
    expect(assertSafeEnv({ DATABASE_URL: PROD, DATABASE_URL_DEV: DEV })).toBe(DEV);
  });
});

describe("demo write policy", () => {
  it("blocks the demo user with a 403 and a clear message", async () => {
    const r = demoWriteBlock({ isDemo: true })!;
    expect(r.status).toBe(403);
    expect(await r.json()).toEqual({ error: DEMO_READONLY_MESSAGE, code: "demo_readonly" });
  });
  it("lets normal users through", () => {
    expect(demoWriteBlock({ isDemo: false })).toBeNull();
  });
});
