# feat(sillytavern): add character cards and lorebooks (S132)

## Summary

S132 adds SillyTavern-compatible character cards (V1/V2/V3 in JSON and PNG) and
lorebooks (embedded and standalone), together with the native card fields and
prompt overrides needed to use them. Import/export round-trips unknown fields,
lorebook activation is deterministic and bounded, and the prompt only changes
when the new data is present. No chats/JSONL, no CHARX and no version bump.

## What ships

- **Character cards.** Import V1/V2/V3 from JSON and PNG (`tEXt` chunks `chara`
  and `ccv3`, with `ccv3` precedence). Export V2/V3 in JSON and PNG writing both
  chunks; V3-only fields are omitted from the V2 projection by design.
- **Native card fields.** `personality`, `scenario`, `mes_example`,
  `alternate_greetings`, `creator_notes`, `tags`, `creator`,
  `card_character_version`, `gender`, `pronouns`, `tagline`, `system_prompt`,
  `post_history_instructions`, `extensions`, `unknown_fields` and
  `unknown_root_fields` on `CharacterVersion`, plus the DTO, repository,
  use-case and export surfaces.
- **Card prompt overrides.** `system_prompt` replaces only the persona block
  (`roleplay`, `roleplayFiction`, `roleplayStayInCharacter`, `roleplayMature`)
  and preserves the user-agency, language and length scaffolding, the native
  `instructions`, safety, format and tools. `post_history_instructions` becomes
  a final `card-overrides.post-history` section. Empty values emit no section,
  so existing prompts stay byte-identical.
- **Lorebooks.** Embedded `data.character_book`, standalone CCv3
  (`lorebook_v3`) and SillyTavern-native `{entries}` (keyed object or array)
  map to one normalized `lorebooks`/`lorebook_entries` schema linked to the
  character. Activation covers primary/secondary keys, selective logic 0–3,
  constant entries, insertion order, before/after position, case sensitivity,
  whole words, book-level scan depth, token budget with priority trim and
  recursion capped at 3.
- **UI.** SillyTavern import/export dialogs, creator-notes panel, tags input,
  alternate greetings, gender/pronoun chips, display-only tagline and card
  version, lorebook editor with inline entry editing and standalone
  import/export, plus a «Crear» modal with Personaje/Lorebook tabs. The
  `/characters/new` deep link keeps working.
- **Internal export.** A new `lorebook` section (child of `definition`, selected
  by default with it) carries optional lorebook data without bumping
  `EXPORT_SCHEMA_VERSION`.

## Scope boundaries

- No chats/JSONL and no CHARX.
- No port of SillyTavern's default prompt: `system_prompt` and
  `post_history_instructions` are compatibility overrides only.
- No user regex, timed effects, probability, groups or `vectorized` activation;
  these fields are preserved and re-emitted but never activated.
- No per-entry `scanDepth` activation; only the book-level value applies.
- `gender`, `pronouns`, `tagline` and `cardCharacterVersion` are display-only in
  S132; `creator_notes`, `tags` and `alternate_greetings` are never injected.
- Macros (`{{char}}`/`{{user}}`) are kept verbatim: decision M1 was not
  approved for this slice.

## How it works

- `createWithFirstVersion(character, version, { book, entries })` creates the
  character, its first version and its lorebook in a single transaction, so a
  failed import cannot leave a partial character.
- Card mapping is pure (`sillytavern-card.mapper.ts`); PNG parsing/writing lives
  in a backend adapter that uses `node:zlib`, keeping `shared/` free of runtime
  Node imports.
- Unknown data is split by bucket: `extensions` stays verbatim, `unknownFields`
  holds unmapped `data` keys, and `unknownRootFields` holds unmapped root keys.
  Each is re-emitted at the same level on export.
- Lorebook activation is a pure shared helper (`lorebook-activation.ts`); the
  backend service only shapes the scan text and maps the result back to domain
  entries. The context manifest exposes `lorebook.overBudget`.
- Preview (`get-prompt-context`) and send share the loader, compiler and builder,
  so both produce the same `systemPrompt` for the same input.
- UI import dialogs send the raw payload to the backend (the preview is
  display-only). The character form's Lorebook tab and the «Crear» modal both
  feed `CreateCharacterInput.lorebook`, so a book can be attached before the
  character exists.

## Security and limits

- Size caps for JSON, PNG, chunks, decoded JSON and inflated `IDAT`; CRC and
  chunk-length validation; unknown critical chunks are rejected.
- Strict standard base64 for `chara`/`ccv3` chunks; invalid payloads fail with
  `INVALID_CARD_PNG` instead of being treated as JSON.
- No network calls during import/export; the placeholder PNG is generated in
  memory.
- No user regex (literal key matching), recursion capped at 3, a bounded token
  budget, and no secrets/providers/settings in exported cards.
- Card and lorebook routes mount a 15 MB JSON parser before the global 1 MB
  limit; `/characters/imports` keeps its 25 MB limit.

## Compatibility and licensing

"SillyTavern-compatible" is a nominative description of the file formats. The
implementation is clean-room from the public V2/V3 specifications and docs; it
does not copy SillyTavern source code, UI, prompts, assets or tests. The V3 card
spec is MIT, SillyTavern is AGPL-3.0 and this repo is AGPL-3.0-or-later; no logos
or implied endorsement are included.

## Tests and verification

- Backend: `pnpm --filter @workspace/backend test` → 149 files / 964 tests.
- Frontend: `pnpm --filter @workspace/frontend exec vitest run` → 80 files /
  435 tests.
- `pnpm check` → pass (`check:arch` 7/7, typecheck 5/5, lint 5/5).
- `pnpm build` → pass (pre-existing warnings only).
- `pnpm audit --prod` → no known vulnerabilities.
- `git diff --check` → clean.
- Not run: manual app smoke test; release dry-run (no packaging, native-module
  or lockfile changes).

## Review

Final review: **PASS WITH NOTES** —
[S132 review](docs/10-slices/S132-review.md). No blockers or
importants pending. B1 (15 MB limit shadowed by the global 1 MB parser), I1
(lorebook metadata lost on edit), I2 (standalone UI), N1 (`lorebook.overBudget`),
N2 (strict base64) and N5 (display-only fields) are resolved and covered by
tests.

## Deferred notes (non-blocking)

- **R1.** No standalone lorebook entry point in the character list/context menu;
  import/export is only available from the character form's Lorebook tab.
- **R2.** UI exports lorebooks as CCv3 only; the `st-native` endpoint is not
  offered by the dialog.
- **R3.** Empty `description`/`first_mes` fallbacks are resolved with
  `translate("en", …)`, so the stored fallback is English for Spanish users.
- **R4.** The create/edit form has three tabs (Personaje/Tarjetas/Lorebook)
  instead of the two described in the RFC.
- **R5.** Clearing both the lorebook name and all entries does not persist the
  deletion because the form treats the book as empty.
- **R6.** `MAX_CARD_JSON_BYTES` is only asserted in tests; production uses
  `maxDecodedCardJsonBytes`.
- **R7.** A standalone CCv3 `spec_version` is preserved in the book
  `unknownFields` and re-emitted inside `data`, not at the root.
- **R8.** `reorderEntries` does not validate that entry ids belong to the
  character's lorebook.
- **R9.** The frontend `parseLorebookPayload` duplicates the backend
  `normalizeLorebook`; the backend re-normalizes on save.

## Release

No version bump in this PR. Entries live under `[Unreleased]` in
[CHANGELOG.md](CHANGELOG.md); the release is batched in a separate
`chore(release): vX.Y.Z` pull request.
