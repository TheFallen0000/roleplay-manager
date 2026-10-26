# S11 — PM.1 Profile image upload & storage

**Estado:** Completado (verificado 2026-10-26)
**Inicio:** 2026-08-04

> **Cierre (2026-10-26):** el follow-up S11.1 está implementado (dropzone en
> `profile-image-input.tsx`) y la migración `0008` elimina `profile_image`; el
> estado «En progreso» y los tres checks pendientes estaban obsoletos.

## Descripción

Permitir al usuario importar imágenes y almacenarlas en la base de datos (no solo enlaces) para la foto de perfil del personaje.

## Decisions

- **Storage:** Filesystem under `./data/characters/<characterId>/<assetId>.<ext>` + metadata in `character_assets` table.
- **Transport:** multipart/form-data parsed by `busboy`.
- **API:** `POST /api/characters/:id/assets` (upload) + `GET /api/characters/:id/assets/:assetId` (serve binary).
- **Migration:** the legacy `profile_image` column is dropped; `profileImageAssetId` is the only image reference (offline-first, no links).
- **Limits:** 3 MB default (`MAX_PROFILE_IMAGE_BYTES`), env-overridable. Mimes: png, jpeg, webp, gif.
- **Old asset:** no cleanup (PM.4 territory).

## Follow-up: drag & drop + remove URL field (S11.1)

- Replace the URL text input with a drag & drop dropzone (always visible in the "General" tab).
- Dropzone holds a pending `File` in state. Editing: uploads immediately. Creating: character is created first, then the file is uploaded, then the character is updated.
- The dropzone is designed with an internal cropper step for PM.2.
- `profileImage: string` / `characterProfileImage: string` removed from all DTOs, entity and DB.

## Criterios de aceptación

- [x] User can pick a PNG/JPEG/WEBP/GIF up to 3 MB in the character form.
- [x] File is uploaded to `POST /api/characters/:id/assets` and returns `{ id }`.
- [x] Asset is written to disk and row exists in `character_assets`.
- [x] `GET /api/characters/:id/assets/:assetId` returns binary with correct `Content-Type`.
- [x] Files > 3 MB or disallowed mime rejected (400/413).
- [x] Path traversal rejected.
- [x] `profileImageAssetId` flows through create/update DTOs.
- [x] Surfaces show uploaded image (character card, chat header, conversation cards).
- [x] Drag & drop dropzone replaces the URL text input.
- [x] Legacy `profile_image` column dropped from `character_versions` (migration `0008_*.sql`).
- [x] All tests pass: `pnpm check`, backend tests, frontend tests (green when the slice closed).
