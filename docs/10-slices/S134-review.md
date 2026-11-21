# S134 — Review

**Estado:** PASS WITH NOTES
**Revisor:** slice-reviewer
**Fecha:** 2026-11-21

## Hallazgos

**Verdict: no blockers, no majors.** The implementation matches the RFC contract, the two documented clarifications (usage "Historial" = `versionNumber < selected`; restore of a non-current version always forces a new version), and the resolved import-action matrix. I found a handful of minor/nit items, none of which block merge.

### What I checked

- **Soft delete / restore version**: `soft-delete-lorebook.use-case.ts` 404s on missing-or-already-deleted (`deletedAt !== null`), repo `softDelete` is `WHERE id AND deleted_at IS NULL`, versions and `character_versions` untouched. `restore-lorebook-version.use-case.ts` returns 200 `createdNewVersion:false` no-op for the current version, and `restoreVersionAsNewHead` (repo) always inserts `MAX(version_number)+1`, leaving the old version immutable and updating `current_version_id` + live head correctly.
- **Usage**: `get-lorebook-usage.use-case.ts` skips `lorebookVersionNumber > selected` (clarification 1), partitions `==`→inUse / `<`→history, marks `actual` via `MAX(versionNumber)` per character (matches the character repo's current-version definition), batches to one `findUsageVersions` + one `findCurrentCharacterVersionNumbers` (no N+1), 404 on deleted. `usageVersionCount = COUNT(DISTINCT cv.id)` in the repo is correct.
- **Link-to-character**: validates live book + version-ownership + character existence, 409 `LOREBOOK_LINK_UNCHANGED` before delegating to `UpdateCharacterUseCase` (copy-from-prev, exactly one new version, prior versions untouched), returns the new `CharacterVersionDTO`.
- **Import matching/reconstruction**: `origin_id` precedence → `source_key` fallback, six cases, tie-break live→current-match→oldest, `IMPORT_ACTION_MISMATCH`/`IMPORT_STALE_MATCH`, fresh `origin_id` on `deleted-different`, no character-version mutation, card import (`PUT /characters/:id/card`) untouched.
- **Export**: `executeById` exports the selected version (not the live head) when `versionId` present; `mergeExtensions` does an additive `extensions.rm` merge preserving unknown keys and omitting `originId` when absent; source key excludes book-level `extensions`, so the `rm.originId` additive change doesn't break round-trip; deleted → 404.
- **Alternate greeting**: `greetingIndex` validated at route (`z.number().int().min(0)`) and in `resolveGreeting` (`0`/`undefined`→`first_mes`, `≥1`→`alternateGreetings[i-1]`, out of range → `INVALID_GREETING` 400); only message 0 is affected; picker wired at detail / versions / library.
- **Cleanup**: I1 batch (`findVersionsByIds` + `findByIds` once each), N1 synthetic entry ids stable by position, N4 SQL `LIMIT/OFFSET` + `EXISTS`/`NOT EXISTS` filter pushdown + `usageVersionCount`.
- **Frontend**: sections/dialogs in own files, all < 500 lines, feature isolation respected (picker in `components/shared/`), no dead buttons, no leftover `S134` placeholders, `linkDeferred*`/`versionsDeferred`/`tabCards` removed, en/es i18n complete (incl. plural `usageCharacters`), origin guard at `/api` level covers all mutating routes (no per-route guard), no migration, no version bump, no secrets.

### MINOR

1. **`packages/backend/src/application/use-cases/character/lorebook/import-lorebook-standalone.use-case.ts:149-151` — stale `extensions.rm.originId` on `deleted-different → new-book`.** The new container's `origin_id` column is a fresh `randomUUIDv7()`, but its stored `extensions` (inherited from `parsed.entities.book.extensions`) still carries the imported *old* `originId`. The resulting `LorebookDTO` then exposes both `originId` (fresh) and `extensions.rm.originId` (old). No observable bug today — the standalone exporter (`mergeExtensions`, which prefers `book.originId`) and the card mapper (which reads `lorebook.originId`) both correct it — but it's a latent data inconsistency. *Fix:* when creating a `new-book` with a fresh origin, also normalize `book.extensions.rm.originId` to the fresh value (or drop it and let export re-add it).
2. **Dead i18n keys introduced by this slice — `packages/shared/src/i18n/locales/en.ts:1107,1115` and `es.ts:1116,1124`.** `lorebooks.usageCount` (`"{count} uses"`) and `lorebooks.exportReadOnly` are no longer referenced: the card now uses `usageCharactersVersions` and the detail page always exports per-version. The RFC cleanup was about dead keys (`tabCards`), so leaving two newly-dead keys is a minor cleanliness regression. *Fix:* delete the two keys.

### NIT

3. **`packages/frontend/src/lib/api/lorebooks.ts:106-123` — `format` field is dead weight with a narrower type.** `importLorebook`/`importLorebookPreview` type `format` as `LorebookExportFormat` (`"ccv3"|"st-native"`), while the backend schema accepts `"json"` too (`LorebookImportFormat`). The backend parser (`parseLorebookImport`) ignores `format` entirely and auto-detects the shape, so this is harmless — but the frontend/shared type mismatch is worth aligning (use `LorebookImportFormat` or drop the field from the contract).
4. **`packages/backend/src/application/use-cases/character/lorebook/lorebook-import-matching.ts:212-231` — `IMPORT_STALE_MATCH` only covers `reuse` + `deleted-identical`.** Other preview→confirm transitions (e.g. `restore` confirmed after the book was already restored → now `live-identical`; `new-version` confirmed after a soft-delete → now `deleted-different`) fall through to `IMPORT_ACTION_MISMATCH`. Both are 409 and the UI re-runs preview either way, and this matches the single case the user resolved, so it's acceptable — noted for completeness only.
5. **Fresh books have no `origin_id`.** `create-lorebook.use-case.ts` and a `new-book` import of a payload without `originId` both produce `origin_id = null`, so origin-based matching only engages for books that came from a card import (S133) or a standalone import carrying an origin. This is by design (origin omission when absent) and round-trip-stable, but worth being aware of when reasoning about matching robustness.

No BLOCKER or MAJOR findings. The slice is consistent with the approved RFC and the test-plan clarifications; the two MINOR items are deferrable with a note and the NITs are informational.

## Re-revisión del delta (2026-11-21)

Delta re-review complete. All three commits are correct and safe.

### 1. Correctness of the delta

- **`8196a9e` (origin fingerprint refresh)** — Correct. `createBook` now rewrites `extensions.rm.originId` to the fresh `randomUUIDv7()` only in the `deleted-different` branch, preserving other `extensions` and `rm` keys via spread and using `withSettings` (which keeps `originId`, `createdAt`, `currentVersionId`, `deletedAt` intact). No effect on `sourceKey` (book-level `extensions` are excluded from canonicalization), so matching/round-trip is unaffected. The `none` branch is untouched and already consistent.
- **`eeb05e4` (drop dead i18n keys)** — Correct. Removes only `usageCount` and `exportReadOnly` from both locales; no remaining references anywhere (confirmed earlier by grep, and `pnpm check` typecheck is green because `TranslationKey` is derived from the dictionaries).
- **`455680c` (format type alignment)** — Correct. `LorebookImportFormat` is exported from `@workspace/shared/types/lorebook`; `LorebookExportFormat` remains assignable to it, so the dialog's `selectedFormat` still compiles without changes.

### 2. New findings

None. Specifically checked: no regressions in the six-case matching, no stale `extensions.rm.originId` path reintroduced, no orphaned i18n key references, no type widening that breaks the import dialog, and no test asserting the old behavior. Orchestrator's green re-run (`check`, 1078 backend, 488 frontend) is consistent with the diff.

### 3. Final status

**PASS WITH NOTES** — NIT 4 (`IMPORT_STALE_MATCH` only covers `reuse`+`deleted-identical`) and NIT 5 (fresh books may have no `origin_id`) remain accepted/deferred; no blockers or majors remain.
