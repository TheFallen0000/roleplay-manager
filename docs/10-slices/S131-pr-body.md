## Summary

S131 addresses the three S130 follow-ups: it removes the double output reserve in
context compaction, stops sending an empty `conversationOverride`, and defers
the curated-catalog optimization with a measured baseline. No prompt wording
changes, no new features, no version bump.

## What changed

1. **Double output reserve (decision A).**
   - `conversations.context_window` now always keeps the raw model window. A new
     nullable `working_window` stores the applied net window.
   - Existing rows keep `working_window = NULL` and keep today's conservative
     behavior (raw window + reply reserve).
   - "Apply detected" writes the raw window to `context_window` and the net
     window to `working_window`, so consumers reserve the reply once instead of
     twice.
   - Preview, manifest and compaction share `resolveEffectiveWindow`. Net mode
     uses the net window with `outputReserve = 0`; legacy/raw mode keeps the raw
     window plus the reserve.
   - Post-review safety: a net window is trusted only when it is positive,
     finite, `<= contextWindow`, and
     `workingWindow + (maxTokens ?? 2048) <= contextWindow`. Unsafe pairs fall
     back to raw + full reserve.
   - Import and settings templates validate the pair; a stale stored net window
     is cleared when the raw window or reply budget changes.
   - Migration `0018_wet_absorbing_man.sql` adds the nullable column with no
     default and no backfill.
2. **NIT-4.** `useModelCapabilities` only sends `conversationOverride` for a
   finite positive `maxTokens`; `null`, `undefined`, `0` and negative values
   omit the key.
3. **Catalog deferred, measured.** ~8.3 ms startup, ~6.6 MB RSS and ~43.6 KB
   gzip. Revisit when the catalog grows past ~2 MB raw / ~150 KB gzip, packaged
   cold start exceeds +50 ms / +30 MB RSS, or the catalog must leave the boot
   path.

## Migration and compatibility

- Migration 0018: nullable `working_window integer`, no default, no backfill;
  `scripts/package.mjs` already copies the migrations folder.
- Export/import stays at schema v1: `workingWindow` is optional, old exports
  import as `null`, and imported pairs that do not fit become `null`.
- Branches copy both windows. Templates copy the net window only when the
  model/provider match and the net window fits the target's final raw window
  and reply budget; otherwise they write `null`.
- Rollback/downgrade is safe: older code ignores the column and keeps using the
  raw `context_window`.

## Tests and verification

- Backend: 129 files / 798 tests.
- Frontend: 70 files / 409 tests.
- `pnpm check`: architecture 7/7, typecheck 5/5, lint 5/5.
- `pnpm build`: 4/4 tasks.
- `pnpm --filter @workspace/backend eval`: 1 file / 33 tests.
- `pnpm audit --prod`: no known vulnerabilities.
- `git diff --check`: clean.
- Release audit: **READY (PASS)** — [S131 release audit](docs/10-slices/S131-release.md).
- Not run: manual app test; release dry-run (no packaging, native-module or
  lockfile changes).

## Review

Final review: **PASS** — [S131 review](docs/10-slices/S131-review.md). The major
finding (the settings guard trusted a net window that did not leave room for the
reply) was fixed with the resolver safety predicate plus import, template and
settings validation. Remaining nits are documented as deferred.

## Out of scope

- No prompt wording or context-assembly policy changes.
- No curated-catalog optimization (deferred with the measured trigger above).
- No version bump, tag or release.
