# Sergio Orozco — Portfolio

Two front doors, one codebase:

- **[Classic](https://orosergio.github.io/Portfolio/)** — the default professional hub: selected work with measured evidence, engineering case studies, and a printable [résumé](https://orosergio.github.io/Portfolio/resume.html).
- **[Portfolio City](https://orosergio.github.io/Portfolio/city.html)** — an optional procedural, drivable isometric 3D city (three.js, no framework). Each of the 8 landmarks — Tokyo Tower, Taipei 101, the Raohe night market… — hosts one real project.

Deep dives: **[A city in 266 draw calls](https://orosergio.github.io/Portfolio/case-portfolio-city.html)** (graphics/perf/a11y) · **[OpenClaw](https://orosergio.github.io/Portfolio/case-openclaw.html)** (systems).

---

## The 3D city: September 2026 revision

The default renderer is direct WebGL2 with hardware antialiasing. Desktop starts at Balanced (1.5 million pixel budget); touch/low-memory devices start at Performance (900,000 pixels). Auto drops quality after sustained slow frames and has a 500,000-pixel fallback. Resize and monitor changes preserve the budget.

Detail is opt-in and lazy-loads bloom + tone mapping. GTAO and the separate grading pass have been removed. Shadows update at 15 Hz in Balanced, the minimap at 10 Hz, and ambient rendering at 30 Hz. Active driving targets 60 Hz. Cards and help pause simulation and rendering until interaction; hidden tabs stop the loop entirely.

A short local browser comparison at 1440 × 900 on the same route measured **36.9 → 54.5 rendered FPS**. This compares the old and new default experiences, including their camera framing; it is not a cross-device benchmark. See [the review](./PERFORMANCE-REVIEW.md) for methodology, sources and limitations. The July isolated-scene counts in the case study remain historical measurements.

Classic keeps content readable without JavaScript, places real imagery and technical case studies above the fold, and exposes the résumé and source directly.

### Controls

| | Desktop | Mobile |
|---|---|---|
| Drive | Arrows / WASD | Joystick |
| **Autopilot to a project** | Tap a tracker/map dot | Tap a tracker/map dot |
| Take back control | Touch the controls | Touch the controls |
| Open the project at a landmark | **T** / E / Enter | Action button |
| Switch vehicle (kart ↔ UBike) | **V** | Top-bar button |
| Horn / bike bell | **B** | 🔔 button |
| Overview ↔ follow camera | **O** / Overview | Overview button |
| Recover the vehicle | **R** / Reset | Reset button |
| Graphics quality | Auto / Performance / Detail | Same selector |
| Day ↔ night | **N** / top-bar ☀🌙 | Top-bar ☀🌙 |
| Dismiss card / cancel autopilot | **Esc** | — |

Autopilot routes the vehicle over a hand-laid waypoint graph (ring, avenues, roundabout, landmark spurs) with a pure-pursuit follower feeding the existing arcade controller — so collisions, camera and vehicle-switching all keep working, and any manual input hands the wheel back instantly. Deep-link straight into a drive with `city.html?goto=<projectId>` (e.g. `city.html?goto=ai-wealth-lab`).

### Debug & QA affordances

- `?shot` — deterministic overview camera, UI hidden. Variants: `?shot=night`, `?shot=play` (gameplay framing), `?shot=hero`, `?shot=lm:<projectId>[,night]` (frame any landmark). Every screenshot in the case study was captured through these.
- `window.__city` (dev builds) — live handles to the engine, controller, quality, frame stats, world and day/night systems for console inspection and `renderer.info` measurements.

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
npm test         # regression checks
npm run build    # → dist/
npm run preview  # serve the production build
```

## Deploy

One `dist/` serves both hosts (relative `base: './'`):

- **GitHub Pages** — push to `main`; [`.github/workflows/deploy.yml`](./.github/workflows/deploy.yml) builds and publishes (Pages source = *GitHub Actions*).
- **Netlify** — `netlify.toml` (`npm run build` → publish `dist`).

`city.html` is the Vite-built 3D experience. `classic.html`, the case studies, `resume.html` and the legacy `visual-campaign-board-*.html` artifacts are self-contained static pages copied through verbatim, so their URLs are stable and they need no build step.

---

**Sergio Orozco** — Software Engineer · Taipei, Taiwan · open to SWE roles
[GitHub](https://github.com/Orosergio) · [LinkedIn](https://www.linkedin.com/in/orosergioo) · orosergioo@gmail.com
