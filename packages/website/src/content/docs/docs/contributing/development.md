---
title: Development
description: Run the Roleplay Manager monorepo, tests and quality gates.
---

## Requirements

- Node.js ≥ 22.23.4 (the repository pins 24.22.1 in `.nvmrc`).
- pnpm ≥ 11.15.1. The install script can enable it with corepack.

## Run the app

```bash
./scripts/install.sh
./scripts/start.sh
```

On Windows:

```bat
scripts\install.bat
scripts\start.bat
```

The frontend runs at `http://localhost:4321` and proxies `/api` to the backend
at `http://localhost:3001`.

Manual install:

```bash
corepack enable
corepack prepare pnpm@11.21.0 --activate
pnpm install
pnpm dev
```

## Quality gates

```bash
pnpm check:arch   # architecture rules
pnpm check        # architecture + typecheck + lint
pnpm --filter @workspace/backend test
pnpm --filter @workspace/frontend exec vitest run
```

`pnpm check:arch` verifies the frontend size limit, backend hexagonal
boundaries, frontend `lib/` purity, shared package purity, generic hooks, dead
files and feature isolation. Read `AGENTS.md` for the full rules.

## Structure

| Package             | Purpose                                                 |
| ------------------- | ------------------------------------------------------- |
| `packages/backend`  | Express + Drizzle + SQLite API. Hexagonal architecture. |
| `packages/frontend` | Astro + React UI.                                       |
| `packages/shared`   | Types and framework-agnostic helpers.                   |
| `packages/ui`       | Reusable shadcn/ui components.                          |
| `packages/website`  | This public site (Astro + Starlight).                   |

## Contributing

Read `CONTRIBUTING.md` and open a pull request. `master` is protected; CI must
pass before merging. Use conventional commits and keep changes small.

- [Repository](https://github.com/TheFallen0000/roleplay-manager)
- [Contributing guide](https://github.com/TheFallen0000/roleplay-manager/blob/master/CONTRIBUTING.md)
- [License](https://github.com/TheFallen0000/roleplay-manager/blob/master/LICENSE)
