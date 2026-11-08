// Captures README screenshots from a running server: node scripts/screenshots.mjs http://localhost:3100
import { chromium } from "@playwright/test";

const base = process.argv[2] ?? "http://localhost:3100";
const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });

async function shot(name, colorScheme, fn, viewport = { width: 1360, height: 860 }) {
  const ctx = await browser.newContext({ viewport, colorScheme });
  const page = await ctx.newPage();
  await fn(page);
  await page.screenshot({ path: `docs/${name}.png` });
  await ctx.close();
}

await shot("landing", "dark", async (page) => {
  await page.goto(base);
  await page.mouse.move(400, 400); // arms the deferred landscape scene
  await page.waitForTimeout(9000);
});
await shot("landing-light", "light", async (page) => {
  await page.goto(base);
  await page.evaluate(() => window.scrollTo(0, 900));
  await page.waitForTimeout(7000);
});
await shot("dashboard", "dark", async (page) => {
  await page.goto(base);
  await page.getByRole("button", { name: "Try the demo" }).first().click();
  await page.waitForURL("**/app");
  await page.waitForTimeout(9000);
}, { width: 1360, height: 1500 });
await browser.close();
