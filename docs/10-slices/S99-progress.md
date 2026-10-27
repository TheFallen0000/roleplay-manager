# S99 — better-sqlite3 13 (N-API)

**Estado:** Completado (v1.54.4)
**Inicio:** 2026-10-27
**Fin:** 2026-10-27

## Descripción

Migración de `better-sqlite3` 12.11.1 a **13.0.3** (PM.47), el primer major
basado en **N-API**. El cambio elimina `prebuild-install` y `bindings`, publica
binarios precompilados dentro del propio paquete y mantiene la compilación con
`node-gyp` como fallback.

S99 incluye:

- `better-sqlite3` 13.0.3 en `@workspace/backend`.
- Comentario de empaquetado actualizado: los binarios N-API vienen incluidos,
  pero `allowBuilds` se mantiene para el fallback de compilación.
- Verificación de base de datos, WAL, migraciones, backups y permisos.
- Dry-run del workflow de release en las cinco plataformas.

## Decisiones

- **N-API prebuilds:** la v13 trae binarios para `win32-x64`, `win32-arm64`,
  `linux-x64`, `linux-arm64`, `linuxmusl-x64`, `linuxmusl-arm64`,
  `darwin-x64` y `darwin-arm64`. Ya no hace falta descargar un binario con
  `prebuild-install`.
- **`allowBuilds` se mantiene:** aunque el paquete incluye prebuilds, su
  `gypfile` permite compilar si la plataforma no tiene un binario compatible.
  El comentario de `scripts/package.mjs` ahora explica ese fallback.
- **Sin cambios de esquema:** Drizzle 0.45.4 declara `better-sqlite3 >=7` como
  peer, así que no hay migraciones ni cambios en el repositorio.
- **Tipos sin cambios:** `@types/better-sqlite3` 7.x sigue cubriendo la API que
  usa la app (`Database`, `pragma`, `backup`, prepared statements). No se usan
  `db.explain()` ni `preparedStatement.toString()`.
- **Tamaño del artefacto:** el paquete incluye los ocho prebuilds y el binario
  compilado; el archivo comprimido crece unos 5–7 MB. Es aceptable para una app
  de escritorio y evita podar binarios a mano, que sería más frágil.
- **Fuera de alcance:** pino/uuid (S100), `prettier-plugin-astro` 1.x (PM.50) y
  TypeScript 7 (PM.49).

## Criterios de aceptación

- [x] `better-sqlite3` actualizado a 13.0.3.
- [x] Base de datos, WAL, migraciones, backups y permisos funcionan.
- [x] Backend, frontend, `pnpm check` y build en verde.
- [x] Paquete Linux y smoke test completos, con backup online.
- [x] API real verificada (19/19).
- [x] Dry-run del workflow de release en win-x64, linux-x64, linux-arm64,
      mac-arm64 y mac-x64: todos verdes.
- [x] `CHANGELOG.md` actualizado en `[Unreleased]`.
- [x] PM.47 marcado como hecho en el backlog.

## Verificación

- Backend: **627** tests (110 archivos).
- Frontend: **335** tests (56 archivos).
- `pnpm check`: arquitectura 7/7, typecheck y lint verdes.
- `pnpm build`: backend, frontend y website en verde.
- Paquete Linux y smoke test: PASS, incluido el **backup online** con
  `Database.backup` (`integrity_check: ok` y un personaje recuperado).
- API del paquete: **19/19** (incluye creación de personaje/conversación,
  `/logs`, mensajes paginados, contexto, assets, CORS y `no-store`).
- `pnpm audit --prod`: **0 vulnerabilidades**.
- Workflow de release en dry-run (`publish=false`):
  - Quality gates: PASS.
  - `win-x64`: PASS, con backup online.
  - `linux-x64`: PASS, con backup online.
  - `linux-arm64`: PASS, con backup online.
  - `mac-arm64`: PASS, con backup online.
  - `mac-x64`: PASS, con backup online.
  - Publicación: skipped (dry-run).

## Commits

1. `b748875 feat(backend): upgrade better-sqlite3 to 13`
2. `d4e0d81 test(package): verify online database backup`
3. `docs(slice): document S99 better-sqlite3 13` (this commit)
