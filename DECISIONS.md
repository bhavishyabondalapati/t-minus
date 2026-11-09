# Decisions log

Each entry: what I decided, and why. Newest at the bottom.

1. **Node via conda.** Global rule is one conda env per project, so `t-minus` holds Node 22 (`conda activate t-minus`).
2. **ThreeUI source.** Used the free MIT "Community" npm package `@designcodeio/threeui` (repo MengTo/threeui, LICENSE = MIT). Pro/Beta source is not in that package, so every component imported is free. All seven requested components plus a Sign-up button exist in it. MIT only requires keeping the copyright notice, so the footer and README credit "ThreeUI by Meng To (MIT)". Catalog thumbnails/videos on threeui.com are NOT MIT, and I do not use them.
3. **ThreeUI components take no data props.** Landscape, Uplink, Gauges and Diagnostics render fixed content (iframes), the CRT and Arc are shader backdrops, and the dock has fixed labels. So real data (departures, countdown, on-time %) is drawn as accessible DOM text on top of them, and dock clicks are mapped to routes by event delegation. The visual layers are `aria-hidden`.
4. **"Get Started" button** is ThreeUI `LiquidMetalButton` (pill, `text` prop), which is free.
5. **One WebGL scene at a time** through a small scene manager (`src/lib/scene-manager.ts`). The active scene is mounted. Others show an SVG poster. Mobile, reduced motion and offscreen always get posters.
6. **argon2:** `@node-rs/argon2` (prebuilt binaries, works on Vercel without node-gyp).
7. **Rate limiting** is a Postgres fixed-window counter table. No Redis, so no extra paid service.
8. **Delay metric:** delay = actual arrival minus scheduled arrival. Actual arrival = first time the vehicle is seen STOPPED_AT the stop. If never seen, the last prediction before it vanished is used and flagged `source=last_prediction`.
9. **Landscape iframe.** ThreeUI's `LandscapeScene` wrapper hardcodes `sandbox="allow-scripts"` (opaque origin) and the scene stays blank in our app, though the same HTML renders fine with `allow-same-origin`. So `LandscapeLive` embeds the same ThreeUI `landscape.html` (copied from the package, served same-origin) with `allow-scripts allow-same-origin` and the wrapper's exact variant/time/weather query mapping.
10. **Scene slot = on screen.** A scene only competes for the one live WebGL slot while it is in the viewport. Priority: loader (100) > landscape (10) > arc (5) > CTA button (3) > board (2) > gauge/diagnostics (1). A per-panel "Live" switch pins a scene.
11. **Weather location** is fixed at downtown Boston (42.3601, -71.0589) rather than per stop. One forecast per 10 minutes is enough for a buffer.
12. **Direction** is inferred from stop order (destination after origin in route order = direction 0). On Red Line branches (Ashmont vs Braintree) that is approximate. Listed under known limits.
13. **Live URL.** `t-minus.vercel.app` already belongs to someone else's project, so the live alias is `https://t-minus-drab.vercel.app` (the one Vercel assigned to this project).
14. **One database.** Only one Neon `DATABASE_URL` was provided, so local development, the E2E run and production all use it. Migrations and the demo seed were applied to it once. E2E deletes the commute it creates.
15. **E2E is manual in CI.** It signs in as the demo user against a real database, so putting DB credentials into Actions was not warranted. CI runs lint, typecheck, unit tests and a build. The Playwright suite has a manual workflow and passes locally and against the live URL.
16. **Git author** was rewritten to the GitHub noreply address before the first push so the public history does not expose a personal email.
17. **CSP** keeps `'unsafe-inline'` for scripts because Next.js emits inline bootstrap scripts and nonces would make every page dynamic. Everything else is locked to same-origin (plus Google Fonts for the ThreeUI loader).
