# feat(s133): add card-first character and versioned lorebook foundation

## Summary

S133 turns the character screen into a card-first surface with sections
(Identity, Card, Knowledge cards, Lorebook, Versions) and lays the foundation
for versioned lorebooks: a `lorebook` is now a standalone container with
immutable versions, and each character version pins one specific lorebook
version. It adds the `GET/PUT /api/characters/:id/card` contract with
`extensions.rm`, makes the prompt and preview read the linked version instead
of the live book, and ships basic lorebook pages (`/lorebooks`,
`/lorebooks/new`, `/lorebooks/:id`) with a version selector.

The final UI pass rebuilds those surfaces with the Ink & Violet card-first
language from `docs/prototypes/card-first/`: paper shell, book-spine lorebook
shelf, large Create plates, vertical section nav, cover/rail/save bar, compact
image row and a real card preview. It also restores the S133 actions that were
only reachable from the list context menu and closes the dead-button/export
gaps found in review.

No version bump. The entries live under `[Unreleased]` in
[CHANGELOG.md](CHANGELOG.md).

## What ships

### Shared

- `packages/shared/src/types/lorebook.ts`: `LorebookSummaryDTO`,
  `LorebookVersionDTO`, `LorebookVersionSummary`, `CreateLorebookInput`,
  `UpdateLorebookInput` and `CreateLorebookEntryInput`, with
  `LorebookDTO.characterId` now optional/legacy plus the new container fields
  (`originId`, `currentVersionId`, `deletedAt`, `currentVersionNumber`).
- `RmExtensions` on `sillytavern-card.ts` (`subtitle`, `instructions`,
  `knowledgeCards`, `versionNumber`, `tagline`, `lorebook`), and
  `CharacterVersionDTO.lorebookVersion?` plus `lorebookVersionId` inputs on
  `character.ts`.
- Pure canonicalization helper for the lorebook `source_key`; the SHA-256 hash
  itself stays in the backend.

### Backend

- **Schema and migration `0020`**: new `lorebook_versions` table (immutable
  `entries_json` + `source_key`, unique `(lorebook_id, version_number)`), new
  `lorebooks` columns (`origin_id`, `current_version_id`, `deleted_at`, with
  `character_id` nullable-legacy and no unique index or cascade), and
  `character_versions.lorebook_version_id` (FK `ON DELETE RESTRICT`).
- **Backfill**: idempotent TypeScript pass after `runMigrations` that creates a
  v1 per existing book, sets `current_version_id`, links **all** existing
  character versions to that v1, generates `origin_id` and nulls the legacy
  `character_id`. The `INSERT ... NOT EXISTS (v1)` guard repairs partial
  failures without duplicating the version.
- **Lorebook resource**: `GET /api/lorebooks`, `GET /api/lorebooks/:id`,
  `GET /api/lorebooks/:id/versions`, `GET
  /api/lorebooks/:id/versions/:versionId`, `POST /api/lorebooks` (standalone
  container + v1, no character link) and `PUT /api/lorebooks/:id` (creates a
  version only when the canonical content changed, including a relative entry
  reorder; a no-op returns `createdNewVersion: false`).
- **Character link**: `POST/PUT /api/characters` accept `lorebookVersionId`
  (`undefined` copies, `null` unlinks, id links after validation); the link
  change participates in no-change detection.
- **Card contract**: `GET /card?spec=v2|v3&versionId=` returns `character_book`
  from the linked lorebook version, and `PUT /card` creates one character
  version, a new lorebook + v1 when `character_book` is present, and re-emits
  `extensions.rm` with the new local ids, the imported `originId` and a
  recomputed `sourceKey`. Unknown fields stay byte-for-byte in their buckets,
  including unknown keys inside `extensions.rm`.
- **Prompt and preview**: `ConversationContextLoader` resolves the linked
  lorebook version and feeds the existing activation service/compiler; an
  edited or soft-deleted live book does not change existing conversations.
  Preview and send keep exact parity.
- **S132 compatibility**: `/characters/:id/lorebook*`,
  `/characters/cards/*` and `/lorebooks/preview` keep working; the export path
  now also reads the linked version.

### Frontend

- Card-first design layer (`styles/card-first.css`): paper/ink/violet shell,
  panels, chips, covers, rails, save bars, book-spine cards and responsive
  section navigation; shadcn/Radix stays only as the accessible primitive
  layer for dialogs, menus and selects.
- Library shell with Characters, Lorebooks and Player characters, and a
  two-tile «Create» dialog (Character / Lorebook) instead of tabs.
- Character list cards show cover, tags, creator, current lorebook, dates and
  visible Open/Chat actions; search matches name, subtitle, tags, creator and
  lorebook.
- Sectioned character pages (`/characters/new`, `/characters/:id`) with cover,
  sticky section nav, preview rail, compact profile-image row, save bar and a
  single `PUT /characters/:id` per save (one version per save). The header
  exposes Save changes, New conversation, RM/card export, Card JSON inspector
  and Delete; versions can be previewed and used to start a conversation.
- Lorebook shelf with All/In use/Unused filters, book-spine cards and an add
  tile; create page (v1 without a character link) and detail with version
  selector, collapsible full entry editor, functional export and S134-labelled
  link/usage panel. Old versions are read-only.
- `CharacterSummary` now carries `tags`, `creator` and the linked lorebook
  summary; `LorebookSummaryDTO` carries description, real usage and updated
  date. `POST /api/lorebooks/:id/export` exports a standalone book.
- «Tarjetas» renamed to «Fichas» (EN: «Knowledge cards»), with the exact linked
  version and its `current`/`outdated`/`deleted` state shown on the character.
- API clients for lorebooks, standalone lorebook export and the character card
  contract.

## Migration and data safety

`0020` rebuilds `lorebooks` to drop the unique per-character index and the
cascade, keeping `character_id` as a nullable legacy column only until the
backfill links existing character versions. The physical drop is deferred to a
later cleanup. Saving a changed lorebook produces an immutable version, so
editing a book no longer changes conversations that were created earlier.

## Verification

- `pnpm check`: pass (`check:arch` 7/7, typecheck 5/5, lint 5/5).
- `pnpm --filter @workspace/backend test`: 158 files / 1027 tests passed.
- `pnpm --filter @workspace/frontend exec vitest run`: 84 files / 452 tests
  passed.
- `pnpm --filter @workspace/backend eval`: 1 file / 33 tests passed (S129
  assembly/context snapshots intact).
- `pnpm build`: pass (pre-existing warnings only).
- `pnpm audit --prod`: no known vulnerabilities.
- `git diff --check`: clean.
- Manual check: Playwright captures at 1440 px and 390 px for the list,
  create/detail character, Create dialog, lorebook shelf/detail, card and
  lorebook export, Card JSON inspector, version preview and delete dialog.
- Release dry-run: not required (no packaging, native-module or lockfile
  changes).

## Review

Final review: **PASS WITH NOTES** —
[S133 review](docs/10-slices/S133-review.md). The initial review was BLOCKED by
B1: S132 card/lorebook imports created a book without a v1 or link, so the
imported book was invisible to the prompt and card export. Fix `0892bf5` plus
test `5d804dd` close it: `createWithFirstVersion` creates the standalone book,
its entries, the v1 and the character-version link in one transaction, and
`import-character` propagates that v1 to every later version. No blockers
remain.

A second independent review covered the UI refactor (`44d6873..5843a0c`). It
also returned **PASS WITH NOTES**; the actionable findings were fixed in
`9b60e45` + `a4a6d67`: desktop save action + mobile sticky save bar, export
route tests, deleted-lorebook link, real conversation count in the export
dialog, linked-version entry count, neutral card version for a new character,
removed dead export prop and hidden Versions in create mode.

## Deferred notes (non-blocking)

- **I1.** N+1 in `GET /characters/:id`: the version summary runs
  `findVersionById` + `findById` per version. Cleanup/S134 (batch `IN (...)`).
- **N1.** `toLorebookVersionDTO` entries carry no `id` at runtime; the frontend
  tolerates it with `entry.id ?? …`. Cleanup/S134 (synthesize an id).
- **N2.** Dead i18n key `characters.tabCards`. Cleanup.
- **N3.** `extensions.rm` always emits `subtitle`/`instructions` as `null`, so a
  card without `extensions` gains the `rm` namespace. Cosmetic; field loss is
  still zero. Cleanup.
- **N4.** `listLorebooks` paginates in memory and hardcodes `usageCount: 0`.
  Cleanup/S134.
- **N5.** `canonicalizeLorebookContent` lives in `shared/lib` (re-exported from
  `source-key.ts`) rather than `application/`. Benign: `shared/` stays pure and
  the hash remains backend-only. Note only.
- **UI N1.** The first lorebook entry uses `<details open>` without a controlled
  toggle; works today, can become a controlled accordion later.
- **UI N4.** The paper grain and shell styling are global by design (shell was
  in scope); chat/settings keep their own content styles.
- **UI N5.** `KeyListInput` keeps local text state without resyncing across
  version switches; pre-existing pattern.
- **UI N6.** The independent reviewer had no image input, so visual fidelity
  was validated with human-reviewed Playwright captures at 1440 px and 390 px.

## Out of scope (S134 and beyond)

- Reconstruction/reuse by `origin_id`/`source_key` on reimport.
- Full version history, restore, per-version usage and «Link to a character»
  from the lorebook detail.
- Soft-delete/restore UI and per-book import/export.
- Physical drop of `lorebooks.character_id`.
- Alternate greeting selection when starting a conversation.
- `nickname` in `extensions.rm` (not approved; still in `unknownFields`).
- Chats/JSONL, CHARX, V3 assets, group chats, advanced lorebook activation
  (timed effects, probability, groups, decorators, `vectorized`) and the ST
  prompt manager.

## Release

No version bump in this PR. Entries live under `[Unreleased]` in
[CHANGELOG.md](CHANGELOG.md); the release is batched in a separate
`chore(release): vX.Y.Z` pull request. Merging this PR does not publish a
release.
