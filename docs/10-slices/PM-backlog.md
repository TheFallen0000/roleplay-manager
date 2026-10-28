# PM Backlog — Post-MVP

Backlog of features deferred past v1.0. Items here are not committed to a
release; they are promoted to a slice (`S11`, `S12`, …) when picked up.

See `S9-plan.md` for the v1.0 polish tasks and the rationale for deferring
these. The dependency graph below reflects which PMs must land together or in
sequence.

Last updated: 2026-10-28

> **Review (S71 sweep, 2026-10-12):** the whole slice history was swept for
> deferrals; the stale notes were refreshed and the surviving items added as
> **PM.25–PM.32**. The GitHub-topics task (S58) was applied by hand and is closed.

> **Review (S84 sweep, 2026-10-26):** the slice history was swept again after
> S84. The stale “pending release” notes were updated (S73–S78 shipped in
> v1.46.0), the surviving deferrals were promoted as **PM.34–PM.44**, and the
> low-value items were explicitly discarded. Manual checks that need real
> hardware are listed at the end of this file too.

## Images & media

| # | Proposal | Dependencies |
|---|----------|--------------|
| PM.1 | Import images and store them in the DB (not just links) for the profile photo. <br>*Done as S11 (v1.3.0) — see `S11-progress.md`.* | New column/table, storage |
| PM.2 | Add an image cropper for the profile photo. <br>*Done as S12 (v1.3.2) — see `S12-progress.md`.* | PM.1 |
| PM.3 | Image compressor for the background image and square-section cropper. <br>*Done as S30 (v1.22.0) — see `S30-progress.md`.* | PM.1 |
| PM.4 | Modify the profile image without creating a new character version. <br>*Done as S13 (v1.4.0) — see `S13-progress.md`.* | PM.1 |
| PM.5 | Allow choosing a background image for the chat (default: profile photo), with fit modes (fill, crop, etc.). <br>*Done as S30 (v1.22.0) with **no default background** and Cover/Contain fit; export/import deduplication done as S31 (v1.23.0). See `S30-progress.md` and `S31-progress.md`.* | PM.1 |
| PM.19 | Generate and serve responsive local variants of existing profile images for character cards and chat avatars, without changing the original asset. <br>*Done as S28 (v1.19.0) — see `S28-progress.md`.* | PM.1 |

> **PM.3 + PM.5 (S30 + S31) — done (2026-10-06, v1.22.0 / v1.23.0):** The chat background is
> opt-in from Customization (upload + 16:9 cropper), with Cover/Contain fit, a 0–100 overlay
> slider, live preview and removal; branches inherit it. There is no default background.
> Delivery reuses the S28 variant pipeline with a new `large` (1920 px) background variant, and
> shared assets are only deleted when no conversation references them. S31 completes the cycle:
> conversation images (custom profile image + background) travel once per unique asset in the
> export, are recreated once on import and remapped to every branch, with fit/overlay and
> legacy-export compatibility. See `S30-progress.md` and `S31-progress.md`.

> **PM.19 (S28) — done (2026-10-05, v1.19.0):** Profile image originals remain unchanged;
> local WebP variants are generated for uploads/imports, and existing assets can be
> backfilled with the idempotent `pnpm --filter @workspace/backend
> assets:backfill-variants` command. Character cards use bounded `srcset` candidates,
> chat avatars use the thumbnail, and GIFs continue to use their original animated file.
> This optimizes the existing profile-image flow only; it does **not** complete PM.3 or
> PM.5 (background image selection/compression/cropping), which remain deferred.

## Grouping & navigation

| # | Proposal | Dependencies |
|---|----------|--------------|
| PM.6 | Group conversations by character in a single card. Use a ContextMenu for submenus: create a conversation choosing a version, edit the character, pick an associated conversation (sorted by most recent). "Go to most recent" option. <br>*Done as S15 (v1.6.0) — see `S15-progress.md`.* | — |
| PM.7 | Story branches in a single conversation with a visual interface. <br>*Branching done as S16 (v1.7.0) — see `S16-progress.md`. The visual branch-tree interface is **discarded** (see note below).* | — |

> **PM.6 (S15) — done (2026-08-12, v1.6.0):** The separate `/conversations` screen is gone.
> Characters and their conversations now live in a single card grid on the home screen. Each
> card shows the profile image, name, current version, creation date and last activity; a
> click on the image opens the most recent conversation (creating it with the current
> version when none exists), and a right-click opens a `ContextMenu` with "Go to most
> recent", a conversations submenu (sorted by most recent), a "New conversation" submenu
> where you pick a version (lazy-loaded), "Edit character", and "Delete character" (with
> confirmation). The archive-conversation feature was removed entirely (front + back). See
> `S15-progress.md`.

> **PM.7 (S16) — done (2026-08-12, v1.7.0):** A new "Crear rama" action (Split icon) in the
> message context menu creates a new conversation from any message except the first one. The
> branch copies messages 0..N (displayed content only, no regeneration history), inherits the
> origin's local settings (model, provider, inference params, memory settings, custom profile
> image), starts untitled, and opens in a new chat. Backend endpoint
> `POST /api/conversations/:id/branches`. The remaining part of PM.7 — a visual branch-tree
> interface — is **deferred** (see note below). See `S16-progress.md`.

> **PM.7 visual interface — discarded (2026-10-06):** The branching action shipped in S16
> (v1.7.0) and covers the real use cases; after checking with users, the visual branch-tree
> interface is rarely used and the current flow is more than enough, so it is dropped from
> the backlog. The branch provenance columns it would have required
> (`branchedFromConversationId` / `branchedFromMessageId`) are no longer needed either.

## Export / Import

| # | Proposal | Dependencies |
|---|----------|--------------|
| PM.8 | Import a character from a file (drag & drop or file picker). <br>*Done as S18 (v1.9.0) — see `S18-progress.md`.* | — |
| PM.9 | Export conversations. <br>*Done as part of S17 (v1.8.0) — see `S17-progress.md`.* | — |
| PM.10 | Export manager: export character definition, specific versions, associated conversations, dynamic memory, summaries, settings. Accessible from the ContextMenu of the character list. <br>*Done as S17 (v1.8.0) — see `S17-progress.md`.* | PM.8, PM.9 |
| PM.20 | Apply an exported settings template (`standaloneSettings`) to all conversations of an existing character. <br>*Done as S29 (v1.21.0) — see `S29-progress.md`.* | PM.10 |
| PM.28 | Export/import **personas** (user-level, so they do not travel inside a character export). <br>*Done as S74 (v1.46.0) — see `S74-progress.md`.* | — |
| PM.29 | Carry `customProfileImageAssetId` inside the settings template (`standaloneSettings`) so “Apply settings…” also brings the custom chat image. <br>*Done as S78 (v1.46.0) — see `S78-progress.md`.* | PM.20 |
| PM.30 | Import conflict handling by name (replace/merge) instead of always creating duplicates. <br>*Discarded (2026-10-13): duplicates are acceptable for now; revisit only if a real issue shows up.* | PM.8 |

> **PM.8 (S18) — done (2026-08-12, v1.9.0):** A JSON exported from the S17 export manager can be
> imported by dropping it over the character list (an overlay invites you to drop the file) or
> through a new "Importar personaje" button that opens a dialog with a drop area and a file
> picker. `POST /api/characters/imports` rebuilds the full round-trip — character, versions
> (cards included), profile image (base64 → new asset) and conversations with messages,
> memories and summaries — regenerating ids and remapping references, validating
> `kind`/`schemaVersion` and requiring the character definition. The character list is now
> sorted by recency (`max(createdAt, lastActivityAt)`, newest first) so the imported character
> lands first. Importing settings into an existing character (`standaloneSettings`) is out of
> scope for this slice. See `S18-progress.md`.

> **PM.9 + PM.10 (S17) — done (2026-08-12, v1.8.0):** The character card context menu now has an
> "Exportar…" action that opens an export manager dialog with a hierarchical checkbox tree:
> definition (current version, cards included), profile image (base64), version history,
> conversations and branches (messages, dynamic memories, summaries and settings), and a
> standalone settings template meant to be applied to another character. The backend assembles a
> versioned JSON (`schemaVersion: 1`, `kind: "character-export"`) and enforces the same parent →
> child hierarchy a future import module will validate. PM.9 (export conversations) is covered by
> the "Conversaciones y ramas" section. PM.8 (import) is still pending and is the remaining half
> of the round-trip. See `S17-progress.md`.

> **PM.20 (S29) — done (2026-10-06, v1.21.0):** The settings template produced by the export
> manager can now be applied to an existing character from its context menu ("Aplicar
> ajustes…"). The dialog accepts the JSON (drop or picker), summarizes it and applies it to all
> conversations of the character through the existing settings validation. If the template's
> provider instance does not exist locally, the destination provider and model are kept and the
> user is warned; unsupported providers behave the same. This closes the S18 gap where the
> template was exported but never imported. See `S29-progress.md`.

> **PM.28 (S74) — done (2026-10-13, v1.46.0):** Personas export as standalone
> `player-character-export` JSON files from each card and import through a drop-or-pick dialog
> that validates kind, schema version and fields with translated errors; duplicates are allowed
> (conflict handling stays in PM.30). No backend changes: the existing create endpoint does the
> work. See `S74-progress.md`.

> **PM.29 (S78) — done (2026-10-13, v1.46.0):** Settings templates carry the custom chat
> image (id plus base64); applying one recreates the asset on the destination character (or
> reuses a local one, or warns `CUSTOM_IMAGE_NOT_FOUND`), and `null` removes it. The E2E that
> verified it also uncovered a long-standing double-encoding of `stop_sequences` on settings
> saves, fixed in the same slice (rows heal on read). See `S78-progress.md`.

> **PM.30 — discarded (2026-10-13):** Import conflict handling (replace/merge by name) is
> dropped: the user is fine with duplicates for now, and the feature would add a decision step to
> a flow that is currently one click. It can be revisited if duplicates ever become an issue in
> practice.

## Multi-language & themes

| # | Proposal | Dependencies |
|---|----------|--------------|
| PM.11 | Multi-language support, default English. <br>*Done as S24 (v1.15.0), S25 (v1.16.0) and S26 (v1.17.0): infrastructure + pilot, the chat area, characters, memory, summaries, providers, page titles and the LLM prompt following the UI language. PM.13/PM.14 land in S27.* | — |
| PM.12 | Predefined color themes. <br>*Done as S22 (v1.13.0) — see `S22-progress.md`.* | — |
| PM.13 | Welcome screen that asks for language and theme on first launch. <br>*Done as S27 (v1.18.0) — see `S27-progress.md`.* | PM.11, PM.12 |
| PM.14 | Top menubar to pick language and theme. <br>*Done as S27 (v1.18.0) — theme picker delivered in S22, language and the menubar in S27. See `S27-progress.md`.* | PM.11, PM.12 |

> **PM.13 + PM.14 (S27) — done (2026-08-12, v1.18.0):** The first launch now shows a
> full-screen welcome (language, theme and color mode) decided server-side from an
> `rm_onboarded` cookie, so there is no flash of the app. The header hosts a menubar with
> **Tema** (themes + mode) and **Idioma** (English/Spanish) menus built on a new Base UI
> `menubar` component; it replaced the old icon switchers, and the theme picker delivered in
> S22 moved into it. See `S27-progress.md`.

> **PM.12 (S22) — done (2026-08-12, v1.13.0):** Three themes ("Predeterminado",
> "Bosque", "Océano") defined as semantic CSS token blocks under
> `[data-theme="…"]` / `[data-theme="…"].dark`, plus light/dark/system mode
> applied via the `.dark` class, persisted in `localStorage`, resolved from the
> OS preference, and applied before paint by an inline anti-flash script. A
> minimal theme + mode switcher lives in the app header; PM.14 will move it to
> the top menubar. `sonner` now follows the resolved mode and the unused
> `next-themes` dependency was removed. See `S22-progress.md`.

## New features

| # | Proposal | Dependencies |
|---|----------|--------------|
| PM.15 | User-played characters (name and description, no version required). <br>*Done as S23 (v1.14.0) — see `S23-progress.md`.* | — |
| PM.16 | Swipe the message bubble left/right to navigate the regeneration history (mobile). <br>*Done as S20 (v1.11.0); swipe-to-regenerate added in S21 (v1.12.0) — see `S21-progress.md`.* | S9.16 |

> **PM.15 (S23) — done (2026-08-12, v1.14.0):** A "Personajes jugados" settings
> screen manages personas (name + description, no versions) and each conversation
> picks one from its settings. The chosen persona is added to the system prompt
> (`## Personaje del usuario`) so the AI knows who the user is playing; branches
> inherit it. `conversations.player_character_id` is a `SET NULL` foreign key, so
> deleting a persona never breaks a conversation. Exporting/importing personas is
> out of scope (they are user-level, not part of a character). See
> `S23-progress.md`.

## Context window & agent engine

| # | Proposal | Dependencies |
|---|----------|--------------|
| PM.51 | **Context window metadata and usage indicator**: per-model/conversation `contextWindow` (auto-detect from Ollama `/api/show`, manual presets for OpenAI-compatible and unknown models), conservative token estimation, percentage indicator in the chat and context preview, warning for small windows (< 8k, configurable) and for a `maxTokens` that cannot fit. <br>*Done as S121 (2026-10-28, unreleased) — see `S121-progress.md`.* | — |
| PM.52 | **Automatic compaction**: estimate the prompt before sending; at 80 % (configurable) summarize the oldest messages, rebuild the context with the summary plus the newest messages that fit, show “Compacting context…” and continue. Summary budget and chunking, fallback to trimming with a warning, and a clear error when the system prompt alone does not fit. Replace `summaryFrequency` and remove the message-count controls from the UI. <br>*Done as S122 (2026-10-28, unreleased) — see `S122-progress.md`.* | PM.51 |
| PM.53 | **Internal ChatEngine (harness)**: extract prompt assembly, context budget, provider call/stream and tool loop shared by `send`, `continue` and `regenerate` into an internal engine; document the REST/SSE contract for external consumers (VTuber, phone). No repo/package split yet. | PM.51, PM.52 |
| PM.54 | **Reusable engine package or external service** only if a second consumer appears (VTuber runtime, separate headless service). The phone already runs the backend; PM.54 waits for a real need. | PM.53 |

> **Context + harness decisions (2026-10-28):**
>
> - **Automatic compaction with a visible notice.** At the threshold the app
>   summarizes the oldest messages, shows “Compacting context…” and continues;
>   it does not pause the conversation. If the summary fails, it trims the
>   oldest messages and warns instead of sending an oversized prompt. If the
>   system prompt alone does not fit, it stops with a clear error.
> - **Context window source.** Auto-detect when the provider exposes it
>   (Ollama `/api/show`); manual presets (4k, 8k, 16k, 32k, 128k) otherwise.
>   Warn when the window is unknown or small. `maxTokens` is the output budget,
>   not the input budget; the UI must not allow input + output to exceed the
>   window.
> - **Replace the message-count settings.** `summaryFrequency` is replaced by
>   the percentage threshold and disappears from the UI. `recentMessageCount`
>   also disappears from the normal UI: the engine keeps the newest messages
>   that fit the token budget. Keep both columns in the DB and export schema
>   for backward compatibility until a migration; keep them as an
>   advanced/debug cap if useful.
> - **Summary timing.** Today the summary runs after the reply. Compaction must
>   run before the next send (or immediately after the previous reply) so it can
>   prevent the overflow. The summary needs its own output budget and chunked
>   input for long transcripts; it uses the same provider/model by default.
> - **Token estimation.** Start with a conservative heuristic (`chars / 3`
>   with a safety margin) and no tokenizer dependency. Calibrate with Ollama
>   `prompt_eval_count`/`eval_count` or OpenAI `usage` where available.
> - **Indicator.** Percentage in the chat header/composer plus a breakdown in
>   the context preview: system, summary, memories, recent messages, pending
>   message and output reserve.
> - **Harness.** The orchestration layer already exists inside
>   `application/` + `PromptContextBuilder` + provider ports; the hexagonal
>   architecture is the boundary. Do not split the repository now: the phone
>   already consumes the backend and a VTuber can consume the SSE. Extract an
>   internal `ChatEngine` and document the API/SSE contract first. Move it to
>   `packages/engine` or a separate service only when a second consumer exists
>   (PM.54).
> - **Slice order.** **S121** = PM.51 (window, estimate, warning, indicator);
>   **S122** = PM.52 (auto-compaction, summary chunking, remove the
>   message-count UI); **S123** = PM.53 (internal engine + API contract).
>   PM.54 waits for a real second consumer.
> - **No release for this block.** The slices accumulate under `[Unreleased]`
>   with the rest of the batched changes.

> **PM.51 (S121) — done (2026-10-28, unreleased):** each conversation stores its
> context window, Ollama detection reads `/api/show`, the chat header shows the
> live percentage (draft included) and the preview breaks it down. The window
> travels in exports, templates and branches; migration `0016` adds the column.
> `summaryFrequency` and `recentMessageCount` stay in the UI until S122, and
> automatic compaction is not part of this slice. See `S121-progress.md`.

> **PM.52 (S122) — done (2026-10-28, unreleased):** before sending, the app
> compacts when the estimated context reaches the per-conversation threshold
> (80 % by default, target 60 %), summarizes the oldest messages in chunks,
> keeps the newest that fit and warns when it has to trim. The UI shows
> “Compacting context…” and a dismissible warning when the window is unknown.
> `summaryFrequency` and `recentMessageCount` are no longer in the UI (the
> columns and export fields remain). Migration `0017` adds the threshold. See
> `S122-progress.md`.

## Remote access & mobile

| # | Proposal | Dependencies |
|---|----------|--------------|
| PM.21 | Access the app from a phone anywhere while it keeps running on the user's computer, without deploying to a server or exposing ports. <br>*Done as S33 (v1.25.0): **Tailscale + Serve** (private, no domain), toggled from the app's Phone menu with a QR. See `S33-progress.md`.* | — |
| PM.22 | Quick phone connection over the home network (same Wi-Fi): a "Home network" tab in the Phone dialog with its own URL and QR, alongside the Tailscale one. <br>*Done as S38 (v1.26.0): toggleable LAN sharing through a backend proxy (`LAN_PORT`, default 4322), with QR, address selector and firewall notes. See `S38-progress.md`.* | PM.21 |
| PM.26 | Own **PWA install button** in the app (`beforeinstallprompt`, with a tutorial fallback for iOS and hidden once installed), plus the minimal pass-through service worker Chrome Android needs for a real (WebAPK) install. <br>*Done as S72 (v1.45.0) — see `S72-progress.md`.* | S54 (manifest) |
| PM.32 | Manifest extras for the install experience: `screenshots` (rich install dialog on Android), `shortcuts` and `display_override`. <br>*Done as S77 (v1.46.0) — see `S77-progress.md`.* | PM.26 |

> **PM.21 (S32 + S33) — done (2026-10-06, v1.24.0 / v1.25.0):** **Tailscale + Serve** was
> chosen (private tailnet, nothing exposed to the internet, no domain, phone installs the
> Tailscale app once). S32 delivered the prerequisite (same-origin `/api` proxy through an
> Astro middleware, so a single tunnel of the frontend port exposes the whole app and LAN
> access works). S33 delivered the **Phone menu**: connection toggle, QR with the private URL,
> copy link and a first-run guide, driven by the backend through the Tailscale CLI. The
> deferrals listed back then are closed: auto-enable/auto-disable options landed in S56
> (v1.36.0) and the PWA manifest in S54 (v1.35.0). See `S32-progress.md`, `S33-progress.md`
> and `remote-access-opt.md`.

> **PM.22 (S38) — done (2026-10-06, v1.26.0):** The Phone dialog gained a **Home network** tab,
> **off by default** and toggled at runtime through a small backend proxy (`LAN_PORT`, default
> 4322) that forwards to the local app keeping the `Host`, so the frontend stays bound to
> localhost. It shows its own QR/link, an **address selector** when the PC has several private
> IPv4 interfaces (virtual adapters and Tailscale's CGNAT are filtered out) and notes about
> trusted networks and the Windows firewall. Plain HTTP means the clipboard uses a legacy
> fallback. The same-origin `/api` proxy (S32) made this work with no CORS changes. See
> `S38-progress.md`. *(Update: the PWA manifest and install icons landed in S54, v1.35.0, and
> the in-app install button is PM.26.)*

## System & maintenance

| # | Proposal | Dependencies |
|---|----------|--------------|
| PM.24 | Packaging & distribution: decide and build how the app ships to end users (portable folder with a bundled runtime, desktop shell or Docker), including the GitHub Releases pipeline the updater consumes. <br>*Done as S40/S41/S42/S43 (v1.28.0 / v1.29.0 / v1.30.0 / v1.31.0): single-process build, portable Windows x64 package, release CI and the release-based updater. See `S40-progress.md` … `S43-progress.md`.* | — |
| PM.23 | In-app updates: an "Updates" screen under the sidebar's **System** section that detects a new published release, shows a badge and a one-time notice on the characters screen, and can apply the update with an automatic backup and restart guidance. <br>*Done as S39/S43 (v1.27.0 / v1.31.0): git-based detection + apply for developers, and the release-based updater for the packaged build (download → install in `versions/<v>` → switch `current` → restart), automatic backups, updates screen, sidebar badge and one-time notice. See `S39-progress.md` and `S43-progress.md`.* | PM.24 |
| PM.25 | **Rollback button** in the Updates panel: switch `current` back to the previous `versions/<v>` folder (the mechanics exist; only the endpoint and the UI are missing). <br>*Done as S72 (v1.45.0) — see `S72-progress.md`.* | PM.23, PM.24 |
| PM.31 | More tolerant parser for the `memory_proposals` block (LLM format variations), with tests for odd shapes. <br>*Done as S76 (v1.46.0) — see `S76-progress.md`.* | — |
| PM.46 | Migrate the backend to Express 5: `req.query` is now a read-only getter, so `validate` must stop reassigning it; review routing, error handling and body parsing, then run every route. <br>*Done as S98 (v1.54.3) — see `S98-progress.md`.* | — |
| PM.47 | Upgrade `better-sqlite3` 12 → 13 (N-API, prebuilt binaries and packaging on every platform). <br>*Done as S99 (v1.54.4) — see `S99-progress.md`.* | PM.24 |
| PM.48 | Upgrade the logging stack: `pino` 10, `pino-http` 11, `pino-pretty` 13 and `uuid` 14. Test rotation, redaction, transports and ESM imports. <br>*Done as S100 (v1.54.5) — see `S100-progress.md`.* | — |
| PM.49 | Upgrade TypeScript 7 and `@types/node` 26 when Astro supports TypeScript 7 and the bundled runtime moves to Node 26. <br>*Blocked: `astro check` rejects TypeScript 7 and the app still bundles Node 24.* | PM.24 |
| PM.50 | Upgrade `prettier-plugin-astro` 1.x and reformat the Astro files. <br>*Done as S101 (v1.54.6) — see `S101-progress.md`.* | — |

> **PM.46 (S98) — done (2026-10-27, v1.54.3):** Express 5.3.0 is in place.
> `validate` now defines an own request property because `req.query` is a
> read-only getter; the query parser stays on `simple`. No route changes were
> needed, and the packaged API (19/19 checks) and UI smoke tests pass. See
> `S98-progress.md`.

> **PM.47 (S99) — done (2026-10-27, v1.54.4):** `better-sqlite3` 13.0.3 is in
> place with N-API prebuilds for every release target. There are no schema or
> API changes, and the five-platform release dry-run passed (Windows, Linux
> x64/arm64 and macOS x64/arm64). See `S99-progress.md`.

> **PM.48 (S100) — done (2026-10-27, v1.54.5):** pino 10.4, pino-http 11,
> pino-pretty 13.2 and uuid 14 are in place. pino and pino-http have to land
> together because of their type coupling; uuid 14 is ESM-only and ships its
> own types, so `@types/uuid` was removed. Rotation, redaction and the dev
> pretty transport were verified. See `S100-progress.md`.

> **PM.50 (S101) — done (2026-10-27, v1.54.6):** `prettier-plugin-astro` 1.1.2
> reformats the Astro files with the Astro 7 Rust compiler. `astroCompressHTML:
> "jsx"` mirrors the framework default, and the rendered text of six website
> pages matches the live v1.54.5 build. See `S101-progress.md`.

> **PM.25 + PM.26 (S72) — done (2026-10-12, v1.45.0):** The Updates panel can roll back to the
> previous `versions/<v>` (confirmation dialog, restart needed, data untouched; the git adapter
> hides it) and the app finally has its own install entry points — the welcome screen and the
> Phone menu — that fire the native `beforeinstallprompt` when the browser captured it and link
> to the tutorial on iOS. A minimal pass-through service worker (no caching) makes Chrome
> Android offer a real WebAPK install, and the PWA tutorial was corrected: installing requires
> the HTTPS Tailscale address, not the home network. See `S72-progress.md`.

> **PM.32 (S77) — done (2026-10-13, v1.46.0):** The manifest declares real install
> screenshots (library and visual-novel chat wide at 1440x810, chat narrow at 720x1280) captured
> from the packaged app with synthetic, import-seeded content, plus three shortcuts (Tutoriales,
> Proveedores, Registro). `display_override` was dropped: with no window-controls-overlay UI it
> adds nothing visible. See `S77-progress.md`.

> **PM.31 (S76) — done (2026-10-13, v1.46.0):** The `memory_proposals` block parser now
> tolerates drifted labels (caps, hyphens, spaces), unterminated blocks (responses cut
> mid-block), trailing commas, prose around the array, an object wrapper and lower-cased
> operations; it strips every block and logs a warning with a sample when one cannot be read.
> See `S76-progress.md`.

> **PM.23 — phase 1 done (S39, 2026-10-07, v1.27.0):** The **Updates** screen (System), the
> sidebar badge, the one-time notice on the characters screen and the automatic backup are in
> place, with a **git adapter**: `git fetch` + compare `HEAD` with `origin/<branch>`, remote
> version from the remote `package.json` and the list of new commits; applying runs
> `git pull --ff-only` + `pnpm install` as a background job (backup → pull → install) and asks
> to restart. It blocks a dirty working tree. Security note: applying pulls and runs code
> published by the repository. **Phase 2** (release-based, for the packaged build of PM.24)
> reuses the same UI and swaps only the detection/apply adapter.

> **PM.24 — decisions (2026-10-07):** The app will ship as a **portable folder for Windows x64**
> with a bundled Node runtime (users install nothing). It runs as a **single process**: the Astro
> server is built in `middleware` mode and mounted inside Express, so one port serves the UI and
> the API (the `/api` proxy becomes unnecessary in production). User data (`data/`, `backups/`)
> lives **inside the portable folder** and the launcher resolves those paths relative to the
> root, so updates never touch them. Updates use **versioned folders plus a `current` pointer**
> (`versions/<v>/`), which makes rollback trivial and avoids replacing locked files on Windows.
> Phases: **A** single-process entrypoint, **B** packaging script + artifact (Windows x64),
> **C** release CI, **D** release-based updater (PM.23 phase 2). Design: `packaging-opt.md`.

> **PM.24 — phase A done (S40, 2026-10-07, v1.28.0):** Production can run as a **single process**:
> the Astro `middleware` handler is mounted inside Express (after `/api`), the static build is
> served by the host (`express.static`, since Astro does not serve it in this mode) and the SSR
> API base is configurable at runtime with `PUBLIC_API_URL`. Remaining: **B** packaging script +
> artifact, **C** release CI, **D** release-based updater. See `S40-progress.md`.

> **PM.24 — phase B done (S41, 2026-10-07, v1.29.0):** `pnpm package:win` produces
> `release/roleplay-manager-<version>-win-x64.zip` (~165 MB unpacked): a bundled Node runtime,
> the backend bundled with esbuild (natives external, migrations shipped), the frontend build
> and a **hoisted** `node_modules` whose runtime deps are derived by scanning the SSR build's
> external imports. `start.cmd` resolves the data paths relative to the portable root and the
> smoke test runs it with the bundled runtime and a stripped `PATH`. This also fixed the
> production start, which had never worked (`tsc` output path, missing migrations, TS shared
> package). Remaining: **C** release CI, **D** release-based updater. See `S41-progress.md`.

> **PM.24 — phase C done (S42, 2026-10-07, v1.30.0):** A GitHub Actions workflow
> (`.github/workflows/release.yml`) publishes the package on `v*` tags: it verifies the tag
> against `package.json`, runs the quality gates and tests, packages, smoke-tests the artifact
> and creates the release with the CHANGELOG notes (`workflow_dispatch` runs it as a dry run).
> The artifact contract (tag, asset name, notes) is documented in `packaging-opt.md`. Remaining:
> **D** release-based updater. See `S42-progress.md`.

> **PM.24 — phase D done (S43, 2026-10-07, v1.31.0):** The packaged app updates itself from
> **published releases**. The container picks `ReleaseUpdateAdapter` when `RM_PACKAGED_ROOT` is set
> (the launcher does) and keeps the git adapter for developers; both share the S39 UI. Detection
> reads the latest GitHub Release (public API), compares the tag with `current` numerically and
> shows the release notes; applying runs `backup → download → install → done`, extracting into
> `versions/.staging-<v>` and renaming to `versions/<v>` before switching `current`, so the running
> version is never touched and the previous one stays for rollback. This completes **PM.24** and
> **PM.23** (phase 2). See `S43-progress.md`. The UI button to roll back was deferred; it is
> **PM.25**.

> **S97 — dependency maintenance (2026-10-27, v1.54.2):** Dependabot now groups
> only patch/minor updates; majors arrive as individual PRs. The safe updates
> are merged and `pnpm audit --prod` is clean. Express 5, `better-sqlite3` 13,
> the pino/uuid majors, TypeScript 7 and `prettier-plugin-astro` 1.x remain as
> **PM.46–PM.50**. PM.46 was completed in S98, PM.47 in S99, PM.48 in S100 and
> PM.50 in S101; PM.49 remains blocked by Astro/Node. See `S97-progress.md`.

## UI polish

| # | Proposal | Dependencies |
|---|----------|--------------|
| PM.17 | Settings panel responsive redesign: Sheet → DropdownMenu of three dialogs (Historia / Modelo / Personalización). <br>*Done as S14 (v1.5.0) — see `S14-progress.md`.* | — |
| PM.18 | Character list toolbar: a search bar and a sort `Select` (by most recent conversation → oldest and vice versa) below the header, plus a masonry grid layout for the character cards. <br>*Done as S19 (v1.10.0) — see `S19-progress.md`.* | — |
| PM.27 | Redesign the **Providers** and **Player characters** screens with the Ink & Violet language: they inherit the tokens but kept the pre-redesign layout. <br>*Done as S73 (v1.46.0) — see `S73-progress.md`.* | S59 (tokens) |
| PM.33 | Chat scroll polish: the `MessageScroller` content closes with a ~400px trailing spacer, so opening a conversation parks the last message well above the composer (one scroll fixes it). Consider anchoring the end just above the composer on load. <br>*Done as S78 (v1.46.0) — see `S78-progress.md`.* | — |

> **PM.27 (S73) — done (2026-10-13, v1.46.0):** Proveedores and Personajes jugados now
> speak the Ink & Violet language — display headings with a lede, an ink plate for the current
> provider/model, icon plates and state-dot chips on the provider cards, instances as rows (no
> nested card) and persona plates with a Dela Gothic monogram plus a mascot empty state. No
> functional changes. This is the first slice shipped through the batched `[Unreleased]` flow.
> See `S73-progress.md`.

> **PM.33 (S78) — done (2026-10-13, v1.46.0):** The chat aligns the last message's end
> with the viewport when a conversation loads (`scrollToEnd({ align: "end" })` through the
> primitive's own hook), removing the ~400px gap the trailing spacer produced. Measured with a
> 12-message conversation: gap 0 (before: +396). See `S78-progress.md`.

> **PM.17 (S14) — done (2026-08-12, v1.5.0):** The chat settings panel grew to three tabs and the
> right-side Sheet breaks text layout on small phone screens. It was reworked into a
> `DropdownMenu` trigger whose three items (Historia, Modelo, Personalización) each open a
> dedicated responsive `Dialog` with content-scoped scrolling. PM.5 and PM.3 have been
> deferred (see note below), so the roadmap resumes with the smaller, independent items
> (PM.6 → PM.16). See `S14-progress.md`.

## Deferred after S84 (review 2026-10-26)

| # | Proposal | Dependencies |
|---|----------|--------------|
| PM.34 | Add Vitest coverage for the memory use cases that still have no tests (`create`, `update`, `list`, `list-proposals`, `apply`, `apply-all`) and route tests for the memory endpoints. <br>*Done as S85 (v1.48.0) — see `S85-progress.md`.* | — |
| PM.35 | Accessibility and loading/error-state audit of the main screens: keyboard/focus, labels, live regions, contrast, touch targets, and consistent spinner/error/empty states. Add regression checks where practical. <br>*Done as S85 (v1.48.0) — see `S85-progress.md`.* | — |
| PM.36 | Decide whether remote access needs app-level authentication (PIN/session) or whether the network trust model (private tailnet / trusted LAN) is enough; document and implement the chosen option. <br>*Discarded (2026-10-26): Tailscale already restricts access to the user's tailnet and LAN sharing is off by default, opt-in and explicitly warns that any device on the network can open the app. App-level auth would add friction for a local-first personal app; revisit only if LAN sharing is ever used on untrusted networks.* | S38, S56 |
| PM.37 | Build the version history and comparison view that was deferred in S2, or explicitly discard it. Today there is only the version selector and the context-menu version list. <br>*Discarded (2026-10-27): the version selector and the context-menu list cover the real need; end users use the bots, not version diffs.* | — |
| PM.38 | Allow re-cropping an already saved profile image without uploading it again, reusing `ImageCropperDialog`. <br>*Done as S87 (v1.50.0) — see `S87-progress.md`.* | PM.2 |
| PM.39 | Notify the PC when the phone link is auto-disabled by inactivity; optionally base the idle timer on local use instead of remote requests. <br>*Done as S88 (v1.50.0): one-time notice on app open and status in the Phone dialog. Local use remains out of scope by decision.* | S56 |
| PM.40 | Decide whether the app should work offline; today the service worker is pass-through and every request needs the PC server. If yes, design caching and conflict handling. <br>*Discarded (2026-10-27): the app is already local-first and works offline with local providers; true offline on the phone would require data replication and conflict handling. Revisit only for a small read-only cache if a concrete need appears.* | S54, S72 |
| PM.41 | Evaluate store packaging (TWA/PWABuilder) for Android and the Microsoft Store; the portable folder remains the primary distribution. <br>*Discarded (2026-10-27): store packaging adds signing, sandbox and review costs that do not fit the portable local-first distribution; the ZIP remains the only official package.* | S54 |
| PM.42 | Add bilingual screenshots to the tutorials if the text-only format proves insufficient. <br>*Discarded for now (2026-10-27): no complaints and the website documentation covers the guides in more depth; revisit only if tutorial usage shows confusion.* | S71 |
| PM.43 | Review the public website copy with a native speaker and add a new mascot pose to the 404 when the art is available. <br>*Deferred (2026-10-27): waiting for the new 404 art; the project has not been announced to the English community yet, so the copy review waits for that milestone.* | S83, S84 |
| PM.44 | Resolve the S8 title inconsistency: the code generates the title only when `conversation.title === null`, while the S8 doc says it regenerates after each summary. Implement the regeneration or correct the doc. <br>*Done as S86 (v1.49.0): titles are regenerated after every automatic or manual summary. See `S86-progress.md`.* | S7, S8 |
| PM.45 | Make automatic titles follow the language of the conversation instead of hardcoding Spanish; use the UI locale only as a fallback. <br>*Done as S86 (v1.49.0) — see `S86-progress.md`.* | S8 |

> **PM.34 + PM.35 (S85) — done (2026-10-26, v1.48.0):** The 8 memory use
> cases and their routes have tests (including the missing-memory 404), and the
> critical screens were audited with axe in light/dark and desktop/mobile (36
> audits, 0 violations). Icon labels, contrast, error announcements, retry states
> and the logs download hydration mismatch were fixed. See `S85-progress.md`.

> **PM.44 + PM.45 (S86) — done (2026-10-26, v1.49.0):** Automatic titles
> are regenerated after every summary — automatic or manual — through a new
> `title-generated` SSE event (the manual summary route returns the title in its
> response), while manual titles stay untouched unless the user explicitly asks
> for a regeneration. The prompt no longer hardcodes Spanish: it asks for the
> language of the conversation and uses the UI locale only as a fallback. See
> `S86-progress.md`.

> **PM.38 (S87) — done (2026-10-27, v1.50.0):** The character profile,
> the chat custom image and the chat background can be re-cropped from their
> original asset. Animated GIFs are rejected with a notice instead of being
> flattened to PNG. See `S87-progress.md`.

> **PM.39 (S88) — done (2026-10-27, v1.50.0):** The backend records the
> last automatic disable and the app shows a one-time dialog on open plus a
> status line in the Phone dialog. The watchdog now skips modes that are already
> inactive, so it never emits a false notice. Remote-only inactivity is kept by
> decision. See `S88-progress.md`.

> **S89 — security hotfix (2026-10-27, v1.50.1):** Provider API keys no longer
> leave the backend, Node is pinned to 24.22.1, the Express/body-parser/
> proxy-addr/qs chain is patched, and the updater verifies `SHA256SUMS` plus the
> archive paths. See `S89-progress.md`. Remaining work is split into S90
> (database indexes, N+1 queries, pagination and Drizzle 0.45) and S91 (Zod 4,
> OpenAI 7 and Vitest 5). Release signing, CSP/helmet, remote authentication
> and encryption at rest remain future security work.

> **S90 — database performance (2026-10-27, v1.51.0):** Hot lookups now use
> indexes, character and conversation lists batch their queries, and text
> generation reads only the recent window. Pagination, Drizzle 0.45 and the
> dependency upgrades remain for S91–S93. See `S90-progress.md`.

> **S91 — Drizzle 0.45 (2026-10-27, v1.51.1):** ORM and kit upgraded without
> schema changes; `db:generate` is clean, migrations apply on a fresh database
> and the production audit no longer reports the Drizzle advisory. Zod 4,
> OpenAI 7 and Vitest 5 remain for S92. See `S91-progress.md`.

> **S92 — dependency majors (2026-10-27, v1.51.2):** Zod 4, OpenAI 7 and
> Vitest 5 are in place with Vite 8 explicit; all backend, frontend and package
> smoke tests pass. The production audit is at 0 critical and 4 high (Astro
> build dependencies). Pagination remains for S93. See `S92-progress.md`.

> **S93 — chat pagination (2026-10-27, v1.52.0):** The chat opens with the
> latest 50 messages and auto-loads older pages near the top, preserving scroll.
> Memory decay is computed server-side, rewind returns deleted IDs instead of
> the full history, and the conversation detail no longer loads every character
> version. See `S93-progress.md`.

> **S94 — signed releases (2026-10-27, v1.53.0):** `SHA256SUMS` is signed with
> Ed25519 and the updater verifies the signature with an embedded public key
> before trusting the checksum. The private key lives in the
> `RM_RELEASE_SIGNING_KEY` GitHub secret; rotation is documented in
> `docs/12-release-signing.md`. See `S94-progress.md`.

> **S95 — network and headers hardening (2026-10-27, v1.54.0):** The backend
> binds to loopback by default, helmet adds security headers, API responses are
> `no-store`, Astro emits a strict script CSP with hashes, and the bootstrap
> script is external. Dependabot now covers npm/pnpm. Encryption at rest remains
> for S96. See `S95-progress.md`.

> **S96 — encryption at rest (2026-10-27, v1.54.1) — discarded:** the target is
> a desktop with GPU, local-first and a private network boundary. Full-disk
> encryption covers the realistic lost-device case; app-level passphrase or
> SQLCipher would add unlock, recovery, backup and native-module complexity
> without protecting against malware or an unlocked session. The app now uses
> owner-only POSIX permissions and documents disk encryption, plaintext backups
> and API-key rotation. Revisit only for cloud-synced backups or shared
> machines. See `S96-progress.md`.

### Manual verification pending

These are not code tasks; they need real hardware or a user confirmation.

- [ ] S22 — visual review of the 3 themes × 2 modes.
- [ ] S54 — install the PWA from Chrome (localhost) and from the phone over Tailscale.
- [ ] S55 — confirm the first clean restart after an update.
- [ ] S56 — validate inactivity auto-disable in the real tailnet.
- [ ] S62 — safe areas and touch behaviour on a real phone with a notch.
- [ ] S84 — final review of the website on iPhone/Safari.

> **PM.40 + PM.41 — discarded (2026-10-27):** the app is already local-first
> with local providers, and the portable ZIP is the distribution that matches
> the project. Store packaging and full offline mode are out of scope; a small
> read-only cache remains the only offline idea worth revisiting if needed.

> **PM.43 — deferred (2026-10-27):** the 404 keeps the current mascot until a
> new pose exists, and the website copy review will happen after the
> English-community launch. No code changes yet.

> **Download metrics — deferred (2026-10-28):** the website links straight to
> GitHub assets, so counting clicks needs a redirect or a beacon. GitHub's
> `download_count` is cumulative per asset and cannot separate website clicks,
> the updater, our release verification or bots. Data on v1.54.9: 129
> platform-asset downloads across 48 releases, and the last ten releases show
> one each (our verification); repo traffic is 68 views / 24 uniques per two
> weeks. Cloudflare Web Analytics only reports page views (no custom events)
> and its beacon is blocked by the site CSP. Revisit when the site has enough
> traffic to justify a Worker + KV beacon; a redirect in the download path and
> app telemetry stay out of scope.

### Reviewed and discarded

- **S2 — Version history/comparison view (PM.37):** the version selector and the context-menu version list are enough; end users use the bots, not version diffs.
- **S54/S72 — Offline mode (PM.40):** the app is already local-first and works offline with local providers; true offline on the phone would require replication and conflict handling. A small read-only cache is the only future scope worth revisiting.
- **S54 — Store packaging (PM.41):** signing, sandbox and review costs do not fit the portable local-first distribution; the ZIP remains the only official package.
- **S71 — Tutorial screenshots (PM.42):** no complaints so far and the website documentation is more extensive; revisit only if tutorial usage shows confusion.
- **S38/S56 — App-level authentication for remote access (PM.36):** the network is the trust boundary. Tailscale only admits devices in the user's tailnet; LAN sharing is off by default, opt-in and the Phone dialog warns that any device on the network can open the app. Revisit only if LAN sharing is used on untrusted networks.
- **S38 — HMR through the LAN/Tailscale proxy:** development-only; the normal dev server already has HMR.
- **S54 — `display_override`:** already discarded in S77; without a window-controls-overlay UI it changes nothing visible.
- **S76 — single quotes in `memory_proposals` and user-facing parser warnings:** apostrophes make single quotes ambiguous and could corrupt valid content; warnings would add noise.
- **S81 — misused `*title*`, numbered lists, tables and `_italics`:** ambiguous or already covered by the prompt; revisit only if real outputs show a pattern.
- **S82 — analytics and `CF-IPCountry` geo:** optional and not requested; the current client-side language detection is sufficient.
- **S110 — pagination of memories/summaries beyond 500:** the 500-item cap covers normal use; a "Load more" flow would add offset state and UI for a limit nobody has reached.
- **S8 — Drizzle query optimization:** no evidence of a bottleneck; profile first instead of a speculative rewrite.
