# Sergio Orozco — Portfolio City 🏙️

An interactive **isometric 3D city** portfolio with a Tokyo / Taiwan night-market soul: a **Shibuya scramble crossing**, **Tokyo Tower**, a lantern-lit **night market** with a torii gate, and parks. Drive a little cart around the warm low-poly diorama; every glowing tower is a project. Pull up close and a tooltip appears — press **T** to pop a preview card you can click through to the repo or the live app. Toggle **day ↔ night** and follow yourself on a **GTA-style mini-map**.

**Live:** https://orosergio.github.io/Portfolio/ · **Classic text version:** [`classic.html`](./classic.html)

---

## Controls

| | Desktop | Mobile |
|---|---|---|
| Drive | Arrow keys / WASD | On-screen joystick |
| Open a project preview | **T** | Action button |
| Switch driver (Mara / Leo) | Top-right button | Top-right button |
| Toggle day / night | Top-right ☀ / 🌙 button | Top-right ☀ / 🌙 button |

## How it's built

- **Three.js** (vanilla, no framework), bundled with **Vite**.
- Everything is **procedural primitives** — boxes, cylinders, cones — so the whole city re-themes from one [`src/world/palette.js`](./src/world/palette.js) and ships tiny (no 3D model assets).
- Isometric-feel **perspective camera** with critically-damped follow; **hemisphere + key** lighting for the warm flat-shaded look.
- Repeated props (trees, lamps, filler buildings) use **InstancedMesh** — the whole city renders in a few dozen draw calls.
- Arcade **kinematic cart** (no physics engine): speed-scaled steering, soft city bounds, AABB building collision.
- Projects live in one registry — [`src/projects/projects.data.js`](./src/projects/projects.data.js) — that drives both the buildings and the HUD cards.
- Fully **responsive** (keyboard + touch) with a graceful **no-WebGL fallback** to the classic page.

## Featured projects (the buildings)

| Project | What it is | Link |
|---|---|---|
| Pattern Journal | AI journaling — emotional-pattern detection, sentiment charts, weekly reports | [Live](https://pattern-journal.vercel.app) |
| AI Wealth Lab | Regime-aware RL goal-based wealth simulator (HMM regimes, backtests) | [Repo](https://github.com/Orosergio/RegimeAwareGBWM) |
| OpenClaw Mission | Telegram-native AI workflow on a hardened Linux VPS → rendered HTML boards | [Live board](./visual-campaign-board-founder-copilot-for-telegram-2026-04-05-premium.html) |
| Kiniela Mundial | Private World Cup pool — auth, groups, predictions, live score sync | [Repo](https://github.com/Orosergio/KinielaFulbrings) |
| Finger Mouse | BLE HID firmware for an nRF52840 wearable mouse | Private case study |
| Oro RealState | Rental operations dashboard — properties, leases, payments, reminders | [Live](https://oro-real-state.vercel.app/) |
| Milingua | Mobile-first real-time translation for frontline service | Private build |
| Inmob Recovery | Recovered university rental platform (Node / Express / MariaDB) | Archive |

## Run locally

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # → dist/
npm run preview  # serve the production build
```

## Deploy

One `dist/` serves both hosts (relative `base: './'`):

- **GitHub Pages** — pushed to `main`, built and published by [`.github/workflows/deploy.yml`](./.github/workflows/deploy.yml). Set Pages source to *GitHub Actions*.
- **Netlify** — `netlify.toml` (`npm run build` → publish `dist`).

The legacy `visual-campaign-board-*.html` boards and `portfolio-hero.html` are copied through verbatim, so their public URLs keep working.

---

## Author

**Yavhé Sergio Orozco** — Full-stack AI Engineer · Taipei, Taiwan
[GitHub](https://github.com/Orosergio) · [LinkedIn](https://www.linkedin.com/in/orosergioo) · orosergioo@gmail.com
