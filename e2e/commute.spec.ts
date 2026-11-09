import { test, expect, type Page } from "@playwright/test";

/** Replace the live MBTA feed with one deterministic train, 15 minutes away. */
async function stubArrivals(page: Page) {
  await page.route("**/api/arrivals/stream**", async (route) => {
    const at = new Date(Date.now() + 15 * 60_000).toISOString();
    const data = {
      serverTime: Date.now(),
      stale: false,
      predictions: [{ id: "e2e-1", tripId: "t1", routeId: "Red", stopId: "70075", directionId: 0, arrivalTime: at, departureTime: at, scheduledArrival: at, scheduleRelationship: null }],
      weather: { available: true, category: "clear", precipProbability: 0, shortForecast: "Sunny", tempF: 60 },
    };
    await route.fulfill({
      status: 200,
      headers: { "content-type": "text/event-stream", "cache-control": "no-store" },
      body: `retry: 60000\n\nevent: arrivals\ndata: ${JSON.stringify(data)}\n\n`,
    });
  });
}

async function expectCountdownAbout9(page: Page) {
  const countdown = page.getByTestId("countdown");
  await expect(countdown).toHaveText(/^[0-9]{1,2}:[0-5][0-9]$/);
  const [m] = ((await countdown.textContent()) ?? "").split(":").map(Number);
  expect(m).toBeGreaterThanOrEqual(8); // 15 min train - 5 min walk - 1 min buffer
  expect(m).toBeLessThanOrEqual(9);
}

test.describe("demo account (read-only)", () => {
  test("shows seeded commutes and a countdown, and cannot write", async ({ page }) => {
    await stubArrivals(page);
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Leave when the");
    await page.getByRole("button", { name: "Try the demo" }).first().click();
    await expect(page).toHaveURL(/\/app$/);

    await expect(page.getByTestId("countdown")).toHaveText(/^[0-9]{1,2}:[0-5][0-9]$/);
    await expect(page.getByTestId("demo-note")).toContainText("read-only");
    await expect(page.getByRole("button", { name: /^Delete / })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "+ New commute" })).toHaveCount(0);

    // The server refuses writes no matter what the UI does.
    const body = { name: "Nope", routeId: "Red", originStopId: "place-pktrm", destStopId: "place-harsq", walkMinutes: 5 };
    const post = await page.request.post("/api/commutes", { data: body });
    expect(post.status()).toBe(403);
    expect((await post.json()).error).toContain("read-only");
    const list = await (await page.request.get("/api/commutes")).json();
    const del = await page.request.delete(`/api/commutes/${list.commutes[0].id}`);
    expect(del.status()).toBe(403);
    expect((await (await page.request.get("/api/commutes")).json()).commutes).toHaveLength(list.commutes.length);
  });
});

test.describe("new account", () => {
  // Fresh fake client IP so repeated runs do not trip the signup rate limit.
  const ip = `10.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`;
  test.use({ extraHTTPHeaders: { "x-forwarded-for": ip } });

  test("signs up, saves a commute and sees the countdown", async ({ page }) => {
    await stubArrivals(page);
    const name = `E2E commute ${Date.now()}`;
    await page.goto("/signup");
    await page.getByLabel("Email").fill(`e2e-${Date.now()}@example.test`);
    await page.getByLabel("Password").fill("correct horse battery");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page).toHaveURL(/\/app$/);

    const form = page.getByRole("form", { name: "Save a commute" });
    await form.getByLabel("Name").fill(name);
    await form.getByLabel("Line").selectOption("Red");
    await expect(form.getByLabel("Board at")).toBeEnabled();
    await form.getByLabel("Board at").selectOption({ label: "Park Street" });
    await form.getByLabel("Get off at").selectOption({ label: "Kendall/MIT" });
    await form.getByLabel("Walk to the platform (minutes)").fill("5");
    await form.getByRole("button", { name: "Save commute" }).click();

    await expect(page.getByRole("heading", { name })).toBeVisible();
    await expectCountdownAbout9(page);
    await page.getByRole("button", { name: `Delete ${name}` }).click();
    await expect(page.getByRole("button", { name: `Delete ${name}` })).toHaveCount(0);
  });
});

test("security headers are present", async ({ request }) => {
  const res = await request.get("/");
  const h = res.headers();
  expect(h["content-security-policy"]).toContain("default-src 'self'");
  expect(h["x-content-type-options"]).toBe("nosniff");
  expect(h["strict-transport-security"]).toContain("max-age");
  expect(h["x-frame-options"]).toBe("SAMEORIGIN");
});

test("protected API rejects anonymous callers", async ({ request }) => {
  expect((await request.get("/api/commutes")).status()).toBe(401);
  expect((await request.post("/api/cron/reconcile")).status()).toBe(401);
});

test.describe("static fallbacks", () => {
  test.use({ reducedMotion: "reduce" });
  test("reduced motion: no WebGL scenes run, posters are shown", async ({ page }) => {
    await page.goto("/");
    await page.mouse.move(300, 300);
    await page.waitForTimeout(1500);
    await expect(page.locator(".scene-live")).toHaveCount(0);
    await expect(page.getByRole("img", { name: /Illustrated hills/ })).toBeVisible();
  });
});

test.describe("phone", () => {
  test.use({ viewport: { width: 390, height: 800 } });
  test("phones get static images and plain nav links", async ({ page }) => {
    await page.goto("/");
    await page.mouse.move(100, 100);
    await page.waitForTimeout(1500);
    await expect(page.locator(".scene-live")).toHaveCount(0);
    await expect(page.getByRole("navigation", { name: "Primary" }).getByRole("link", { name: "Reliability" })).toBeVisible();
  });
});

test("only one scene is live at a time", async ({ page }) => {
  await page.goto("/");
  await page.mouse.move(300, 300);
  await page.locator("#live-h").scrollIntoViewIfNeeded();
  await page.waitForTimeout(3000);
  expect(await page.locator(".scene-live").count()).toBeLessThanOrEqual(1);
});
