<div align="center">

**English** · [Español](README.es.md)

<img src="packages/frontend/public/brand/mascot-192.png" alt="Roleplay Manager mascot holding an RM sign" width="150" />

# Roleplay Manager

### A local-first roleplay chat manager for your own AI models.

Versioned characters, streaming conversations, dynamic memory and summaries — all on your PC, with no accounts and no cloud.

[![License: AGPL-3.0-or-later](https://img.shields.io/badge/license-AGPL--3.0--or--later-663399?style=flat-square)](LICENSE)
[![Latest release](https://img.shields.io/github/v/release/TheFallen0000/roleplay-manager?style=flat-square&color=2ea44f)](https://github.com/TheFallen0000/roleplay-manager/releases/latest)
[![Release workflow](https://img.shields.io/github/actions/workflow/status/TheFallen0000/roleplay-manager/release.yml?branch=master&style=flat-square&label=release)](https://github.com/TheFallen0000/roleplay-manager/actions/workflows/release.yml)
[![Platforms](https://img.shields.io/badge/platforms-Windows%20%7C%20Linux%20%7C%20macOS-blue?style=flat-square)](#install)
[![Node.js 22.12+](https://img.shields.io/badge/Node.js-22.12%2B-339933?style=flat-square&logo=nodedotjs&logoColor=white)](https://nodejs.org/)

[Install](#install) · [Features](#features) · [Development](#development) · [Phone access](#phone-access) · [Updates](#updates) · [Documentation](#documentation) · [License](#license)

</div>

---

Roleplay Manager is a self-hosted app for long roleplay conversations with AI
characters. Your characters, chats, memories, summaries and images live in a
local SQLite database under `data/`, and the app talks to the AI provider
**you** choose: a local [Ollama](https://ollama.com/) instance or any
OpenAI-compatible endpoint with your own API key. There is no account, no login
and nothing is sent to a service we control.

## Features

- **Versioned characters** — profile, description, greeting, cards and images;
  every edit creates a new version. Import/export characters and apply settings
  templates.
- **Streaming chat** — replies arrive token by token. Edit and regenerate
  responses, rewind the conversation, and branch the story into alternative
  timelines.
- **Memory and summaries** — dynamic per-character memory with decay, automatic
  conversation summaries, and a prompt-context preview to see exactly what the
  model will receive.
- **Your provider, your data** — Ollama or any OpenAI-compatible API, local or
  remote, with your own key. Model and connection are configured in the app.
- **Built for long sessions** — themes and colour palettes (light/dark),
  responsive layout for desktop and phone, Markdown rendering, out-of-character
  tags and swipe navigation between alternatives.
- **English and Spanish UI.**
- **Optional phone access** — share the app over your private Tailscale network
  or your home Wi-Fi, scan a QR code and use it from your phone. Installs as a
  PWA with its own icon and window.
- **Portable builds with in-app updates** — Windows, Linux and macOS packages
  with a bundled Node runtime (nothing to install). Updates download from GitHub
  Releases into versioned folders, with a backup first and the previous version
  kept for rollback.
- **Local-first, no accounts** — no login, no telemetry, no cloud.

## Install

Download the package for your system from the
[latest release](https://github.com/TheFallen0000/roleplay-manager/releases/latest):

| System | Package |
|---|---|
| Windows (x64) | `roleplay-manager-<version>-win-x64.zip` |
| Linux (x64 / arm64) | `roleplay-manager-<version>-linux-<arch>.tar.gz` |
| macOS (Apple Silicon / Intel) | `roleplay-manager-<version>-mac-<arch>.tar.gz` |

1. Unpack it wherever you want to keep it (for example, Documents).
2. Run `start.cmd` (Windows) or `./start.sh` (Linux/macOS).
3. The browser opens at <http://localhost:3001> when the app is ready.

Node.js is **not** required: the runtime is bundled. Your content lives in the
`data/` folder inside that directory, and updates never touch it.

> On macOS the bundled runtime is not signed, so Gatekeeper may block the first
> launch; allow it in *System Settings → Privacy & Security* or run
> `xattr -dr com.apple.quarantine .` inside the folder. The bundled `README.txt`
> explains it in both languages.

## Development

### Requirements

- **Node.js** ≥ 22.12.0
- **pnpm** ≥ 11.15.1 (the install script can set it up through corepack)

### Install and run

**Linux / macOS:**

```bash
./scripts/install.sh
./scripts/start.sh
```

**Windows:**

```bat
scripts\install.bat
scripts\start.bat
```

The frontend runs on <http://localhost:4321> and proxies `/api` to the backend
on <http://localhost:3001>. Press `Ctrl+C` to stop.

Manual install:

```bash
corepack enable
corepack prepare pnpm@11.21.0 --activate
pnpm install
pnpm dev
```

### Project layout

pnpm + turbo monorepo with four packages:

| Package | Purpose |
|---|---|
| `packages/backend` | Express + Drizzle + SQLite. Hexagonal architecture. |
| `packages/frontend` | Astro + React + shadcn/ui. Talks to the backend via REST + SSE. |
| `packages/shared` | Pure TypeScript types and framework-agnostic helpers. |
| `packages/ui` | Reusable shadcn/ui components. |

### Common scripts

| Script | What it does |
|---|---|
| `pnpm dev` | Run all packages in dev mode (watch + HMR). |
| `pnpm build` | Build all packages for production. |
| `pnpm check` | Architecture check + typecheck + lint. |
| `pnpm check:arch` | Just the architecture check (7 rules, see `AGENTS.md`). |
| `pnpm typecheck` / `pnpm lint` / `pnpm format` | Typecheck, lint, or Prettier. |
| `pnpm --filter @workspace/backend test` | Backend test suite (Vitest). |
| `pnpm --filter @workspace/frontend exec vitest run` | Frontend test suite. |
| `pnpm brand:generate` | Regenerate the brand images from `docs/brand/logo-source.png`. |
| `pnpm package:app` | Build the portable package for the current platform. |

### Configuring an AI provider

1. Start the app and open **System → Providers** in the sidebar.
2. Add an instance: a local Ollama (`http://localhost:11434`) or an
   OpenAI-compatible endpoint (URL + API key).
3. Use **Test connection** to verify it, then pick the default model.

## Phone access

Open **Phone** in the menu bar and pick a mode:

- **Tailscale** — shares the app on your private tailnet
  (`https://<machine>.<tailnet>.ts.net`). Nothing is exposed to the internet.
- **Home network (LAN)** — shares the app on your Wi-Fi
  (`http://<private-ip>:4322`).

Both show a QR code to open on your phone. The *Link settings* section can turn
the link on when the app starts, cut it when the app closes (Tailscale) and
auto-disable it after 15–120 minutes without use from the phone. On Android and
iOS the app can be installed to the home screen as a PWA.

## Updates

The packaged app checks [GitHub Releases](https://github.com/TheFallen0000/roleplay-manager/releases)
from **System → Updates**. Applying an update creates a backup, downloads the
package for your OS into `versions/<version>/`, switches the `current` pointer
and offers a **Restart now** button; your `data/` and `backups/` are untouched
and the previous version stays on disk.

## Documentation

- [AGENTS.md](AGENTS.md) — architecture rules, naming conventions and the
  quality gates enforced by `pnpm check:arch`.
- [CONTRIBUTING.md](CONTRIBUTING.md) — how to set up the repo, run the tests and
  submit a pull request.
- [PRODUCT.md](PRODUCT.md) — product definition: users, purpose, positioning.
- [docs/07-technical-architecture.md](docs/07-technical-architecture.md) —
  how the backend and the frontend fit together.
- [docs/10-slices/](docs/10-slices) — the development log, one folder per
  delivered slice.
- [docs/packaging-opt.md](docs/packaging-opt.md) and
  [docs/remote-access-opt.md](docs/remote-access-opt.md) — design notes for the
  portable packages/updater and for phone access.

## License

This project is licensed under the **GNU Affero General Public License v3.0 or
later** (AGPL-3.0-or-later) — see [LICENSE](LICENSE). In practice:

- ✅ Use it for free, for any purpose, and modify the source.
- ✅ Redistribute it or your modifications.
- ❌ You **cannot** ship modified closed-source versions: anything you
  distribute (including a hosted service) must stay open source under the same
  license, with the source available to its users.

## Contributing

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for the
development setup, tests and pull-request flow. By contributing, you agree that
your contributions are licensed under the AGPL v3 (or later).

## Reporting bugs and requesting features

Open an [issue](https://github.com/TheFallen0000/roleplay-manager/issues) with:

- A clear title and description.
- Steps to reproduce (for bugs) and the expected vs. actual behaviour.
- Your operating system, the app version and your Node.js version
  (`node --version`) if you run it from source.
- Relevant logs or screenshots.
