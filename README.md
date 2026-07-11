# Sergio Orozco — Portfolio

Two front doors, one codebase:

- **[Classic](https://orosergio.github.io/Portfolio/)** — the default professional hub: selected work with measured evidence, engineering case studies, and a printable [résumé](https://orosergio.github.io/Portfolio/resume.html).
- **[Portfolio City](https://orosergio.github.io/Portfolio/city.html)** — an optional procedural, drivable isometric 3D city (three.js, no framework). Each of the 8 landmarks — Tokyo Tower, Taipei 101, the Raohe night market… — hosts one real project.

Deep dives: **[A city in 266 draw calls](https://orosergio.github.io/Portfolio/case-portfolio-city.html)** (graphics/perf/a11y) · **[OpenClaw](https://orosergio.github.io/Portfolio/case-openclaw.html)** (systems).

---

## The 3D city, measured

All numbers below are from `renderer.info` on an isolated scene render (July 2026), reproducible in the live site console (see [§07 of the case study](https://orosergio.github.io/Portfolio/case-portfolio-city.html)).

| Metric | Value |
|---|---|
| Draw calls, gameplay frame | **266** |
| Draw calls / triangles, whole island visible | **405 / 248,208** |
| Scene graph | 320 meshes (17 instanced), 223 materials, 22 shader programs (mobile tier) |
| Source | **4,993 lines** of vanilla ES modules across 38 files + 198 lines CSS |
| Runtime dependencies | **1** (`three` r169) |
| 3D model / texture / audio assets | **0** — everything is generated in code |

How it stays there:

- **Merge + pool**: procedural builders emit parts; a `mergeStatic()` utility bakes vertex colors and merges geometry per pooled material, skipping anything live (day/night emissives, canvas textures, instanced meshes). Night-market street: ~103 meshes → ~10 draws. Traffic fleet: ~70 → 21. Sixteen filler buildings: ~96 → ~12.
- **Instancing**: trees (3 draws per forest tint), pedestrians (1 draw for 22 people, matrices updated in place, zero per-frame allocation).
- **Two render tiers**: desktop gets an EffectComposer chain (GTAO → bloom → grade) capped at **1.5× DPR** (`Post.MAX_DPR`); coarse-pointer / low-memory devices render direct with hardware MSAA and plain 512px PCF shadows.
- **Adaptive quality that survives resizes**: a frame-time EMA sheds the AO pass first, then lowers a *persistent* DPR ceiling — a naive `setPixelRatio` is silently undone by the next mobile URL-bar resize.
- **Accessible game UI**: aria-live announcements for game state, keyboard-complete flow (drive → open card → Enter opens the project), WCAG-AA contrast tokens, honored `prefers-reduced-motion`, no-WebGL and no-JS fallbacks.

### Controls

| | Desktop | Mobile |
|---|---|---|
| Drive | Arrows / WASD | Joystick |
| **Autopilot to a project** | Tap a tracker/map dot | Tap a tracker/map dot |
| Take back control | Touch the controls | Touch the controls |
| Open the project at a landmark | **T** / E / Enter | Action button |
| Switch vehicle (kart ↔ UBike) | **V** | Top-bar button |
| Horn / bike bell | **B** | 🔔 button |
| Day ↔ night | **N** / top-bar ☀🌙 | Top-bar ☀🌙 |
| Dismiss card / cancel autopilot | **Esc** | — |

Autopilot routes the vehicle over a hand-laid waypoint graph (ring, avenues, roundabout, landmark spurs) with a pure-pursuit follower feeding the existing arcade controller — so collisions, camera and vehicle-switching all keep working, and any manual input hands the wheel back instantly. Deep-link straight into a drive with `city.html?goto=<projectId>` (e.g. `city.html?goto=ai-wealth-lab`).

### Debug & QA affordances

- `?shot` — deterministic overview camera, UI hidden. Variants: `?shot=night`, `?shot=play` (gameplay framing), `?shot=hero`, `?shot=lm:<projectId>[,night]` (frame any landmark). Every screenshot in the case study was captured through these.
- `window.__city` (dev builds) — live handles to the engine, controller, world and day/night systems for console inspection and `renderer.info` measurements.

### Architecture

`src/projects/projects.data.js` is the single source of truth: each project entry declares its landmark builder, world position, proximity radius, accent and card copy — the world generator, HUD, minimap, visit tracker and guide arrow all derive from it.

```
src/
  core/      renderer tiers, camera rig, post pipeline, day/night, synth audio
  world/     island layout + procedural factories (landmarks, buildings, traffic, trees)
  vehicle/   arcade controller with per-vehicle presets (kart, YouBike)
  ui/        DOM overlay: HUD, minimap, intro dialog, loader
  projects/  registry, proximity system (hysteresis + neighbor hand-off), guide arrow
```

## Featured projects (the landmarks)

| Project | What it is | Link |
|---|---|---|
| Portfolio City | This repo's 3D mode — see the [case study](https://orosergio.github.io/Portfolio/case-portfolio-city.html) | [Live](https://orosergio.github.io/Portfolio/city.html) |
| Pattern Journal | AI journaling — pattern detection, sentiment charts, weekly reports | [Live](https://pattern-journal.vercel.app) |
| AI Wealth Lab | Regime-aware RL wealth simulator (HMM regimes, no-lookahead backtests) | [Repo](https://github.com/Orosergio/RegimeAwareGBWM) |
| OpenClaw Mission | Telegram-native AI pipeline → static HTML artifacts | [Case study](https://orosergio.github.io/Portfolio/case-openclaw.html) |
| Kiniela Mundial | Private World Cup pool — server-side scoring, live sync, DB triggers | [Repo](https://github.com/Orosergio/KinielaFulbrings) |
| Finger Mouse | BLE HID firmware, nRF52840 wearable mouse (Zephyr, MCUboot DFU) | Private |
| Oro RealState | Rental operations dashboard | [Live](https://oro-real-state.vercel.app/) |
| Milingua / Inmob | Mobile translation foundation / recovered rental platform | Private / archive |

## Run locally

Requires Node 22+.

```bash
npm ci
npm run dev      # http://localhost:5173
npm run build    # → dist/
npm run preview  # serve the production build
```

## Deploy

One `dist/` serves both hosts (relative `base: './'`):

- **GitHub Pages** — push to `main`; [`.github/workflows/deploy.yml`](./.github/workflows/deploy.yml) builds and publishes (Pages source = *GitHub Actions*).
- **Netlify** — `netlify.toml` (`npm run build` → publish `dist`).

`city.html` is the Vite-built 3D experience. `classic.html`, the case studies, `resume.html` and the legacy `visual-campaign-board-*.html` artifacts are self-contained static pages copied through verbatim, so their URLs are stable and they need no build step.

---

**Sergio Orozco** — Software Engineer · Taipei, Taiwan · open to SWE roles, Summer '26
[GitHub](https://github.com/Orosergio) · [LinkedIn](https://www.linkedin.com/in/orosergioo) · orosergioo@gmail.com
