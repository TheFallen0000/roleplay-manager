# AGENTS.md

Conventions and architecture rules for the **roleplay-manager** monorepo. This file is the source of truth for AI agents and human contributors — when in doubt, follow what is enforced by `pnpm check:arch` and described here.

---

## 1. Project overview

A roleplay conversation manager with a Node/Express backend, an Astro+React frontend, and shared TypeScript types. Built as a pnpm + turbo monorepo with four packages:

| Package | Purpose |
|---|---|
| `packages/backend` | HTTP API (Express) + business logic. Hexagonal architecture. |
| `packages/frontend` | Astro pages + React components. Talks to the backend via REST + SSE. |
| `packages/shared` | Pure TypeScript types and framework-agnostic helpers (`ooc-parser`). |
| `packages/ui` | Reusable shadcn/ui components (button, dialog, etc.). |

**Node**: ≥ 22.12.0. **Package manager**: pnpm 11.21.0. **Build orchestrator**: turbo 2.x.

---

## 2. Backend architecture (hexagonal)

The backend follows a strict three-layer hexagonal architecture. Dependencies only point inward.

```
infrastructure/ ──→ application/ ──→ domain/
       │                  │                ▲
       └──────────────────┴────────────────┘
                   (depends on)
```

### `domain/` — pure business core

- `entities/`: domain entities with factory methods (`create`, `reconstruct`) and explicit getters/setters. No setters that mutate state — return new instances.
- `ports/`: interfaces that the rest of the system depends on. Examples: `ConversationRepository`, `MessageRepository`, `ProviderPort`, `Logger`.
- `value-objects/`: immutable value objects (e.g. `PromptContext`, `GeneratedResponse`).
- **Rule**: `domain/` **must not** import from `application/`, `infrastructure/`, or `containers/`. Enforced by `pnpm check:arch`.

### `application/` — use cases

- `use-cases/<area>/<verb-noun>.use-case.ts`: one class per use case (`XxxUseCase`), named `<verb-noun>.use-case.ts`.
- Use cases orchestrate domain entities and call ports to fetch/persist state.
- A use case returns a DTO or a discriminated union (`{ summary } | { error }`) — it does not throw for expected business outcomes; it throws for invariant violations.
- **Rule**: `application/` **must not** import from `infrastructure/` or `containers/`. Tests (`*.test.ts`) are exempt because they use `as Type` casts for mocks.

#### Known smell: `error-handler` import

`application/use-cases/**` import error classes from `infrastructure/adapters/primary/middlewares/error-handler`. This is reported as a **warning** by `pnpm check:arch`, not a failure. The long-term fix is to move domain errors into `domain/errors.ts`. Tracked but not blocking.

### `infrastructure/` — adapters

- `adapters/primary/`: HTTP-facing code (Express routes, middlewares, error handler).
- `adapters/secondary/`: outbound integrations (Drizzle repos, provider registry, logger).
  - `drizzle/repositories/`: `Drizzle*Repository implements XxxRepository`.
  - `drizzle/schema/`: Drizzle table definitions.
  - `providers/`: LLM provider adapters (`OpenAICompatibleAdapter`, `OllamaAdapter`, `ProviderRegistry`).
- `config/`: configuration factories (logger, etc.).
- `database/`: Drizzle config, migrations, meta snapshots.

### `containers/` — composition root

- `app-container.ts`: instantiates repositories, providers, and use cases, then exposes them as a typed object. The only place where `infrastructure/` and `application/` are wired together.

---

## 3. Frontend architecture

The frontend has a clear split between framework-agnostic logic and React/Astro code. The `lib/api/` and `lib/format-*.ts` files must be **importable in a Node test or SSR context without React** — this is what `pnpm check:arch` enforces.

```
pages/ (Astro) ─→ components/ (React) ─→ lib/
                                       ├── api/        ← pure fetch + types
                                       ├── format-*.ts ← pure formatters
                                       ├── hooks/      ← React hooks allowed
                                       └── stores/     ← zustand allowed
```

### `lib/api/`

- One file per backend resource: `conversations.ts`, `summaries.ts`, `memories.ts`, etc.
- Exports plain async functions that return DTOs (typed against `@workspace/shared/types`).
- **Rule**: must not import from `react`, `@astrojs/*`, `lucide-react`, `@workspace/ui`, `zustand`, or `next/*`. Enforced by `pnpm check:arch`.
- The shared `apiRequest` helper lives in `lib/api/client.ts`.

### `lib/format-*.ts`

- Pure formatters (date, message, etc.). No React, no UI.
- **Rule**: same as `lib/api/`.

### `lib/stores/`

- zustand stores (`chat.store.ts`, `summary.store.ts`, `memory.store.ts`).
- One store per resource. Stores call `lib/api/` and expose reactive selectors.

### `lib/hooks/`

- **Generic** React hooks that do **not** know about any feature: contexts
  (`use-theme`, `use-translation`), utilities (`use-persisted-value`,
  `use-persisted-string-list`) and gestures (`use-swipe-navigation`).
- The providers that back those contexts (`theme-provider.tsx`,
  `i18n-provider.tsx`) live here too.
- **Rule**: they may import from `react`, `@workspace/*` and other `lib/` modules,
  but **not** from `lib/stores/**`, `lib/api/**`, `components/**` or `pages/**`.
  Enforced by `pnpm check:arch`.
- **Feature hooks** (state + API calls for one screen) live next to their
  components: `components/<feature>/use-<kebab>.ts` (e.g.
  `components/character/use-character-form.ts`).

### `components/`

- React components, organized by feature (`conversation/`, `character/`, `summary/`, `provider/`, `memory/`, `layout/`).
- Use shadcn primitives from `@workspace/ui`.
- Feature hooks live here (`use-character-list.ts`, `use-chat-streaming.ts`).
- **Rule**: every file must be imported by something (tests do not count as
  references). Enforced by `pnpm check:arch`.

### `pages/`

- Astro pages (`.astro`) that compose components and handle routing.

### Size limit

- **Rule**: no file under `packages/frontend/src/**` may exceed **500 lines** (`.ts`, `.tsx`, `.astro`). Enforced by `pnpm check:arch`. Split large components into smaller ones (extract dialogs, hooks, subcomponents).

---

## 4. Shared package

- `packages/shared/src/types/`: pure TypeScript types and DTOs. Used by both backend and frontend.
- `packages/shared/src/lib/`: framework-agnostic helpers (e.g. `ooc-parser` for out-of-character tag parsing).
- **Rule**: `shared/` **must not** import from `react`, `@astrojs/*`, `lucide-react`, `@workspace/ui`, `zustand`, `next/*`, `express`, `drizzle-orm`, `axios`, or `better-sqlite3`. Enforced by `pnpm check:arch`.

---

## 5. Naming conventions

### Backend

| Kind | Pattern | Example |
|---|---|---|
| Use case class | `<Verb><Noun>UseCase` | `SendMessageUseCase` |
| Use case file | `<verb-noun>.use-case.ts` | `send-message.use-case.ts` |
| Repository interface | `<Resource>Repository` | `SummaryRepository` |
| Drizzle repository impl | `Drizzle<Resource>Repository` | `DrizzleSummaryRepository` |
| Domain entity | `<Noun>` (PascalCase, no suffix) | `Conversation`, `Message` |
| Entity factory | `static create(props)` and `static reconstruct(props)` | — |
| HTTP route file | `<resource>.routes.ts` | `conversation.routes.ts` |

### Frontend

| Kind | Pattern | Example |
|---|---|---|
| React component file | `<kebab-case>.tsx` | `summary-viewer.tsx` |
| React component | PascalCase export | `export function SummaryViewer()` |
| API function | `<verb><Noun>` (camelCase) | `listSummaries`, `setConversationTitle` |
| Store | `use<Resource>Store` (zustand) | `useSummaryStore` |
| Hook (file / export) | `use-<kebab>.ts` / `use<PascalCase>` | `use-persisted-value.ts` / `usePersistedValue` |
| Formatter | `<verb>-<object>.ts` | `format-message.ts` |

### Shared

| Kind | Pattern | Example |
|---|---|---|
| Type module | `<resource>.ts` (lowercase, singular) | `conversation.ts` |
| Type export | PascalCase | `ConversationDetail`, `SummaryDTO` |
| DTO suffix | `DTO` (data transfer object) | `MessageDTO`, `SummaryDTO` |
| Input suffix | `Input` | `CreateConversationInput` |

---

## 6. Quality gates

### `pnpm check:arch`

Runs `scripts/architecture-check.mjs`. Verifies:

1. **Frontend size** — no file over 500 lines in `packages/frontend/src/**`.
2. **Backend hexagonal** — `domain/` and `application/` purity. Allowed exception: `application/**` may import `infrastructure/adapters/primary/middlewares/error-handler` (warning only).
3. **Frontend lib/ agnostic** — `lib/api/**` and `lib/format-*.ts` may not import from React/UI/zustand.
4. **shared/ package purity** — no runtime imports from React/DB/UI.
5. **Frontend `lib/hooks/` agnostic** — generic hooks may not import `lib/stores/**`, `lib/api/**`, `components/**` or `pages/**` (feature hooks live in `components/<feature>/`).
6. **Frontend dead files** — every file under `components/` and `lib/` must be imported by something; test files do not count as references.

Exits 1 on any failure, 0 on success.

### `pnpm check`

Runs `check:arch` + `turbo typecheck` + `turbo lint` across all packages. Use this before pushing.

### Pre-commit hook

`.husky/pre-commit` runs `pnpm check:arch`. To skip: `git commit --no-verify` (use sparingly).

---

## 7. Common pitfalls

- **Don't import from `infrastructure/` in use cases.** Use a port (`domain/ports/`) and have the container wire the implementation. The exception is the error-handler smell described above.
- **Don't put React in `lib/api/` or `lib/format-*`.** If you need a hook, move the API call into `lib/hooks/` or call the API function from inside the component.
- **Don't put runtime imports in `shared/`.** If you need to compute a value, return a function or pure data; do not import `drizzle-orm` or `react`.
- **Don't let components exceed 500 lines.** Extract subcomponents, dialogs, or hooks.
- **Don't mutate domain entities.** Return new instances via factory methods or `withX()` helpers.

---

## 8. Adding a new resource

When adding a new resource (e.g. `Bookmark`):

1. **Shared types** — `packages/shared/src/types/bookmark.ts` with `BookmarkDTO`, etc. Re-export from `index.ts`.
2. **Domain** — `Bookmark` entity in `domain/entities/`, `BookmarkRepository` port in `domain/ports/`.
3. **Application** — use cases in `application/use-cases/bookmark/`.
4. **Infrastructure** — Drizzle schema in `drizzle/schema/`, `DrizzleBookmarkRepository` in `drizzle/repositories/`. Add a route file in `adapters/primary/routes/`.
5. **Container** — wire it in `containers/app-container.ts`.
6. **Frontend API** — `lib/api/bookmarks.ts` (pure functions).
7. **Frontend store** (if needed) — `lib/stores/bookmark.store.ts` (zustand).
8. **Frontend components** — `components/bookmark/`.
9. **Tests** — one `*.test.ts` next to each use case, mocking ports.
10. **Run** `pnpm check` to verify everything passes.

---

## 9. Slice workflow (plan → implement → release)

Every non-trivial task is delivered as a **slice** (`SX`) with the same lifecycle. Follow it unless the user explicitly says otherwise.

### Plan first

- **Ask when in doubt.** If scope, UX or architecture choices are ambiguous, use the `ask`/question tool before planning — do not guess.
- Present a plan for approval. It must include the scope, the areas touched, a **version bump**, a **CHANGELOG entry**, and a **new slice doc**. Call out anything deferred or out of scope.

### Slice doc

- Create `docs/10-slices/SX-progress.md` (`SX` = next slice number) documenting:
  - **Descripción** — what the slice delivers and why.
  - **Decisions** — the choices taken and their rationale (including what is out of scope).
  - **Criterios de aceptación** — the checklist that defines "done".
  - **Commits** — the list of commits for the slice.
- Use the most recent `S*-progress.md` as the template.

### Backlog

- `docs/10-slices/PM-backlog.md` is the source of deferred work. When a slice completes a PM, mark its row and add a `> **PM.X (SX) — done (date, vX.Y.Z)**` note pointing to the slice doc. When deferring a PM, add a note with the rationale and what would be needed to pick it up.

### Version bump + CHANGELOG

- Bump the root `package.json` version following semver: **minor** for features, **patch** for fixes, **major** for breaking changes.
- Add the entry to `CHANGELOG.md` under the new version in [Keep a Changelog](https://keepachangelog.com/) format (`Added` / `Changed` / `Fixed` / `Removed`).

### Commits

- When asked to commit, keep commits **small and descriptive**, in conventional-commit style (`feat(scope): …`, `fix(scope): …`, `test(scope): …`, `docs(scope): …`, `release: …`).
- Typical sequence: shared types → backend → ui → frontend → tests → docs/backlog → release (bump + changelog).
