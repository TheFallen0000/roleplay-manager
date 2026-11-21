# S134 — PR body

**Título sugerido:** `feat(lorebooks): complete the versioned lorebook library (S134)`

## What does this change do?

Completes the lorebook library that S133 left as a basic directory. A lorebook is
now a first-class resource: full version history, restore-as-new-version, usage
grouped by character, link-to-character from the book, soft delete with a warning,
standalone import/export per book and version with `origin_id`/`source_key`
matching, and an alternate-greeting picker when starting a conversation.

It also closes the S133 follow-ups tied to this area: SQL pagination and
in-use/unused filtering on the shelf, real usage counts, batched linked-lorebook
summaries on character detail (no N+1) and stable synthetic entry ids.

## Why is it needed?

The deferred endpoints of `docs/16` §9 (`restore`, `DELETE`, `usage`, `link`,
`import`, export by version) did not exist, and the UI showed «S134» placeholders
instead of actions. A user could not restore a version, see which characters use a
book, link it from the book, delete it safely, re-import it restoring its history,
export a concrete version or choose an alternate greeting.

Approved contract: `docs/10-slices/S134-progress.md` (RFC, `91b0bd7`). Test plan:
`docs/10-slices/S134-test-plan.md` (`ef5ee20`).

## What changed

### Backend

- `POST /api/lorebooks/:id/versions/:versionId/restore`: creates a new version from
  an old snapshot; restoring the current version is a 200 no-op.
- `DELETE /api/lorebooks/:id`: soft delete (`deleted_at`), 404 when missing or
  already deleted; versions and character versions stay untouched.
- `GET /api/lorebooks/:id/usage?versionId=`: "In use by" (`==` selected version)
  and "History" (older versions), grouped by character, batched without N+1.
- `POST /api/lorebooks/:id/link`: one new character version via copy-from-prev;
  409 `LOREBOOK_LINK_UNCHANGED` when nothing would change.
- `POST /api/lorebooks/import/preview` and `POST /api/lorebooks/import`: dry-run
  matching by `origin_id` then `source_key`, explicit `reuse` / `restore` /
  `new-version` / `new-book` action, 409 `IMPORT_ACTION_MISMATCH` /
  `IMPORT_STALE_MATCH`. The card import (`PUT /characters/:id/card`) keeps the S133
  behavior and does not use the matcher.
- `POST /api/lorebooks/:id/export` accepts `versionId` and merges
  `extensions.rm` additively (`version: 1`, `originId`) for CCv3 and ST native,
  preserving unknown keys.
- `POST /api/conversations` accepts `greetingIndex` (0 = `first_mes`, `i >= 1` =
  `alternateGreetings[i-1]`); out of range is 400 `INVALID_GREETING`.
- `GET /api/lorebooks` pushes `limit`/`offset`/`filter` into SQL and returns real
  `usageCount` and `usageVersionCount`.
- No new migration: the `0020` schema already covers soft delete, usage, restore
  and matching. A `deleted-different` import gives the new book a fresh
  `origin_id`, including `extensions.rm.originId` (`8196a9e`).

### Shared and frontend

- New DTOs: `LorebookUsageDTO`, `ImportLorebookPreview`, `ImportLorebookResult`,
  `LinkLorebookInput`, `ImportLorebookAction`, `greetingIndex`.
- Lorebook shelf with real usage ("Used by N characters · M versions" / "Unused")
  and standalone import.
- Detail sections Identity, Settings, Entries, Versions, Link and Danger;
  previous versions are read-only and offer "Restore as a new version".
- Link dialog with the "this creates a new character version" warning.
- Delete dialog with the `docs/16` §5.1 warning; a deleted book is restored by
  re-importing it.
- `AlternateGreetingPicker` in `components/shared/`, wired at character detail,
  the versions section and the library.
- S134 placeholders (`linkDeferred*`, `versionsDeferred`, `characters.tabCards`)
  removed; the obsolete `**S134**` CHANGELOG entry is gone.

## Tests and verification

- `pnpm check`: architecture 7/7, typecheck 5/5, lint 5/5.
- `pnpm --filter @workspace/backend test`: 166 files / 1078 tests passed.
- `pnpm --filter @workspace/frontend exec vitest run`: 93 files / 488 tests passed.
- `pnpm --filter @workspace/backend eval`: 1 file / 33 tests passed.
- `pnpm build`: 4/4 tasks successful. The build refreshed
  `packages/website/src/data/release.json` (1.47.0 → 1.57.2); that generated
  snapshot was restored and is not part of the slice.
- `pnpm audit --prod`: no known vulnerabilities.
- `git diff --check`: clean.
- No release dry-run: the slice does not change `package.json`,
  `pnpm-lock.yaml`, native modules or packaging.
- No manual browser run in this session; UI behavior is covered by the RTL suites.

## Review

- `docs/10-slices/S134-review.md` (`bf52267`): **PASS WITH NOTES**, no blockers and
  no majors.
- Fixed before close: MINOR 1 (stale `extensions.rm.originId` on a fresh new book,
  `8196a9e`), MINOR 2 (dead i18n keys, `eeb05e4`) and NIT 3 (import `format` type
  alignment, `455680c`). Delta re-review found no new findings.
- Deferred: NIT 4 (`IMPORT_STALE_MATCH` only covers `reuse` + `deleted-identical`;
  other incompatible transitions are `IMPORT_ACTION_MISMATCH`) and NIT 5 (fresh
  books may have `origin_id = null` by design).

## Deferred / out of scope

- Card import matching (`PUT /characters/:id/card` unchanged).
- Internal export schema v2 (`EXPORT_SCHEMA_VERSION` untouched).
- N3 (`extensions.rm` emitting `null` subtitle/instructions), physical drop of
  `lorebooks.character_id`, orphan-version cleanup, `nickname`.
- Multiple lorebooks per character version, groups, timed effects, probability,
  decorators, V3 assets, ST prompt manager.

## Release

No version bump, tag or release in this PR: the CHANGELOG entries live under
`[Unreleased]`. Publishing `1.58.0` is a separate `/release`.

## Checklist

- [x] `pnpm check` passes locally (architecture, typecheck, lint).
- [x] Tests added or updated where it makes sense (backend and frontend).
- [x] Docs updated (`docs/10-slices/S134-*.md`, `CHANGELOG.md`, `AGENTS.md`,
      `docs/10-slices/WORKFLOW.md`).
- [x] Commits use the conventional style.
- [x] No version bump and no manual release.
