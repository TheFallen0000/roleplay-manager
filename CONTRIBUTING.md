# Contributing to roleplay-manager

Thank you for your interest in contributing! This document explains how to
set up the project locally, run the tests, and submit a pull request.

## License

By contributing, you agree that your contributions will be licensed under
the **GNU Affero General Public License v3.0 or later** (AGPL-3.0-or-later).
See [LICENSE](./LICENSE) for the full text.

## Code of conduct

Be respectful and constructive. This is a community project.

## Prerequisites

- **Node.js** ≥ 22.12.0
- **pnpm** ≥ 11.15.1 (install via `corepack enable && corepack prepare pnpm@11.21.0 --activate`)
- A POSIX shell (Linux, macOS, or WSL on Windows). The repo includes
  Windows `.bat` scripts for end users, but the dev workflow assumes a
  POSIX shell.

## Quick start

```bash
# 1. Install dependencies
pnpm install

# 2. Run all quality checks (architecture, types, lint, tests)
pnpm check

# 3. Start the dev servers (backend on :3001, frontend on :4321)
pnpm dev
```

Open <http://localhost:4321> in your browser.

## Project layout

This is a pnpm + turbo monorepo with four packages:

| Package | Purpose |
|---|---|
| `packages/backend`  | Express + Drizzle + SQLite. Hexagonal architecture. |
| `packages/frontend` | Astro + React + shadcn/ui. Talks to the backend via REST + SSE. |
| `packages/shared`   | Pure TypeScript types and framework-agnostic helpers. |
| `packages/ui`       | Reusable shadcn/ui components. |

See [AGENTS.md](./AGENTS.md) for the architecture rules, naming
conventions, and quality gates enforced by `pnpm check:arch`.

## Common scripts

| Script | What it does |
|---|---|
| `pnpm dev`           | Run all packages in dev mode (watch + HMR). |
| `pnpm build`         | Build all packages for production. |
| `pnpm check`         | Architecture check + typecheck + lint. |
| `pnpm check:arch`    | Just the architecture check. |
| `pnpm typecheck`     | Just the typecheck. |
| `pnpm lint`          | Just the lint. |
| `pnpm format`        | Run Prettier on the whole repo. |
| `pnpm --filter @workspace/backend test` | Run the backend test suite (Vitest). |

## Testing

Tests live next to the code they exercise (`*.test.ts` files). The backend
uses [Vitest](https://vitest.dev/). To run a single test file:

```bash
pnpm --filter @workspace/backend test -- src/path/to/file.test.ts
```

When adding a new use case, add a `*.test.ts` next to it that mocks the
domain ports. See the existing tests for examples.

## Submitting a pull request

1. **Fork** the repository and create a branch from `master`:
   ```bash
   git checkout -b feat/my-feature
   ```
2. **Make your changes**. Keep commits small and descriptive. Use
   conventional prefixes: `feat:`, `fix:`, `refactor:`, `docs:`,
   `chore:`, `test:`.
3. **Run all checks** before pushing:
   ```bash
   pnpm check
   ```
4. **Push your branch** and open a pull request against `master`.
5. **Describe your change** in the PR description:
   - What does it do?
   - Why is it needed?
   - How did you test it?
   - Any breaking changes?

The CI will run `pnpm check` on every push. PRs with failing checks will
not be merged.

## Reporting bugs

Open an issue with:

- A clear title and description.
- Steps to reproduce.
- Expected vs. actual behavior.
- Your operating system and Node.js version (`node --version`).
- Relevant logs or screenshots.

## Suggesting features

Open an issue with the `enhancement` label. Describe the use case, not
just the solution — what problem are you trying to solve?

## Questions?

Open a discussion or issue. There's no dedicated chat at the moment.
