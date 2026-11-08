import { test, expect } from "@playwright/test";

/** Demo login -> save a commute -> see the countdown. Live MBTA data is replaced by a deterministic stream. */
test("demo user saves a commute and sees a leave-by countdown", async ({ page }) => {
  const stamp = Date.now();
  const name = `E2E commute ${stamp}`;

  // Deterministic arrivals: one train in 15 minutes, none sooner.
  await page.route("**/api/arrivals/stream**", async (route) => {
    const at = new Date(Date.now() + 15 * 60_000).toISOString();
    const data = {
      serverTime: Date.now(),
      stale: false,
      predictions: [
        { id: "e2e-1", tripId: "t1", routeId: "Red", stopId: "70075", directionId: 0, arrivalTime: at, departureTime: at, scheduledArrival: at, scheduleRelationship: null },
      ],
      weather: { available: true, category: "clear", precipProbability: 0, shortForecast: "Sunny", tempF: 60 },
    };
    await route.fulfill({
      status: 200,
      headers: { "content-type": "text/event-stream", "cache-control": "no-store" },
      body: `retry: 60000\n\nevent: arrivals\ndata: ${JSON.stringify(data)}\n\n`,
    });
  });

  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Leave when the");

  await page.getByRole("button", { name: "Try the demo" }).first().click();
  await expect(page).toHaveURL(/\/app$/);

  await page.getByRole("button", { name: "+ New commute" }).click();
  const form = page.getByRole("form", { name: "Save a commute" });
  await form.getByLabel("Name").fill(name);
  await form.getByLabel("Line").selectOption("Red");
  await expect(form.getByLabel("Board at")).toBeEnabled();
  await form.getByLabel("Board at").selectOption({ label: "Park Street" });
  await form.getByLabel("Get off at").selectOption({ label: "Kendall/MIT" });
  await form.getByLabel("Walk to the platform (minutes)").fill("5");
  await form.getByRole("button", { name: "Save commute" }).click();

  await expect(page.getByRole("heading", { name })).toBeVisible();

  // 15 min train - 5 min walk - 1 min buffer = about 9:00 left
  const countdown = page.getByTestId("countdown");
  await expect(countdown).toHaveText(/^0?[0-9]:[0-5][0-9]$|^[0-9]{2}:[0-5][0-9]$/);
  const text = (await countdown.textContent()) ?? "";
  const [m] = text.split(":").map(Number);
  expect(m).toBeGreaterThanOrEqual(8);
  expect(m).toBeLessThanOrEqual(9);

  // Clean up so the shared demo account stays tidy.
  await page.getByRole("button", { name: `Delete ${name}` }).click();
  await expect(page.getByRole("button", { name: `Delete ${name}` })).toHaveCount(0);
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
