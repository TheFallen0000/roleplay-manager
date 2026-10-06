# PM Backlog — Post-MVP

Backlog of features deferred past v1.0. Items here are not committed to a
release; they are promoted to a slice (`S11`, `S12`, …) when picked up.

See `S9-plan.md` for the v1.0 polish tasks and the rationale for deferring
these. The dependency graph below reflects which PMs must land together or in
sequence.

Last updated: 2026-10-06

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

## Remote access & mobile

| # | Proposal | Dependencies |
|---|----------|--------------|
| PM.21 | Access the app from a phone anywhere while it keeps running on the user's computer, without deploying to a server or exposing ports. <br>*Done as S33 (v1.25.0): **Tailscale + Serve** (private, no domain), toggled from the app's Phone menu with a QR. See `S33-progress.md`.* | — |
| PM.22 | Quick phone connection over the home network (same Wi-Fi): a "Home network" tab in the Phone dialog with its own URL and QR, alongside the Tailscale one. <br>*Feasibility confirmed (2026-10-06); design decisions open (see note below).* | PM.21 |

> **PM.21 (S32 + S33) — done (2026-10-06, v1.24.0 / v1.25.0):** **Tailscale + Serve** was
> chosen (private tailnet, nothing exposed to the internet, no domain, phone installs the
> Tailscale app once). S32 delivered the prerequisite (same-origin `/api` proxy through an
> Astro middleware, so a single tunnel of the frontend port exposes the whole app and LAN
> access works). S33 delivered the **Phone menu**: connection toggle, QR with the private URL,
> copy link and a first-run guide, driven by the backend through the Tailscale CLI. Deferred:
> auto-enable/auto-disable options and the PWA manifest. See `S32-progress.md`,
> `S33-progress.md` and `remote-access-opt.md`.

> **PM.22 — research (2026-10-06):** Feasible. Thanks to the same-origin `/api` proxy (S32), a
> LAN URL (`http://<pc-ip>:4321`) works as-is: Vite always allows IP hosts (verified in its
> host-check code), Astro's origin check passes because the origin matches the host, and the
> browser only talks to one origin. It needs the server to bind beyond localhost
> (`server.host: true`, which also covers the standalone build) and a Windows Firewall
> allowance on private networks. The dialog would gain a **Home network** tab with the detected
> LAN IP (from the backend's network interfaces) and its own QR. Open decisions:
> (a) expose the LAN **always-on** while the server runs (simple, but any device on the Wi-Fi
> could open the app, which has no auth — risky on untrusted networks) or add a **toggle**
> backed by a small LAN reverse proxy in the backend (safer default, more moving parts);
> (b) how to pick among several interfaces (Wi-Fi/Ethernet/virtual adapters). Notes: LAN is
> plain HTTP, so the clipboard API (copy link) is unavailable and PWA/service workers are out;
> cookies and the API work.

## UI polish

| # | Proposal | Dependencies |
|---|----------|--------------|
| PM.17 | Settings panel responsive redesign: Sheet → DropdownMenu of three dialogs (Historia / Modelo / Personalización). <br>*Done as S14 (v1.5.0) — see `S14-progress.md`.* | — |
| PM.18 | Character list toolbar: a search bar and a sort `Select` (by most recent conversation → oldest and vice versa) below the header, plus a masonry grid layout for the character cards. <br>*Done as S19 (v1.10.0) — see `S19-progress.md`.* | — |

> **PM.17 (S14) — done (2026-08-12, v1.5.0):** The chat settings panel grew to three tabs and the
> right-side Sheet breaks text layout on small phone screens. It was reworked into a
> `DropdownMenu` trigger whose three items (Historia, Modelo, Personalización) each open a
> dedicated responsive `Dialog` with content-scoped scrolling. PM.5 and PM.3 have been
> deferred (see note below), so the roadmap resumes with the smaller, independent items
> (PM.6 → PM.16). See `S14-progress.md`.
