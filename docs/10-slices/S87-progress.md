# S87 — Re-recorte de imágenes guardadas (PM.38)

**Estado:** Completado
**Inicio:** 2026-10-27
**Fin:** 2026-10-27

## Descripción

Permite volver a encuadrar una imagen que ya está guardada sin tener que
seleccionarla de nuevo:

- Foto de perfil del personaje.
- Imagen de perfil personalizada del chat (solo si ya existe).
- Fondo del chat.

El recorte reutiliza el flujo de subida actual: genera un archivo recortado y lo
entrega al mismo `onFileSelected` que usa la selección de un archivo nuevo. Los
GIF animados no se re-recortan para no convertirlos silenciosamente en un PNG
estático.

## Decisiones

- **Fuente original:** se descarga el asset original (sin variante) desde
  `GET /api/characters/:id/assets/:assetId` y se convierte en `File` para el
  cropper. No se usa la variante `thumbnail`/`medium` para no recortar una
  imagen ya reducida.
- **Perfil de personaje:** el botón aparece cuando hay una imagen guardada y no
  hay un archivo pendiente. Reutiliza el flujo actual: sube un asset nuevo y el
  formulario decide si hay cambios al guardar.
- **Imagen personalizada del chat:** solo se ofrece si
  `customProfileImageAssetId` existe; si no, la acción sería crear una imagen
  personalizada desde la del personaje, que es otra operación.
- **Fondo:** se descarga el asset original y se abre el cropper 16:9; el
  resultado sigue el mismo `handleCropComplete` que una subida normal.
- **GIF:** se detecta por `image/gif` después de descargar el original y se
  muestra un aviso; no se abre el cropper.
- **UI:** botón «Ajustar recorte» junto a las acciones existentes de quitar o
  cambiar imagen. Se muestra un spinner mientras se descarga el original.

## Criterios de aceptación

- [x] El perfil de personaje guardado se puede re-recortar desde el formulario.
- [x] La imagen personalizada del chat se puede re-recortar solo cuando existe.
- [x] El fondo del chat guardado se puede re-recortar con el cropper 16:9.
- [x] Los GIF animados muestran un aviso y no se convierten en PNG.
- [x] El recorte usa el asset original, no una variante reducida.
- [x] Los tests de frontend y `pnpm check` pasan.
- [x] `CHANGELOG.md` actualizado en `[Unreleased]`.
- [x] PM.38 marcado como hecho en el backlog.

## Verificación

- Frontend: **325** tests (53 archivos), incluidos los de re-recorte de perfil,
  fondo y rechazo de GIF.
- `pnpm check`: arquitectura 7/7, typecheck y lint verdes.
- `pnpm build`: backend, frontend y website en verde.
- Sin cambios de backend: se reutilizan los endpoints de assets y settings.

## Commits

1. `760d0d6 feat(images): re-crop saved profile and background images`
2. `docs(slice): add S87 progress and mark PM.38` (this commit)
