# S98 — Migración a Express 5

**Estado:** Completado (v1.54.3)
**Inicio:** 2026-10-27
**Fin:** 2026-10-27

## Descripción

Migración del backend de Express 4.22.3 a Express 5.3.0, el major que quedó
pendiente en S97 (PM.46). El cambio de runtime rompía los tests de `/logs`
porque Express 5 convierte `req.query` en una propiedad de solo lectura.

S98 incluye:

- `express` 5.3.0 en `@workspace/backend`.
- `validate` reescrito para definir una propiedad propia sobre el request en
  lugar de reasignar `req.query`.
- Parser de query explícito en modo `simple`.
- Tests unitarios del middleware `validate` para query, body y errores.
- Verificación de rutas, CORS, errores, multipart, SSE y paquete completo.

## Decisiones

- **`Object.defineProperty` en lugar de `res.locals`:** Express 5 define
  `req.query` como getter en el prototipo. Una asignación normal lanza en modo
  estricto. Definir una propiedad propia (`value`, `writable`, `configurable`,
  `enumerable`) la sombrea durante el resto de la petición y mantiene el código
  de los controladores sin cambios. Se aplica a `body`, `query` y `params` para
  que el middleware siga siendo genérico.
- **Parser de query simple:** Express 5 usa `simple` por defecto en lugar del
  parser extendido de Express 4. Ninguna ruta necesita objetos anidados ni
  arrays en query, así que se deja explícito `simple`, que además evita la
  superficie de `qs`.
- **Sin cambios de rutas:** no hay wildcards `*`, parámetros opcionales
  `:id?` ni expresiones regulares en las rutas. Los paths actuales son
  compatibles con `path-to-regexp` 8.
- **Sin cambios en `validate` de body/params:** los tests confirman que el
  reemplazo por propiedad propia funciona igual que antes.
- **Dependencias alrededor de Express:** se mantienen `pino-http` 10,
  `helmet` 8, `cors` 2.8.5 y `busboy`; la suite y el smoke test confirman que
  siguen funcionando con Express 5. `pino` 10 / `pino-http` 11 siguen en S100.
- **Fuera de alcance:** `better-sqlite3` 13 (S99), pino/uuid (S100),
  TypeScript 7 (PM.49) y `prettier-plugin-astro` 1.x (PM.50).

## Criterios de aceptación

- [x] `express` actualizado a 5.3.0.
- [x] `validate` funciona con query, body y params en Express 5.
- [x] `/api/logs` responde 200 con query válida y 400 con nivel inválido.
- [x] Rutas, CORS, errores, multipart, SSE y assets revisados.
- [x] Tests unitarios del middleware añadidos.
- [x] Backend, frontend, `pnpm check` y build en verde.
- [x] Paquete Linux y smoke test completos.
- [x] API real verificada (19/19 comprobaciones) y UI con Playwright sin
      errores de consola ni CSP.
- [x] `CHANGELOG.md` actualizado en `[Unreleased]`.
- [x] PM.46 marcado como hecho en el backlog.

## Verificación

- Backend: **627** tests (110 archivos), incluidos los 3 nuevos de `validate`.
- Frontend: **335** tests (56 archivos).
- `pnpm check`: arquitectura 7/7, typecheck y lint verdes.
- `pnpm build`: backend, frontend y website en verde.
- Paquete Linux y smoke test: PASS.
- API del paquete: health, personaje, conversación, `/logs` válido e inválido,
  mensajes paginados, contexto, variantes de asset, 404, CORS preflight,
  `no-store` y ausencia de `X-Powered-By`: **19/19**.
- Playwright/Chromium: home, alta de personaje, proveedores, tutoriales
  (diálogo) y chat; **0 errores de consola** y **0 violaciones CSP**.

## Commits

1. `24d43b4 feat(backend): migrate to Express 5`
2. `b839f0b test(backend): cover validate with Express 5 query getter`
3. `docs(slice): document S98 Express 5 migration` (this commit)
