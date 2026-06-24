# Portfolio City — Audit & Backlog (handoff)

_Branch: `feat/isometric-city`. Updated after the **Tiny-Tokyo redesign** (2026-06-25)._

## What it is
Interactive isometric 3D city portfolio (Three.js r0.169 + Vite, vanilla JS, all procedural — no model files). Drive a kart around a floating **Tiny-Tokyo island**: a central **fountain roundabout**, a grand **avenue** north to the hero **Tokyo Tower**, a cozy **night-market lane**, side parks, and **8 project buildings** ringing the plaza. Approach a building → press **T** → preview card → click to repo/live. Day/night toggle, GTA mini-map. Classic Swiss page preserved at `classic.html` (also the no-WebGL fallback).

- Run: `npm install && npm run dev` (→ :5173). Build: `npm run build` → `dist/`.
- Deploy: one `dist/` for GitHub Pages (`.github/workflows/deploy.yml`) + Netlify (`netlify.toml`). `base:'./'`. **Pending:** `git push -u origin feat/isometric-city`, then flip Pages source = GitHub Actions.

## Architecture map
- `src/main.js` — boot, RAF loop, wiring. Renders through the post composer (`post.render()`); low tier renders direct. Dev-only `window.__city` hook. **Screenshot harness:** `?shot` (overview), `?shot=night|hero|play|playnight|heronight` pin cams / snap night / keep the follow-cam, and hide UI.
- `src/core/` — `Engine` (renderer/scene/clock/resize, opaque canvas, `onResize` hook, quality `tier`), `Camera` (iso follow + speed-FOV + turn bank), `Lighting`, `DayNight` (tweens lights/fog/sky/clear-color/emissive by `nightT`; `setTo(t)` snaps instantly), **`Post`** (EffectComposer: RenderPass → GTAO → UnrealBloom → grade/vignette → OutputPass).
- `src/world/` — `palette.js` (★ disciplined palette: 5 muted dominants + 8 project accents + tight neon), `World.js` (★ Tiny-Tokyo layout + `animate(t,nightT)`), `Ground.js`, `factory/{buildings,roads,trees,props,streetprops,landmarks,sky,life}.js`.
  - `buildings.js` — `makeBuilding({accent,w,d,h,archetype,signage})` dispatcher: **machiya / curtain (per-window glow) / pagoda / market / capsule**. Signage (awning+neon) is opt-in (projects + market lane only).
  - `landmarks.js` — hero `makeTokyoTower` (~20u, merged lattice), `makeFountain` (animated, teal-ringed medallion), torii/stall/lantern/billboard/bench/kiosk.
  - `roads.js` — `makeIslandRoads` (ring + avenue + spokes + roundabout + plaza medallion, merged flat decals).
  - `sky.js` — gradient sky **dome** (day↔night via `uNight`), sun/moon, stars. On **layer 1** so GTAO ignores it.
  - `life.js` — looping traffic, instanced pedestrians, drifting clouds (layer 1).
- `src/vehicle/` — `Cart` (Gulf kart, `userData.body` for juice), `CartController` (arcade kinematics + chassis lean/squat/bob).
- `src/projects/projects.data.js` — ★ 8 projects → `pos/footprint/height/archetype`.

**Day/night:** any material tagged `userData.nightE` (+ optional `dayE`) is collected by `DayNight` at construction and its `emissiveIntensity` lerps day↔night. Such materials must exist **before** `DayNight` is built (world/sky/life/cart all are).

**Sky/clouds on layer 1:** the follow camera enables layer 1; a layer-0-only clone drives GTAO so the far sky + sprite clouds never get contact-AO (which otherwise darkened screen corners / left a black sprite artifact).

## What works (don't regress)
Cohesive scaled diorama, post-processing (bloom/AO/grade — gated higher at night, high tier only), 3D sky dome + stars + sun/moon, per-window night glow, life/motion, fountain medallion, varied low+wide archetypes, hero Tower, palette discipline, camera/cart juice, reduced-motion freeze, mobile low-tier (skips composer), no-WebGL fallback, dual-host deploy.

## Remaining backlog (post-review)
- **P1 — draw-call merge (perf).** Buildings are unmerged groups (~280–380 draw calls, ~120 materials). Mirror the merge pattern (already used in `landmarks/roads/trees`) inside each archetype: merge same-material opaque meshes (body + pilasters + slabs + parapet) → ~4–6 meshes/building, saving ~150–200 calls. Keep glass/emissive meshes separate so `DayNight` still collects them. Pool the 3–4 window-grid textures.
- **P2 — extend per-window glow** beyond the 2 curtain buildings (machiya/market still glow as solid strips at night).
- **P3 — small-viewport UX:** validate minimap + project card on short/landscape-phone heights (card can exceed viewport); add `aria-pressed` already done for day/night.
- **P3 — tower beacon pulse** is frozen during the 0.9s day↔night transition (DayNight `_apply` overwrites it mid-tween) — minor.
- Optional: ambient audio (night-market hum, engine, UI ticks).

## Tech notes / gotchas
- `mergeGeometries`: normalize index presence (`.toNonIndexed()`) — non-indexed polyhedra otherwise return `null` → per-frame crash.
- New glowing elements: tag `userData.nightE`/`dayE`. New sky/atmosphere sprites: put on **layer 1** (else GTAO artifacts).
- Post composer sized in **CSS px** with `composer.setPixelRatio(dpr)` — feeding device px double-applies DPR (4× pixels).
- Screenshot QA needs the **night snap** (`?shot=night` → `dayNight.setTo(1)`): the headless `--virtual-time-budget` clock freezes the day/night tween mid-way, so the smooth toggle won't complete in a capture. Headless Chromium WebGL: `--use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader --virtual-time-budget=16000`.
- Runtime errors don't fail `npm run build` — verify in a real browser (WebGL).
