# S12 — PM.2 Profile image cropper (square)

**Estado:** Completado
**Inicio:** 2026-08-05
**Fin:** 2026-08-05

## Descripción

Añadir un recortador de imagen para la foto de perfil, forzando una forma cuadrada antes de subirla.

## Decisions

- **Librería:** `react-easy-crop` (v6.2.3, compatible con React 19).
- **Componente:** `packages/frontend/src/components/character/image-cropper-dialog.tsx`.
- **Aspecto:** configurable vía prop `aspect`, por defecto `1` (cuadrado).
- **Salida:** `getCroppedImg` (helper propio de canvas, ya que v6 no lo exporta) devuelve un PNG Blob → convertido a `File` (`cropped.png`, `image/png`) → `onCropComplete`.
- **Flujo:** al seleccionar/soltar una imagen en el dropzone, se abre el diálogo de recorte. Al pulsar "Aplicar", el archivo recortado se pasa por el mismo `onFileSelected` de antes (el padre no sabe que fue recortado).
- **Sin re-encuadre:** el diálogo solo se abre al seleccionar un archivo nuevo. Re-recortar una imagen ya guardada queda fuera de alcance (promovido a **PM.38**).

## Criterios de aceptación

- [x] El usuario puede soltar o seleccionar una imagen en el dropzone del formulario de personaje.
- [x] Se abre automáticamente un diálogo de recorte cuadrado.
- [x] El usuario puede desplazar y hacer zoom sobre una selección cuadrada.
- [x] "Aplicar" devuelve un `File` PNG al dropzone; el flujo de subida existente continúa.
- [x] El recortador admite aspecto configurable (por defecto cuadrado).
- [x] Todos los tests pasan: `pnpm check`, backend tests (sin cambios), frontend tests.

## Commits

1. `docs(plan): add S12 plan for profile image cropper`
2. `feat(frontend): add react-easy-crop based image cropper dialog`
3. `test(frontend): cover image cropper dialog and dropzone integration`
4. `release: bump to v1.3.2 and add changelog entry`
