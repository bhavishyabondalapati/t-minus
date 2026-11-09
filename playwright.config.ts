import { config as loadEnv } from "dotenv";
import { defineConfig, devices } from "@playwright/test";
import { assertSafeBaseUrl, assertSafeEnv } from "./e2e/guard";

loadEnv({ path: ".env.local" });

const PORT = Number(process.env.E2E_PORT ?? 3100);
const BASE = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`;

// Hard stops: never a deployed URL, never the production database.
assertSafeBaseUrl(BASE);
assertSafeEnv(process.env);

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  globalTeardown: "./e2e/global-teardown.ts",
  use: { baseURL: BASE, trace: "retain-on-failure", screenshot: "only-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `npm run build && npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}/api/health`,
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
    // The app picks its database from these; blank them so nothing can steer it to production.
    env: { ...(process.env as Record<string, string>), VERCEL: "", DB_TARGET: "" },
  },
});
