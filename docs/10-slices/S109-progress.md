# S109 — Assets, SQLite y limpieza

**Estado:** Completado (pendiente de release batched)
**Inicio:** 2026-10-28
**Fin:** 2026-10-28

## Descripción

Cierre de los pendientes pequeños del barrido:

- **Assets sin escaneo completo:** `ConversationRepository.existsByAssetId`
  responde con un `EXISTS`/`LIMIT 1` sobre `custom_profile_image_asset_id` y
  `background_image_asset_id`. `deleteAssetIfUnreferenced` ya no carga todas las
  conversaciones para decidir si una imagen sigue en uso.
- **Pragmas SQLite:** `busy_timeout = 5000` (espera a otra conexión en vez de
  fallar al instante) y `cache_size = -16000` (16 MB de caché). Se mantiene
  `journal_mode = WAL` y `foreign_keys = ON`; `synchronous` queda en el valor
  por defecto para no cambiar la durabilidad.
- **Código muerto:** se retira `findByIdWithMessages` y
  `ConversationWithMessages`, que no tenían ningún caller de producción y
  cargaban todos los mensajes si se usaban. Se limpian imports y mocks.

No hay cambios de API ni de UI.

## Decisiones

- **`existsByAssetId` en el puerto:** la decisión de borrar una imagen pertenece
  al caso de uso, pero la comprobación debe hacerla la base de datos. La consulta
  usa `OR` sobre las dos columnas y `LIMIT 1`.
- **Sin `synchronous = NORMAL`:** ahorraría algunos fsyncs, pero puede perder las
  últimas transacciones ante un corte de energía. Para una app local con
  conversaciones importantes, se mantiene el default seguro.
- **`cache_size` 16 MB:** suficiente para historiales largos sin inflar el uso de
  memoria de una app de escritorio; una sola conexión por proceso.
- **`busy_timeout` 5 s:** cubre el caso de una segunda conexión (CLI, backup,
  herramienta externa) sin bloquear indefinidamente.
- **Limpieza de `findByIdWithMessages`:** se comprobó que solo aparecía en el
  puerto, la implementación y mocks; no había llamadas reales.
- **Fuera de alcance:** cambiar `synchronous`, paginación de conversaciones/
  memorias/resúmenes más allá de los límites de S107 y métricas de descargas.

## Criterios de aceptación

- [x] `existsByAssetId` existe en el puerto y la implementación Drizzle.
- [x] `deleteAssetIfUnreferenced` usa la consulta, no `list()`.
- [x] `busy_timeout` y `cache_size` se aplican al abrir la base.
- [x] `findByIdWithMessages`/`ConversationWithMessages` eliminados.
- [x] Tests, `pnpm check`, build, smoke test y API en verde.
- [x] `CHANGELOG.md` actualizado en `[Unreleased]`.

## Verificación

- Backend: **650** tests (113 archivos), incluidos pragmas, assets y mocks.
- Frontend: **337** tests (57 archivos).
- `pnpm check`: arquitectura 7/7, typecheck y lint verdes.
- `pnpm build`: backend, frontend y website en verde.
- Paquete Linux y smoke test: PASS.
- API del paquete: **21/21**.
- `PRAGMA journal_mode` = `wal`, `foreign_keys` = `1`, `busy_timeout` = `5000`,
  `cache_size` = `-16000`.
- `existsByAssetId("asset1")` = `true` y `existsByAssetId("missing")` = `false`
  en el fixture real de SQLite.

## Commits

1. `c7c5a9a perf(backend): tune SQLite, check asset refs and remove dead lookup`
2. `23e70cc test(backend): cover SQLite pragmas and asset references`
3. `docs(slice): document S109 assets, SQLite and cleanup` (this commit)
