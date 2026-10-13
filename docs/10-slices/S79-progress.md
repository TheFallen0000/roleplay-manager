# S79 — El export acepta todas las secciones compartidas

**Estado:** Completado
**Inicio:** 2026-10-13
**Fin:** 2026-10-13

## Descripción

Corrige el 400 `VALIDATION_ERROR` al exportar un personaje: el diálogo envía
`conversations.images` por defecto (la sección existe en los tipos compartidos
desde S31) pero el enum zod de la ruta nunca la incluyó, de modo que **exportar
con los valores por defecto llevaba fallando desde v1.23.0**. El enum ahora se
deriva de `ALL_EXPORT_SECTIONS` y una prueba de ruta garantiza que cualquier
sección compartida valide.

## Decisiones

- **Enum derivado, no a mano**: `z.enum(ALL_EXPORT_SECTIONS as [ExportSection,
  ...ExportSection[]])` con un comentario que explica la deriva histórica. Un
  type-cast acotado a cambio de no poder repetir el desajuste.
- **Test de ruta nuevo** (`character-exports.routes.test.ts`): acepta todas las
  secciones compartidas (el guardarraíl) y rechaza una desconocida con
  `VALIDATION_ERROR`. La ruta de exports no tenía pruebas: por ahí se coló la
  deriva en S31.
- **Sin cambios de frontend ni de tipos**: el contrato compartido era correcto;
  solo la validación de la ruta estaba desactualizada.

## Criterios de aceptación

- [x] `POST /characters/:id/exports` con las 10 secciones responde 200.
- [x] Una sección desconocida sigue devolviendo 400 `VALIDATION_ERROR`.
- [x] Test anti-deriva añadido; gates y suites en verde.
- [x] CHANGELOG en `[Unreleased]` (`Fixed`).

## Verificación

- Pruebas de la ruta (2) en verde; `pnpm check` 7/7; backend **519** y frontend
  **317** tests.
- E2E con backend dev aislado: personaje creado por API y export con las 10
  secciones → **HTTP 200** con `conversationImages` presente (antes: 400).

## Nota sobre el registro

El 400 aparecía como `warn` en los logs porque el logger de peticiones
(`pino-http`, `customLogLevel` en `server.ts`) mapea 4xx → `warn` y 5xx →
`error`: un 400 es un problema del cliente, no un fallo del servidor. Es una
convención; la validación rota era nuestra, pero el nivel del log no cambia.

## Commits

1. `fix(backend): accept every shared export section in the export route`
2. `docs(slice): add S79 progress`
