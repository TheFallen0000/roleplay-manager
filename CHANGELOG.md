# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [1.36.2] - 2026-10-08

### Changed

- **Rewritten, bilingual README**: `README.md` (English) with a language switcher to the new [README.es.md](README.es.md), covering what the app is, its features, the end-user install (portable packages for Windows, Linux and macOS), development setup, phone access, updates and documentation links.
- Fixed stale details in `CONTRIBUTING.md` (backend port and pnpm version).

## [1.36.1] - 2026-10-08

### Fixed

- The **Phone dialog** no longer grows past the viewport on short screens: the whole dialog scrolls (85% of the visible height) so the QR, the hints and the *Link settings* section stay reachable on a phone or in a small window.

## [1.36.0] - 2026-10-08

### Added

- **Link settings for phone access** (Tailscale and home network), in a collapsible *Link settings* section of the Phone dialog and persisted per mode:
  - *Turn on when the app starts* — the link comes up by itself when you open the app.
  - *Turn off when the app closes* (Tailscale only) — `tailscale serve` would otherwise keep serving after the app is gone.
  - *Turn off after inactivity* — cuts the link after 15/30/60/120 minutes without requests coming from the phone (using the app on the PC does not count); enabling the link restarts the countdown.

### Changed

- Restarting the app keeps the link on: only a real close (Ctrl+C, closing the console) triggers the shutdown rule, and the idle timeout can be adjusted at any time, even while the link is active.
- Auto-enable on start runs in the packaged app only (a dev server restarts constantly and would keep turning the link back on).

## [1.35.1] - 2026-10-08

### Fixed

- **Restarting no longer opens a new browser tab.** The running app carries the launcher's "open the browser" order (`RM_OPEN_BROWSER`) in its environment, and the restart passed it on to the new process. Now `RM_NO_BROWSER` wins over it (the server ignores a stale `RM_OPEN_BROWSER`), and the restart drops the inherited variable before relaunching. The tab that asked for the restart keeps reloading itself, as before.

## [1.35.0] - 2026-10-08

### Added

- The app can be **installed as a PWA**: web app manifest, opaque install icons (192/512 plus a maskable one) and the meta tags iOS needs. Installed, it opens in its own window with its own icon and name.
  - Installable from `localhost` (desktop) and over HTTPS (Tailscale). Plain LAN IPs are not a secure context, so the install option will not show up there — that is expected.
  - No service worker on purpose: there is no offline mode (the app needs the server, and a stale cache must never serve an old shell after an update).

## [1.34.0] - 2026-10-08

### Added

- The app now has a **face**: the mascot is the favicon (16/32/48 plus Apple touch icon), the sidebar mark and the welcome illustration. Every image is generated from the original art with `pnpm brand:generate` (~38 KB for the whole set).

### Changed

- The sidebar logo is a 24px head crop and the welcome screen shows the full mascot; the old generic SVG mark and the Astro favicon are gone.
- The release smoke test now checks that the packaged app serves the brand images.

## [1.33.0] - 2026-10-08

### Added

- **Linux and macOS packages**: every release now publishes five portable packages (`win-x64`, `linux-x64`, `linux-arm64`, `mac-arm64`, `mac-x64`), each with its bundled Node runtime and its launcher (`start.sh` on unix, `start.cmd` on Windows). Linux/macOS ship as `.tar.gz` (preserves the executable bit); Windows keeps `.zip`.
- The release CI builds and **smoke-tests each package on its own OS** (Windows, Ubuntu, Ubuntu ARM, macOS Apple Silicon and macOS Intel) before publishing.

### Changed

- `pnpm package:win` is now `pnpm package:app` (`scripts/package.mjs`): it packages the platform it runs on.
- The updater picks the asset for the current OS/architecture (`-linux-arm64.tar.gz`, `-mac-arm64.tar.gz`, …), refreshes the launcher of its platform and restarts through it (`sh start.sh` on unix).

## [1.32.2] - 2026-10-07

### Changed

- Provider state is now **shared** (`lib/stores/provider.store.ts`): the chat's model selector and the providers screen use the same store, so they stay in sync and no longer duplicate the instance management logic. The provider UI moved to `components/shared/provider/`, the image inputs/cropper to `components/shared/images/`, and the memory/summary panels now live with the conversation feature (only the chat uses them).
- `pnpm check:arch` gained a **seventh** check: no imports between feature folders under `components/` (shared UI goes to `components/shared/**`, shared logic to `lib/`).

## [1.32.1] - 2026-10-07

### Added

- `pnpm check:arch` now runs **six** checks: generic hooks in `lib/hooks/` must be feature-agnostic, and no frontend module may be orphaned (not imported by any non-test file). Unused imports were already covered by ESLint.

### Changed

- Hook conventions are explicit and enforced: generic hooks live in `lib/hooks/` (no imports from stores/API/components/pages) and feature hooks live next to their components (`components/<feature>/use-<kebab>.ts`). `use-chat-streaming` moved to `components/conversation/`, and `use-mobile.ts` now exports `useMobile` (was `useIsMobile`) to match its file name.

## [1.32.0] - 2026-10-07

### Added

- The updates panel now offers **Restart now** once an update is installed: the app relaunches itself (the packaged launcher starts the new version) and the tab reconnects on its own. Only available in the packaged app.

### Changed

- The updater **retries transient network failures** (3 attempts with backoff) when reading the release and downloading the package, and reports the underlying cause (for example `getaddrinfo ENOTFOUND ...`) instead of a bare `fetch failed`. The job shows the retry attempt while it waits.
- The server retries binding its port for a few seconds, so restarting does not clash with the previous process.

## [1.31.5] - 2026-10-07

### Fixed

- The packaged launcher no longer shows *"Windows cannot find the file ..."* when opening the browser: Node escaped the inner quotes when spawning `cmd.exe`, and `cmd` does not understand that escaping, so `start` got a broken argument. The command is now passed verbatim (`windowsVerbatimArguments`).

## [1.31.4] - 2026-10-07

### Changed

- The packaged launcher no longer opens the browser before the app is ready: it passes `RM_OPEN_BROWSER` to the server, which opens it **once it is listening**. The "can't reach this site" flash is gone. `RM_NO_BROWSER` still disables it.
- The `README.txt` shipped in the package is now **bilingual** (English first, then Spanish, with a header noting it) and uses proper Spanish accents (UTF-8 with BOM).

## [1.31.3] - 2026-10-07

### Fixed

- `pnpm package:win` no longer fails when `npm_execpath` points to a pnpm that cannot be spawned directly (as on GitHub Actions runners); it falls back to the `pnpm` on `PATH`. Together with the `bsdtar` fix (1.31.2) this makes the release pipeline run end to end.

> **First published release.** It includes the automated-release workflow (1.31.1) and the CI packaging fixes (1.31.2 + 1.31.3).

## [1.31.2] - 2026-10-07

### Fixed

- `pnpm package:win` and the package smoke test now use Windows' bundled **bsdtar** (`System32\tar.exe`) explicitly. When a GNU `tar` (for example Git's) came first in `PATH` — as on GitHub Actions runners — packaging failed because GNU tar reads `C:\...` paths as a remote host (`Cannot connect to C: resolve failed`). This was the first CI run's failure.

## [1.31.1] - 2026-10-07

### Added

- Releases are now **published automatically**: a push to `master` that bumps the version in `package.json` builds and publishes the release for that version, as long as it does not exist yet (pushes that do not change the version are ignored). Pushing a `v*` tag still works, and a manual run (`workflow_dispatch`) is a dry run unless the `publish` input is enabled.

## [1.31.0] - 2026-10-07

### Added

- The packaged app now **updates itself from published releases**: it reads the latest GitHub Release, shows its notes, downloads the Windows x64 package with progress, installs it into `versions/<version>` and switches the `current` pointer. The previous version stays on disk for rollback and the app asks to restart. It is enabled automatically when the app runs from the portable package (`RM_PACKAGED_ROOT`); developers keep the git-based adapter.
- `version.json` in the package now records the GitHub `repository` the updater follows.

### Changed

- The updates panel shows the release notes and the download progress, and explains the new "no package for this platform" state.
- The portable `README.txt` documents the built-in updater.

## [1.30.0] - 2026-10-07

### Added

- A GitHub Actions **release workflow** publishes the portable Windows x64 package on version tags (`v*`): it verifies the tag matches `package.json`, runs the quality gates and tests, packages, smoke-tests the artifact and creates the release with the CHANGELOG notes. A manual run (`workflow_dispatch`) builds and validates without publishing.
- Reusable scripts: `scripts/smoke-package.mjs` (validates the packaged artifact with the bundled runtime and a stripped `PATH`) and `scripts/release-notes.mjs` (extracts the CHANGELOG section for the release notes).

## [1.29.0] - 2026-10-07

### Added

- `pnpm package:win` builds a **portable Windows x64 package** (zip) with a bundled Node runtime: the app runs as a single process, requires no Node/pnpm on the user's machine and keeps its data (`data/`, `backups/`) inside the folder.

### Fixed

- The production server now actually runs: the backend is bundled with esbuild (native modules stay external), migrations are shipped and configurable with `MIGRATIONS_DIR`, and the stale `tsconfig.build.json` and `start` script were removed.

## [1.28.0] - 2026-10-07

### Added

- Production builds can now run as a **single process**: the Astro app is built in `middleware` mode and mounted inside Express, so one port serves the UI and the API (set `WEB_HANDLER_PATH`; the static build is served by the host, with `WEB_CLIENT_DIR` derived automatically). Development is unchanged.
- The server-side API base can be set at runtime with `PUBLIC_API_URL`, so the single process can listen on any port.

## [1.27.0] - 2026-10-07

### Added

- New **Updates** screen (System → Updates) with a **sidebar badge** and a **one-time notice** on the characters screen when the tracked branch has new commits. It shows the current and latest versions plus the new commits.
- Applying an update runs `git pull --ff-only` and `pnpm install` in the background with per-step progress (backup → pull → install), blocks a dirty working tree and asks to restart the app afterwards.
- **Backups**: an automatic one before updating (SQLite online backup + copy of the data folder) and a manual "create a backup now" action.

## [1.26.0] - 2026-10-06

### Added

- The Phone dialog now has a **Home network** tab (next to Tailscale) for connecting the phone on the same Wi-Fi: a toggle, its own QR/link, an address selector when the PC has several network interfaces, a copy button that also works over plain HTTP, and notes about trusted networks and the Windows firewall. It is off by default and is served by a small backend proxy (`LAN_PORT`, default 4322) that forwards to the local app, so the frontend itself stays bound to localhost.
- The header status dot lights up when either mode (Tailscale or Home network) is active.

## [1.25.4] - 2026-10-06

### Fixed

- The tunnel status dot no longer causes a React hydration mismatch: the cached status is loaded after mount instead of during the first render (which did not match the server-rendered HTML).
- Provider instance rows keep their edit/delete actions inside the card when the "Selected" badge is shown on narrow screens: the badge now wraps and the content can shrink.
- The chat now fills the available height on every screen: it uses `dvh` with the exact header and padding offsets, so there is no blank strip below and the message list keeps its internal scrolling.

## [1.25.3] - 2026-10-06

### Fixed

- Running `pnpm build` while `pnpm dev` is up no longer breaks the running dev server: the dev and build dependency-optimizer caches are now separate (`node_modules/.vite-dev` and `node_modules/.vite-build`). Previously the build clobbered the dev server's optimized deps, so pages loaded without hydration (504 "Outdated Optimize Dep") until the dev server was restarted.

## [1.25.2] - 2026-10-06

### Fixed

- The phone dialog no longer overflows horizontally: the URL row could force the grid column wider than the dialog and the content bled past the right padding. The content wrapper is now `min-w-0`, so the URL truncates properly and every edge keeps its 16 px padding.
- The Astro dev server now allows the Tailscale hostname (`server.allowedHosts: [".ts.net"]`), so opening the app from the phone through `tailscale serve` no longer fails with "Blocked request. This host is not allowed."

## [1.25.1] - 2026-10-06

### Fixed

- Enabling the phone connection now detects when Tailscale Serve is not enabled on the tailnet and shows the one-time activation link right in the dialog (new `TUNNEL_SERVE_NOT_ENABLED` error) instead of a generic 502 after a 15-second wait. The `serve` command timeout is shorter (10 s) and command output is kept on failures to build actionable errors.

## [1.25.0] - 2026-10-06

### Added

- New **Phone** menu to share the app with your devices through a private Tailscale network (Tailscale Serve) and open it on your phone: a connection toggle, a QR code with the private URL, a copy-link button and a first-run guide (Tailscale missing or signed out). Nothing is exposed to the internet and the user never runs commands; the backend drives the Tailscale CLI (`TUNNEL_TARGET_URL` decides what is shared, `TAILSCALE_BIN` overrides the binary path).
- Tunnel endpoints (`GET /api/tunnel`, `POST /api/tunnel/enable|disable`) with typed domain errors translated in the UI.
- Base UI `switch` primitive in `@workspace/ui` and `react-qr-code` for the QR.

### Deferred

- Auto-enable on start, auto-disable on close, inactivity auto-off and the PWA manifest.

## [1.24.0] - 2026-10-06

### Added

- The frontend now serves `/api/*` itself and proxies it to the backend through an Astro middleware, so the browser only talks to a single origin. This is the prerequisite for remote access (a single tunnel of the frontend port exposes the whole app) and also enables LAN access when the server binds beyond localhost. JSON, multipart uploads and SSE streaming are forwarded without buffering; the backend target can be overridden with the server-only `API_PROXY_TARGET` variable.
- Asset URLs (`img src`) are now relative, so images load through the same origin.

### Changed

- Browser API calls use same-origin `/api` paths; SSR keeps calling the backend directly. `PUBLIC_API_URL` still overrides both.

## [1.23.0] - 2026-10-06

### Added

- New `conversations.images` export section ("Conversation images", enabled by default): conversation-scoped images (custom profile image and chat background) travel once per unique asset in a top-level `conversationImages` map, while conversations reference them by id. Fit and overlay travel too.
- On import, each unique image is recreated once with the right variant set (union when used as both profile and background) and every branch referencing it is remapped to the same new asset.

### Fixed

- Custom profile images are now exported with their binary (previously only the id travelled, leaving broken references on import). References whose binary is missing are cleared to `null` instead of pointing to a non-existent asset.

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
