# S100 — pino 10, pino-http 11, pino-pretty 13 y uuid 14

**Estado:** Completado (v1.54.5)
**Inicio:** 2026-10-27
**Fin:** 2026-10-27

## Descripción

Migración de la pila de logging y de UUID (PM.48):

- `pino` 9.14.0 → **10.4.0**.
- `pino-http` 10.5.0 → **11.0.0**.
- `pino-pretty` 11.3.0 → **13.2.0** (solo desarrollo).
- `uuid` 11.1.1 → **14.0.3**.
- Se retira `@types/uuid`, porque uuid 14 ya incluye sus propios tipos.

Los PRs de Dependabot #79 y #75 fallaban por separado por el mismo problema de
tipos: `pino-http` 11 infiere `CustomLevels` desde `customLogLevel` y el
`Logger` de pino 10 no encaja si solo se actualiza uno de los dos. Al subir
ambos juntos, la llamada de `pinoHttp` vuelve a typecheckear sin cambios de
código.

## Decisiones

- **pino 10 + pino-http 11 en el mismo slice:** pino-http 11 declara pino 10
  como dependencia y sus tipos solo son compatibles cuando ambos majors están
  alineados.
- **Sin cambios en la configuración:** se mantienen `customLogLevel`,
  `customSuccessMessage`, `customErrorMessage`, la redacción de credenciales y
  el transporte rotativo de `pino-roll`.
- **pino-pretty 13 solo en desarrollo:** producción y tests siguen usando
  `pino/file`; el transporte `pino-pretty` se verificó con un arranque real en
  modo development.
- **uuid 14 es ESM-only:** el backend ya es ESM y esbuild bundlea `uuid`, así
  que no hay problema de interop. Al traer tipos propios, `@types/uuid` 10 se
  elimina para no mantener definiciones duplicadas y desactualizadas.
- **Sin cambios de formato:** los logs siguen siendo JSON en producción, con
  `service`, `redact` y rotación de 5 MB × 5 archivos.
- **Fuera de alcance:** `prettier-plugin-astro` 1.x (PM.50) y TypeScript 7
  (PM.49).

## Criterios de aceptación

- [x] pino 10.4, pino-http 11, pino-pretty 13.2 y uuid 14 instalados.
- [x] `@types/uuid` eliminado; typecheck usa los tipos de uuid 14.
- [x] Redacción, rotación y transporte de desarrollo verificados.
- [x] Backend, frontend, `pnpm check` y build en verde.
- [x] Paquete Linux y smoke test completos, incluido backup online.
- [x] API real verificada (19/19).
- [x] Dry-run del workflow de release en las cinco plataformas.
- [x] `CHANGELOG.md` actualizado en `[Unreleased]`.
- [x] PM.48 marcado como hecho en el backlog.

## Verificación

- Backend: **627** tests (110 archivos).
- Frontend: **335** tests (56 archivos).
- `pnpm check`: arquitectura 7/7, typecheck y lint verdes.
- `pnpm build`: backend, frontend y website en verde.
- Logger en desarrollo: `pino-pretty` 13 imprime el mensaje correctamente.
- Paquete Linux y smoke test: PASS, incluido backup online.
- API del paquete: **19/19** (personaje/conversación con UUID v7, `/logs`,
  mensajes paginados, contexto, assets, CORS y `no-store`).
- `pnpm audit --prod`: **0 vulnerabilidades**.
- Workflow de release en dry-run (`publish=false`):
  - Quality gates: PASS.
  - `win-x64`, `linux-x64`, `linux-arm64`, `mac-arm64`, `mac-x64`: PASS.
  - Publicación: skipped (dry-run).

## Commits

1. `65c8948 feat(backend): upgrade pino, pino-http and uuid`
2. `docs(slice): document S100 logging and UUID majors` (this commit)
