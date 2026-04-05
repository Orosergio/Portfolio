# OpenClaw Visual Workflow System

**Telegram → AI → Structured JSON → Rendered Visual Board**

A self-hosted AI workflow system that converts natural-language Telegram messages into structured, reusable visual artifacts — deployed on a hardened Linux VPS.

---

## 繁體中文

這是一個自架的 AI 工作流系統，透過 Telegram 傳送自然語言指令，  
系統自動生成結構化 JSON，再渲染成可重複使用的視覺化輸出（HTML campaign boards）。  
部署於 Hetzner VPS（Ubuntu 24.04），具備 SSH 強化、UFW 防火牆與 systemd 服務管理。

---

## What this system does

1. User sends a product or campaign brief via Telegram
2. OpenClaw routes the request through an AI workflow (OpenAI Codex)
3. The agent outputs structured JSON — campaign title, positioning, audience, key message, CTA, color palette, image prompt
4. A Python renderer converts the JSON into a premium HTML visual board
5. The board is saved as a reusable artifact and served locally via HTTP

No manual formatting. No copy-paste. One input, one complete visual output.

---

## Live demos

| Board | Type | Link |
|-------|------|-------|
| Soft Pink Bouquet | Campaign Board | [View](https://orosergio.github.io/Portfolio/visual-campaign-board-soft-pink-bouquet-2026-04-03-premium.html) |
| Pattern Recognition Journaling App | Product Board | [View](https://orosergio.github.io/Portfolio/visual-campaign-board-pattern-recognition-journaling-app-2026-04-05-premium.html) |
| Founder Copilot for Telegram | Operator Board | [View](https://orosergio.github.io/Portfolio/visual-campaign-board-founder-copilot-for-telegram-2026-04-05-premium.html) |

→ **[See full portfolio index](./index.html)**

---

## Stack

| Layer | Technology |
|-------|-----------|
| Infrastructure | Hetzner Cloud VPS · Ubuntu 24.04 · Singapore region |
| Security | UFW firewall · SSH key-only auth · sshlogin group allowlist · root password locked |
| Service management | systemd daemon · auto-restart on reboot |
| AI orchestration | OpenClaw · OpenAI Codex (OAuth) |
| Channel | Telegram Bot API (`@Openclaw_enrique_bot`) |
| Rendering | Python 3 · HTTP server · custom HTML/CSS renderer |
| Hosting | GitHub Pages |
| Version control | Git · GitHub |

---

## Architecture

```
Telegram message
      ↓
OpenClaw gateway (127.0.0.1:18789, systemd-managed)
      ↓
AI workflow (OpenAI Codex via OAuth)
      ↓
Structured JSON artifact (saved to /workspace/content/)
      ↓
Python renderer → premium HTML board
      ↓
GitHub Pages (public) / local HTTP server (preview)
```

---

## What I learned building this

- Deploying and hardening a Linux VPS from scratch (SSH keys, UFW, sshlogin groups, prohibit-password root)
- Managing background services with systemd (auto-start, status checks, log tailing)
- Designing AI workflows that produce structured, reusable outputs — not just chat responses
- Bridging a headless VPS OAuth flow by manually handling the callback redirect
- Building a rendering pipeline that separates data (JSON) from presentation (HTML/CSS)

---

## Repo structure

```
portfolio/
├── index.html                          ← Portfolio landing page
├── visual-campaign-board-*.html        ← Generated visual boards
└── README.md
```

---

## Author

**Yavhé Sergio Orozco**  
Software Developer · Taipei, Taiwan  
[GitHub](https://github.com/Orosergio) · [LinkedIn](#)

---

*Boards are generated artifacts — not hand-coded. The system that produced them is the project.*
