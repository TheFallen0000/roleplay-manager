# S128 — Actualización major de tipos de better-sqlite3

**Estado:** Completado (pendiente de release batched)
**Inicio:** 2026-11-05
**Fin:** 2026-11-05

## Descripción

Actualiza `@types/better-sqlite3` de 7.6.13 a 9.6.0. Es una actualización
**major de solo tipos**: el runtime `better-sqlite3` sigue en 13.0.3 y no cambia
el paquete ni el lockfile de producción. Se adelanta para cerrar el PR de
Dependabot antes de la siguiente tarea.

## Decisiones

- **Se actualiza el paquete de tipos, no el runtime.** `@types/better-sqlite3`
  es una devDependency; `better-sqlite3` 13.0.3 no se toca. La actualización
  corrige/actualiza las definiciones para la API actual y elimina la deuda de
  tener tipos de una major anterior.
- **Uso mínimo de la API.** El backend solo usa `new Database(path)`,
  `pragma(...)` y el cliente para Drizzle/backup. `pnpm typecheck` y la suite
  completa pasan con los nuevos tipos, así que no hay cambios de código.
- **Dry-run de release.** Aunque es type-only, el lockfile cambia; se ejecuta el
  workflow de release en la rama con `publish=false` para validar los cinco
  targets y el empaquetado antes de mergear.
- **Sin release inmediato.** El cambio queda bajo `[Unreleased]`; es una
  dependencia de desarrollo y no justifica un parche por sí solo. Se publicará
  con el siguiente batch.

## Criterios de aceptación

- [x] `@types/better-sqlite3` 9.6.0 en `packages/backend/package.json` y el lockfile.
- [x] `pnpm check`, typecheck, lint, tests y build en verde.
- [x] Dry-run del release workflow con los 5 targets en verde.
- [x] `pnpm audit --prod` limpio.
- [x] Changelog y slice documentados.

## Verificación

- Backend: **706** tests (118 archivos).
- Frontend: **386** tests (68 archivos).
- `pnpm check`, `pnpm build`, `pnpm check:arch` y `pnpm audit --prod` en verde.
- Release dry-run: `win-x64`, `linux-x64`, `linux-arm64`, `mac-arm64`, `mac-x64`
  empaquetados y smoke-tested; publicación omitida (`publish=false`).
- Sin cambios de código ni del runtime `better-sqlite3` (13.0.3).

## Commits

1. `chore(deps): bump @types/better-sqlite3 from 7.6.13 to 9.6.0`
2. `docs(slice): document S128`
