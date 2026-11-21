---
name: backend-database-review
description: Review or implement the Express + Drizzle + SQLite backend with the repo's hexagonal rules. Use when adding or reviewing use cases, repository ports, Drizzle schemas or migrations, query performance, N+1, pagination, transactions, SQLite pragmas, API error contracts or backend tests.
---

# Backend & database review

Use this skill when a change touches more than a pure function: a new use case,
a repository method, a schema or migration, a query, a transaction, an API route
or an audit of an existing backend area.

## Sources of truth

1. `AGENTS.md` §2 (hexagonal), §5 (naming), §6 (quality gates), §11 (security and
   performance).
2. `docs/08-workflow.md` for the slice lifecycle.
3. The code, tests and `package.json` scripts.
4. `packages/backend/src/infrastructure/adapters/secondary/drizzle/repositories/query-performance.test.ts`
   for the current hot-query baseline.

Do not infer the architecture from this document alone; re-read `AGENTS.md` and
the surrounding code.

## Seven passes

### 1. Layer map

- `domain/` — entities, value objects and ports. No imports from `application/`,
  `infrastructure/` or `containers/`.
- `application/` — use cases and services. Orchestrates ports; no Drizzle,
  Express or container imports. The documented exception is the error-handler
  import (warning in `check:arch`).
- `infrastructure/` — Drizzle repositories, provider adapters, routes,
  middlewares and config.
- `containers/app-container.ts` — the only place where implementations are
  wired to use cases.

Check the diff against `pnpm check:arch` before reviewing behaviour.

### 2. Port and repository contract

- The port lives in `domain/ports/<resource>.repository.ts` and speaks domain
  entities, not Drizzle rows.
- The implementation is `Drizzle<Resource>Repository` and maps rows through
  explicit `to<Entity>()` helpers.
- Mutations that affect several tables are one repository operation backed by a
  transaction, not a sequence of calls from the use case.
- A use case must not know about table names, SQL fragments or `crypto` hashes
  that belong to the repository.

### 3. Schema and migrations

- Schema files live in `infrastructure/adapters/secondary/drizzle/schema/`.
- Migrations live in `infrastructure/database/migrations/` with their `meta/`
  snapshots.
- Generate with `db:generate`; review the SQL and the snapshot before applying.
  Never use `db:push` against a database with real data.
- Data backfills need their own migration test (see `migration-0019.test.ts` and
  `migration-0020.test.ts`).
- Check foreign-key order: insert parents before children, update links before
  deleting, and respect `ON DELETE` semantics.
- A rename must preserve data. Treat a drop/create pair as data loss unless the
  migration proves otherwise.

### 4. Queries and indexes

- Run `EXPLAIN QUERY PLAN` for hot lookups; the plan must use an index and must
  not `SCAN` a growing table.
- Check for N+1: a query inside a loop, a per-row subquery over an unbounded
  list, or `findById` per item. Batch with `IN (...)`, a join or a CTE.
- Prefer `EXISTS` over `COUNT(*)` for existence checks.
- Pagination must be pushed down with `LIMIT/OFFSET` (or keyset) and a stable
  `ORDER BY` that includes a unique tiebreaker (`created_at, id`).
- A soft-delete filter (`deleted_at IS NULL`) plus an order column may need a
  partial index once the table grows.
- JSON columns are opaque to the planner; do not assume an index on
  `json_extract` unless a generated column or expression index exists.
- Count only what the UI needs; avoid `COUNT(DISTINCT ...)` per row in a list
  query when a grouped CTE can do it once.

### 5. Transactions and concurrency

- Wrap multi-row writes in `db.transaction()` and keep the transaction short.
- Do not perform network calls or provider requests inside a transaction.
- `buildDatabase` already sets WAL, `foreign_keys = ON`, `busy_timeout = 5000`
  and a 16 MB page cache; do not duplicate those pragmas in repositories.
- Assume a second connection (CLI, backup, tests) may write. Handle
  `SQLITE_BUSY` through the configured timeout, not with retries in a loop.
- A failed unique constraint should map to a domain error, not leak a raw
  SQLite message.

### 6. API and error contract

- Routes parse input with Zod and pass typed input to the use case.
- Expected business outcomes return a DTO or a discriminated union; invariant
  violations throw `DomainError` with a stable code and HTTP status.
- API errors are JSON: malformed JSON 400, too large 413, encoding 415,
  unknown `/api` route 404.
- State-changing routes must keep the cross-origin guard and body limits.
- API keys and provider secrets never appear in DTOs or logs.

### 7. Tests

- One `*.test.ts` next to each use case, mocking ports.
- Repository tests use a temporary SQLite database, `runMigrations` and real
  queries.
- Add a regression test for every fixed bug and every new index or query shape.
- Extend `query-performance.test.ts` when a new hot lookup is introduced.
- For migrations, assert the resulting schema and the backfilled data.

## Finding format

Report findings with:

```text
ID:          DB-001
Severity:    Critical | Major | Minor | Nit
Confidence:  Confirmed | High | Medium | Low
Location:    path:line
Problem:     what is wrong
Evidence:    query plan, test, code path or data shape
Impact:      current scale and the scale where it matters
Fix:         concrete change, including the index or transaction
Validation:  test or measurement that proves the fix
```

Do not invent query plans or latency numbers. If there is no runtime evidence,
say so and cap confidence at Medium.

## Commands

```sh
pnpm check:arch
pnpm --filter @workspace/backend typecheck
pnpm --filter @workspace/backend test
pnpm --filter @workspace/backend exec vitest run \
  src/infrastructure/adapters/secondary/drizzle/repositories/query-performance.test.ts
pnpm --filter @workspace/backend db:generate
pnpm --filter @workspace/backend exec drizzle-kit check
pnpm audit --prod
```

## Red flags

- `application/` importing `drizzle-orm`, a schema file or a repository class.
- A use case calling `findById` inside a `map` or `for` loop.
- `ORDER BY` without a unique tiebreaker on a paginated query.
- A migration that drops a column or table without a backfill/archive step.
- `db:push` in a release or deploy script.
- Raw SQLite errors reaching the HTTP layer.
- `COUNT(*)` on every row of a list response.
- A new index without a query that uses it.
- A transaction that awaits a provider, HTTP call or file upload.

## Done criteria

- `pnpm check:arch` passes.
- The use case tests and the repository tests pass.
- Hot queries still use indexes (`query-performance.test.ts`).
- The migration is generated, reviewed and covered by a test when it moves data.
- `pnpm audit --prod` is clean.
