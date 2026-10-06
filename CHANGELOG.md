# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [1.22.0] - 2026-10-06

### Added

- Optional per-conversation chat background (PM.3 + PM.5, phase A): set from Customization with upload + cropper (16:9), **Cover/Contain** fit, a 0–100 overlay slider with live preview and a "Remove background" action. There is no default background, and branches inherit the background, fit and overlay.
- New `large` (1920 px) asset variant and per-usage variant sets: profile images generate `thumbnail/small/medium`, backgrounds generate `small/medium/large`. The chat renders the background behind the messages with responsive `srcset`/`sizes` and never requests the original on phones.
- `POST /api/conversations/:id/customization/background` endpoint. The backfill and its `--report` mode now understand background usage and report background bytes/savings.

### Fixed

- Conversation images are only deleted when no other conversation references them, so replacing or removing an image no longer breaks branches that share it.
- Streaming requests (`send`, `regenerate`, `continue`) now send `Accept-Language`, so the LLM prompt follows the UI language there too.

## [1.21.0] - 2026-10-06

### Added

- "Apply settings…" action in the character context menu: an exported settings template (`standaloneSettings`) can now be applied to all conversations of a character. It reuses the existing settings validation/clamping, keeps the destination provider and model with a warning when the template's instance does not exist in this installation, and reports translated warnings.
- `POST /api/characters/:id/settings-imports` endpoint and a pure `parseSettingsTemplate` parser with localized errors.

## [1.20.1] - 2026-10-06

### Changed

- The profile image upload limit and the allowed MIME list now come from a single shared source (`@workspace/shared/lib/image`). The backend `.env` (`MAX_PROFILE_IMAGE_BYTES`) still overrides the runtime limit; the frontend pre-check and its helper text are derived from the shared default.

## [1.20.0] - 2026-10-06

### Added

- `--report` mode for the asset variants command (`pnpm --filter @workspace/backend assets:backfill-variants -- --report`): read-only per-asset byte sizes for the original and each variant, plus what a character card and a chat avatar would download today and the aggregate savings percentages.

### Changed

- Profile image upload limit raised from 3 MB to 15 MB, both in the frontend validation and in the backend `MAX_PROFILE_IMAGE_BYTES` default. The decoded-pixel guard (40 MP) still protects processing.

## [1.19.0] - 2026-10-05

### Added

- Local WebP profile-image variants (`thumbnail` 128 px, `small` 384 px, `medium` 768 px) generated with Sharp for character profile uploads, chat custom-image uploads and imported characters. Original files remain unchanged and remain the source for editing/export.
- `GET /api/characters/:id/assets/:assetId?variant=...` serves an optimized variant with immutable browser caching; the existing URL still serves the original. Character cards use responsive `srcset`/`sizes`; chat avatars and edit previews use thumbnails.
- Idempotent asset backfill command: `pnpm --filter @workspace/backend assets:backfill-variants` (`--dry-run` reports planned variant count and bytes).
- Image decoded-pixel guard (`MAX_PROFILE_IMAGE_PIXELS`, default 40 MP) in addition to the existing upload byte limit. GIFs preserve animation and are served without static variants.

### Changed

- Character asset metadata records original image dimensions for accurate responsive source descriptors.

## [1.18.0] - 2026-08-12

### Added

- Welcome screen (PM.13): on the first launch the app asks for language, theme and color mode before entering. It is decided server-side from an `rm_onboarded` cookie (no flash of the app) and remembers the choice.
- Top menubar (PM.14): the header now has **Theme** (themes + mode) and **Language** (English/Spanish) menus, built on a new Base UI `menubar` component in `@workspace/ui`. The old icon switchers were removed.
- `setLocale` accepts `{ reload: false }` so the welcome screen can switch language instantly without reloading.

### Changed

- Language and theme selection moved from icon buttons to the top menubar.

## [1.17.1] - 2026-08-12

### Fixed

- Hardcoded accessibility labels now follow the UI language: the persona selector in the chat settings and the inference parameter sliders no longer announce Spanish/English fixed labels regardless of the selected language.

## [1.17.0] - 2026-08-12

### Added

- The LLM system prompt now follows the UI language: the frontend sends `Accept-Language` with every API request and the backend builds the prompt from translated `prompt.*` templates (English and Spanish), so the context preview is readable in the user's language.
- i18n of the character area (PM.11, phase 3): list, cards, context menu, form, export/import dialogs and image tools are translated into English and Spanish.
- i18n of memory (list, proposals, mode and auto-degradation), summaries and providers (manager, cards, instances, instance dialog, model combobox), plus translated page titles.
- New `characters`, `memory`, `summaries`, `providers`, `pages` and `prompt` namespaces in the shared dictionaries; `common` gains `saveChanges`, `error` and `untitled`.

### Changed

- Dates in summaries follow the UI locale instead of a hardcoded `es-ES`.
- `parseCharacterExport` reports its errors in the UI language.

## [1.16.0] - 2026-08-12

### Added

- i18n of the chat and conversation area (PM.11, phase 2): message bubbles and their context menu, the message input, confirmation dialogs, the context preview, the chat settings panel (History / Model / Customization / Persona), the model selector, the inference and summary cards and the customization tab are translated into English and Spanish.
- New `chat` and `settings` namespaces in the shared dictionaries (with `one`/`other` plurals for messages, characters, memories and summaries).
- The chat island receives the locale as a prop (Astro islands are independent React trees) and the conversation page resolves it from the `language` cookie.

### Fixed

- Stale tests: the character card menu label ("Conversación más reciente") and the theme registry test (`labelKey`).

## [1.15.0] - 2026-08-12

### Added

- i18n infrastructure (PM.11, phase 1): typed dictionaries in `@workspace/shared/i18n` (English as the base locale and source of truth for keys, Spanish typed against it), a pure `translate()` with `{param}` interpolation and `one`/`other` plurals, and an `I18nProvider` + `useTranslation` with `t`/`tRaw`.
- Language switcher in the app header, next to the theme picker. The language is stored in `localStorage` and in a `language` cookie so the server renders `<html lang>` and the right locale (the previously prerendered pages now render on demand). Because Astro islands are independent React trees, the translated islands receive `locale` as a prop and switching the language reloads the page.
- Pilot migration: the app shell/sidebar, the character list (toolbar, search, sort, empty states, toasts) and the "Personajes jugados" screen are translated.
- Backend error messages are now translated by `error.code` (new `errors.*` namespace) with a fallback to the raw backend message.
- Tests: dictionary key parity, `translate` (interpolation, plurals, fallback), the provider (persistence, cookie, `lang`) and the error helper.

### Changed

- The theme and mode labels are i18n keys instead of hardcoded strings.
- The default language is English; Spanish is available from the new switcher.

## [1.14.1] - 2026-08-12

### Fixed

- The player character selected in a conversation was never saved: the `PATCH /api/conversations/:id/settings` validation schema did not accept `playerCharacterId`, so the field was silently dropped and the AI never received the persona. The schema now accepts it (set/clear); verified end-to-end (the conversation stores it and the prompt context includes the `## Personaje del usuario` section).
- Chat bubbles collapsed line breaks, rendering multi-paragraph messages as a single line. `BubbleContent` now uses `whitespace-pre-wrap`, so newlines are preserved.

### Changed

- The "Personajes jugados" screen moved from `/settings/player-characters` to `/player-characters`, and its sidebar entry now lives under "Personajes" instead of "Sistema" (it is not a system setting).

## [1.14.0] - 2026-08-12

### Added

- User-played characters (PM.15): a new "Personajes jugados" settings screen (next to Proveedores) to create, edit and delete personas — a name and a description, with no versioning — and a new "Persona" option in the conversation settings to pick one per chat (or "Ninguna").
- The selected persona is included in the system prompt as a `## Personaje del usuario` section, so the AI knows who you are playing and addresses you accordingly. Branches inherit the origin's persona.
- `GET/POST/PUT/DELETE /api/player-characters` endpoints, the `PlayerCharacter` entity and repository, and Drizzle migration `0011_youthful_post.sql` (`player_characters` table plus `conversations.player_character_id`, a foreign key with `ON DELETE SET NULL` so deleting a persona never breaks a conversation).
- `ConversationSettingsUpdate.playerCharacterId` (set/clear, validated) and `ConversationDetail.playerCharacterId`.
- Tests: player character CRUD, prompt inclusion, the settings screen and the conversation selector.

## [1.13.2] - 2026-08-12

### Fixed

- Low-contrast text inside the user's own chat bubbles: italic action segments (`*…*`) and out-of-character segments (`//…//`) used `muted-foreground` and emerald colors meant for muted surfaces, which became unreadable on the `primary` bubble background in dark mode (and in the Bosque/Océano themes). Inside user bubbles they now inherit the bubble's own text color — actions keep the italics, OOC keeps the monospace — while assistant bubbles keep the previous subdued styling. Regression tests added for both roles.

## [1.13.1] - 2026-08-12

### Fixed

- `pnpm build` failed with `[NoAdapterInstalled]`: the dynamic routes (`characters/[id]`, `conversations/[id]`) render on demand but Astro had no adapter configured. Added `@astrojs/node` in `standalone` mode, so the build now emits a runnable Node server (`dist/server/entry.mjs`) alongside the prerendered pages in `dist/client/`. Verified by building and serving `/` from the built server (HTTP 200).

### Added

- `PRODUCT.md` at the repo root: the confirmed product record (users, purpose, positioning, operating context, capabilities, constraints and principles) for future design and product work.

## [1.13.0] - 2026-08-12

### Added

- Predefined color themes (PM.12): "Predeterminado", "Bosque" (green) and "Océano" (blue), each with composed light and dark variants defined as semantic token blocks under `[data-theme="…"]` / `[data-theme="…"].dark`. Switching a theme remaps the existing roles, so every Tailwind utility keeps working unchanged.
- Light / dark / system mode: the `.dark` class is now actually applied, follows the OS preference in "system" mode, persists in `localStorage`, and is applied before paint by an inline anti-flash script in `base.astro`.
- Theme switcher in the app header (palette icon) with "Tema" and "Modo" groups.
- Browser surfaces themed from the palette: `color-scheme`, `::selection` and `caret-color`.
- Tests for the theme registry and the theme provider (apply, persist, system preference, stored values, invalid values).

### Changed

- `sonner`'s `Toaster` receives the resolved theme as a prop instead of reading `next-themes` (which was never wired).

### Removed

- The unused `next-themes` dependency from `@workspace/ui`.

## [1.12.0] - 2026-08-12

### Added

- Swipe-to-regenerate (PM.16 follow-up): swiping an assistant bubble in the advance direction (left) when there is no newer alternative left now regenerates the message, as a shortcut to the context menu's "Regenerar". It only applies to the last assistant message and reuses the existing regenerate flow.

## [1.11.0] - 2026-08-12

### Added

- Swipe navigation for assistant message bubbles (PM.16): on touch devices, swiping a bubble left/right cycles its regeneration history (next/previous alternative), mirroring the `‹`/`›` footer controls. The gesture respects vertical scrolling (`touch-action: pan-y` + axis lock), only activates for touch pointers, and gives drag feedback before snapping back.
- New `useSwipeNavigation` hook (Pointer Events) with directional locking (no feedback/action when there is no alternative in that direction).
- Tests for the hook (8 cases) and for the message bubble wiring.

### Removed

- `chat-view.tsx` and `message-list.tsx`, which were dead code (the conversation page uses `Chat`; nothing imported them).

## [1.10.1] - 2026-08-12

### Fixed

- Character list header broke on small phone screens (≤320px): the title wrapped onto two lines and the "Importar personaje" / "Crear personaje" buttons were squeezed against it. The header now stacks vertically on mobile (title first, full-width buttons below) and returns to the single-row layout from `sm` upwards.

## [1.10.0] - 2026-08-12

### Added

- Character list toolbar (PM.18): a search bar (name and subtitle, case- and accent-insensitive, with result count and a "no matches" state) and a sort `Select` with four options — recency (newest/oldest) and last activity (newest/oldest, falling back to creation date when a character has no conversations). The default keeps the S18 recency order.
- The character cards are now laid out in a responsive CSS-columns masonry grid, so cards of different heights fit without gaps.
- New pure helper `lib/sort-characters.ts` (`sortCharacters` + `CharacterSortKey`) and tests for the search, the sort options and the no-results state.

### Changed

- `use-character-list` no longer sorts internally; sorting is applied by the list through the new helper and the toolbar state.

## [1.9.0] - 2026-08-12

### Added

- Character import (PM.8): a JSON exported through the S17 export manager can be imported in two ways — dropping it anywhere over the character list (an overlay invites you to drop the file) or via a new "Importar personaje" button next to "Crear personaje", which opens a dialog with a drop area and a file picker.
- New `POST /api/characters/imports` endpoint and `ImportCharacterUseCase`, which rebuilds the full round-trip: character + versions (with cards) + profile image (base64, re-created as a fresh asset) + conversations with messages, dynamic memories and summaries (all ids regenerated, `versionId`/message references remapped). It validates `kind`/`schemaVersion` and requires the character definition to be present.
- The character list is now sorted by recency (`max(createdAt, lastActivityAt)`, newest first), so the most recently created or most recently active character appears first and a freshly imported character lands at the top.
- Tests for `ImportCharacterUseCase`, for the JSON parser, the import dialog, the drag & drop overlay and the list sorting.

### Changed

- The JSON body parser limit is raised to 25 MB **only** for `POST /api/characters/imports` (global limit stays at 1 MB) so exports carrying a base64 image or long conversations can be imported.

## [1.8.0] - 2026-08-12

### Added

- Character export manager (PM.10 + PM.9): a new "Exportar…" action in the character card context menu opens a dialog with a hierarchical checkbox tree to pick what to export — definition (current version, cards included), profile image, version history, conversations and branches (with messages, dynamic memories, summaries and conversation settings), or a standalone settings template meant to be applied to another character. The backend assembles the selection and the frontend downloads it as a versioned JSON file (`schemaVersion: 1`, `kind: "character-export"`).
- New `POST /api/characters/:id/exports` endpoint and `ExportCharacterUseCase`, with backend-side hierarchy validation: a child section (e.g. `conversations.memories`) requires its parent (`conversations`), so a future import module can validate the file the same way.
- New `Checkbox` primitive in `@workspace/ui` (Base UI `Checkbox`).
- Tests for `ExportCharacterUseCase` (section combinations, hierarchy, base64 toggle, standalone fallback) and for the export dialog (tree defaults, strict hierarchy, select/deselect all, download).

## [1.7.1] - 2026-08-12

### Changed

- Character card layout tightened: cards use the `size="sm"` variant, the dark overlay over the cover image was removed for a cleaner look, and the footer spacing was reduced.

## [1.7.0] - 2026-08-12

### Added

- Story branches (PM.7): a new "Crear rama" action (Split icon) in the message context menu lets you start a new conversation from any message except the first one. The branch copies the messages up to and including the selected one (keeping only the displayed content, without regeneration history), copies the dynamic memories and the summaries whose range falls inside the branch (summary message references are remapped), inherits the origin's local settings (model, provider, instance, inference parameters, memory settings, custom profile image), and opens as a new untitled conversation.
- New `POST /api/conversations/:id/branches` endpoint and `BranchConversationUseCase`, which rejects branching from the first message.
- Tests for `BranchConversationUseCase` (message/memory/summary copy semantics, settings inheritance, summary range filtering, error cases).

## [1.6.1] - 2026-08-12

### Fixed

- Creating a character no longer starts at version 2. The create flow deferred the profile-image upload to a second `PUT /api/characters/:id` call, which went through `UpdateCharacterUseCase` and created a new version, so every character created with an image ended up at v2. New `PATCH /api/characters/:id/profile-image` (and `UpdateCharacterProfileImageUseCase`) attaches the image to the current version in place, without creating a new version; the frontend uses it during creation.

## [1.6.0] - 2026-08-12

### Added

- Unified character screen (PM.6): characters and their conversations are now grouped in a single card grid. Each card shows a large profile image, the character name, subtitle, current version, creation date, and last activity date.
- Clicking a card image opens the most recent conversation for that character; if there is none, a conversation is created with the current version and the chat is opened.
- Right-clicking a card opens a `ContextMenu` with: "Ir a la más reciente", a "Conversaciones" submenu (sorted by most recent), a "Nueva conversación" submenu where you pick a version (lazy-loaded), "Editar personaje", and "Eliminar personaje" (with confirmation dialog).
- Tests for the new card (rendering, image click, context menu actions, delete dialog) and for the list orchestrator (rendering, navigation, conversation creation).

### Removed

- The `/conversations` page and its sidebar entry are gone; conversations are reached from the character card. `pages/conversations/index.astro`, `conversation-list.tsx`, and `conversation-card.tsx` were deleted.
- The archive conversation feature (front + back): no UI, no `archive`/`unarchive` endpoints, no DB column. `Conversation.status` was removed from the domain entity, shared DTOs, and the `conversations` table (migration `0010_reflective_lord_hawal.sql`). Use cases that previously blocked operations on archived conversations no longer guard on status, and `ArchiveConversationUseCase` (plus its tests) was deleted.
- `ConversationArchivedError` and `ConversationAlreadyActiveError` from the backend error set.

### Changed

- `GET /api/conversations` no longer accepts a `status` query parameter (it returns all conversations).
- The `ConversationStatus` type was removed from `@workspace/shared`; `ConversationSummary` and `ConversationDetail` no longer expose `status`.

## [1.5.0] - 2026-08-06

### Changed

- Chat settings panel rebuilt for small screens: the right-side Sheet with three tabs is replaced by a `DropdownMenu` trigger whose items (Historia, Modelo, Personalización) each open a dedicated responsive `Dialog`. Content is unchanged; only the container changed.
- The "Restablecer valores" / "Aplicar cambios" footer now lives inside the Historia and Modelo dialogs; both are scoped to their own fields (Historia persists `summaryFrequency` / `recentMessageCount`, Modelo persists the inference parameters). Personalización keeps its own save flow.
- The "last opened tab" (`settings-tab`) is no longer persisted.

### Added

- New `DropdownMenu` primitive in `@workspace/ui` (Base UI `Menu`).
- The Historia accordion now remembers only the open items (`settings-accordion`); it defaults to all closed.

## [1.4.0] - 2026-08-06

### Added

- Per-conversation profile image override (PM.4): a new "Personalización" tab in the chat settings panel lets you replace the profile picture for a single conversation without creating a new character version.
- New `POST /api/conversations/:id/customization/profile-image` endpoint (multipart upload, reuses the filesystem asset storage and the 3 MB limit).
- `PATCH /api/conversations/:id/settings` now accepts `customProfileImageAssetId` (set/clear), validating that the referenced asset exists.
- Replacing or clearing the override garbage-collects the previous asset file and row; if the character is deleted (cascade), the effective image falls back to `null` without breaking the UI.
- Drizzle migration `0009_silly_the_hunter.sql` adds `custom_profile_image_asset_id` to `conversations`.
- Tests for the upload use case, the effective-image helper, and the Personalización tab.

### Changed

- DTO field renamed `characterProfileImageAssetId` → `profileImageAssetId` on `ConversationSummary` and `ConversationDetail`; frontend consumers updated accordingly.
- Chat settings now show three tabs: Historia / Modelo / Personalización.

## [1.3.2] - 2026-08-05

### Added

- Square image cropper (PM.2): selecting or dropping an image in the character form now opens a crop dialog. Users can pan and zoom to frame a square profile photo before it is uploaded.
- New `ImageCropperDialog` component (`react-easy-crop` based) with configurable aspect ratio (default `1` = square).
- Canvas-based crop utilities (`getCroppedImg`, `fileToDataUrl`, `blobToFile`) that produce a PNG `File` for the existing upload flow.

### Changed

- The dropzone no longer uploads the raw file directly; it routes the file through the crop dialog first. The rest of the upload flow (immediate upload on edit, deferred upload on create) is unchanged.

## [1.3.1] - 2026-08-05

### Added

- Drag & drop profile image dropzone in the character form (also supports click-to-select). Always visible in the "General" tab for both create and edit.
- New-character flow: the selected file is held in state and uploaded after the character is created, then the character is updated with the new asset id.
- The dropzone is structured so a cropper step (PM.2) can be added later.

### Removed

- The legacy `profileImage: string` (URL/data-URI) field is gone from all DTOs, the `CharacterVersion` entity, the character and conversation surfaces, and the database. `profileImageAssetId` is now the only image reference (offline-first: no external links).
- Dropped `profile_image` column from `character_versions` (migration `0008_superb_spencer_smythe.sql`).
- Removed the URL text input from the character form.

## [1.3.0] - 2026-08-04

### Added

- Profile image upload and storage: users can now upload PNG/JPEG/WEBP/GIF images (up to 3 MB) as profile photos. Files are stored on disk under `./data/characters/<characterId>/` with metadata in a new `character_assets` table.
- New `POST /api/characters/:id/assets` endpoint for multipart file upload (busboy-based).
- New `GET /api/characters/:id/assets/:assetId` endpoint for serving stored images.
- `profileImageAssetId` field on `CharacterVersionDTO`, `CreateCharacterInput`, and `UpdateCharacterInput` — backward compatible (existing URL-based `profileImage` still works).
- Profile image picker in the character form: file input with preview, upload button, and clear button (only shown when editing an existing character).
- Character card, chat header, conversation card, and chat-view surfaces now render the uploaded asset URL when `profileImageAssetId` is present, falling back to the `profileImage` URL.
- Drizzle migration `0007_sour_silverclaw.sql` adds `character_assets` table and `profile_image_asset_id` column to `character_versions`.
- New environment variables: `DATA_DIR` (default `./data`) and `MAX_PROFILE_IMAGE_BYTES` (default 3 MB).
- Backend tests for image validation, filesystem storage, upload/get use cases, and multipart parsing.

## [1.2.0] - 2026-08-04

### Added

- Memory list shows the **effective (decayed) importance** in a color-coded badge: still in the prompt (outline), excluded from the prompt (secondary), or deletion candidate (destructive). Hover shows the stored importance and turns elapsed since the last update.
- Memory list **auto-refreshes after each new message**, so silent-mode sweeps are visible without reopening the panel.
- Shared memory-decay helpers (`@workspace/shared/lib/memory-decay`) used by both backend and frontend, keeping the decay math in a single place.
- Automated tests for the decay flow: policy math, prompt filtering, silent/manual/off sweep integration, and frontend store/display logic.

### Changed

- Decay turns now count only **user messages**; assistant replies no longer wear memories down twice as fast.
- Decay settings inputs in the settings panel stack vertically instead of squeezing into three columns (previously released as a fix).

## [1.1.0] - 2026-07-31

### Added

- S10 — Memory decay (auto-degradation of dynamic memories): memories lose -1 importance every N turns without being updated (configurable per conversation, default 10 turns). Memories whose effective importance falls at or below the threshold (default 3) are excluded from the prompt and become candidates for deletion.
- Per-conversation decay settings: silent/manual/off mode, importance threshold (1-10), turns before deleting below-threshold memories (default 30), and turns per -1 importance.
- Silent mode: automatic sweep after each message. Manual mode: "Run cleanup now" button that deletes all candidates, plus individual memory deletion. Off mode: no deletion, prompt filtering stays active.
- Endpoint `POST /api/conversations/:id/memories/decay` (manual sweep).
- Memory list refreshes automatically after a sweep and shows the last cleanup timestamp and count.

## [1.0.0] - 2026-07-31

### Added

- S1 — Configure default provider (AI provider registry and initial setup).
- S2 — Character management + app shell (character CRUD, navigation, and layout).
- S3 — Send and receive messages (SSE streaming, generation state).
- S4 — Character editing and conversation loading.
- S5 — Regenerate, edit, rewind, delete, continue, and response alternative cycling.
- S6 — Dynamic memory with Auto/Manual modes.
- S7 — Summaries (synopsis) of long conversations.
- S8 — Context (prompt) inspection and conversation titles.
- S9 — Cross-cutting polish for v1.0 (16 tasks: UX, bugs, validation, sorting, responsive).

### Changed

- Project license: AGPL-3.0-or-later.
- Install and startup scripts for end users (`scripts/install.*` and `scripts/start.*`).

### Fixed

- Regeneration history: persistence of the original content and version counter (S9.10.5).
- Hydration mismatch in the `usePersistedValue` hook (chat draft).
- Providers screen: O-llama error on load and general UX (S9.6).
