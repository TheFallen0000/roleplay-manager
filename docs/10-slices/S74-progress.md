# S74 — Exportar e importar personas (PM.28)

**Estado:** Completado
**Inicio:** 2026-10-13
**Fin:** 2026-10-13

## Descripción

Cierra PM.28: cada persona se puede exportar a un archivo JSON propio y volver a
importar desde el diálogo de la pantalla, sin tocar el backend (se reutiliza el
alta existente). Las personas son de usuario, así que no viajan dentro del
export de un personaje: este es su propio formato.

## Decisiones

- **Formato standalone** en `export.ts`: `kind: "player-character-export"` con
  `schemaVersion` propio (1) y solo `name` + `description` (sin ids ni fechas
  locales: no hay nada que remapear). La unidad es la persona (no hay «exportar
  todas»), coherente con los personajes.
- **Sin backend**: el parser vive en el frontend (como
  `parse-character-export.ts`) y el alta reutiliza `POST /api/player-characters`.
- **Duplicados permitidos** al importar, igual que en personajes; la resolución
  por nombre es PM.30.
- **Descarga reutilizable**: se extrae `lib/download-json.ts` (mismo mecanismo
  que el export de personajes) y el payload/filename son funciones puras
  (`buildPlayerCharacterExport`, `playerCharacterExportFilename`) con tests.
- **UI**: tercera acción ghost «Exportar» en el pie de cada placa y botón
  «Importar persona» en la cabecera (outline, con el patrón de la biblioteca) más
  el diálogo con zona de soltar/elegir archivo y errores traducidos.

## Criterios de aceptación

- [x] Exportar desde cada tarjeta descarga `persona-<slug>-<fecha>.json` con el
      payload versionado.
- [x] Importar acepta el archivo por drop o selector, valida y da de alta.
- [x] Errores traducidos (JSON inválido, `kind`/versión, nombre/descripción).
- [x] Duplicados permitidos; el diálogo se cierra al importar y la lista se
      refresca con toast.
- [x] Tests nuevos (builder/parser/descarga/diálogo/manager) y gates en verde.
- [x] CHANGELOG en `[Unreleased]` y PM.28 marcada.

## Verificación

- Frontend **315** tests (+13) y backend **505**; `pnpm check` 7/7.
- **E2E real con el paquete** (navegador headless): con dos personas sembradas,
  la descarga produce `persona-auron-2026-10-13.json` (con el `kind` correcto) y
  ese mismo archivo se reimporta por el diálogo; la lista pasa de 2 a 3 tarjetas,
  con el toast «Persona "Auron" importada» y el diálogo cerrado.
- Capturas revisadas (tarjetas con la acción nueva, diálogo de importar, móvil)
  y detector de `impeccable` sin hallazgos.

## Commits

1. `feat(frontend): export and import personas`
2. `docs(slice): add S74 progress and mark PM.28`
