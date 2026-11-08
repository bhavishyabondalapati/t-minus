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
