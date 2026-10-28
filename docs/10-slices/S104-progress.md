# S104 — Backups y consultas

**Estado:** Completado (pendiente de release batched)
**Inicio:** 2026-10-28
**Fin:** 2026-10-28

## Descripción

Cierra dos hallazgos P2 del barrido:

- **Backups más pequeños y seguros:** el snapshot raíz `roleplay.db` sigue
  siendo la única copia consistente de la base. La carpeta `data/` del backup
  ahora copia solo los assets (imágenes); excluye `roleplay.db`, `-wal`, `-shm`,
  `-journal` y los logs. Se añade retención de los **10 backups más recientes**.
- **N+1 en conversaciones por personaje:** `ConversationRepository` incorpora
  `listByCharacterId`, resuelto con un `INNER JOIN` a `character_versions`.
  `findCharacterConversations` deja de cargar todas las conversaciones y
  consultar la versión una por una.

No hay cambios de API ni de UI.

## Decisiones

- **Una sola copia de la base:** duplicar `data/roleplay.db` y sus sidecars
  WAL/SHM podía restaurar una base inconsistente. El `roleplay.db` raíz es el
  snapshot online correcto; `data/` queda para las imágenes.
- **Logs fuera del backup:** no son necesarios para recuperar datos, pueden
  contener extractos de conversación y crecen con el uso.
- **Retención 10:** suficiente para actualizaciones y backups manuales; se
  ejecuta después de escribir el nuevo backup y es *best-effort* (un fallo de
  limpieza no invalida la copia). Queda como constante, sin variable de entorno
  por ahora.
- **Join en SQL:** `listByCharacterId` filtra por `characterVersions.characterId`
  y ordena por `updatedAt`; evita el bucle y las N consultas del helper anterior.
- **Compatibilidad:** se actualizaron los mocks de `ConversationRepository` en
  los tests con `listByCharacterId: async () => []`; los tests de exportación y
  aplicar settings tienen su propio filtro.
- **Fuera de alcance:** paginación de personajes/conversaciones/memorias/
  resúmenes, `deleteAssetIfUnreferenced` (sigue cargando todas las
  conversaciones) y tuning de pragmas SQLite.

## Criterios de aceptación

- [x] El backup no incluye `data/roleplay.db`, WAL, SHM ni logs.
- [x] El backup conserva el `roleplay.db` raíz y los assets.
- [x] Se mantienen solo los 10 backups más recientes.
- [x] `listByCharacterId` usa un join y devuelve las conversaciones ordenadas.
- [x] Exportación y aplicar settings usan el nuevo método sin N+1.
- [x] Tests, `pnpm check`, build, smoke test, API y Playwright en verde.
- [x] `CHANGELOG.md` actualizado en `[Unreleased]`.

## Verificación

- Backend: **646** tests (112 archivos), incluidos backup, retención y el join.
- Frontend: **336** tests (57 archivos).
- `pnpm check`: arquitectura 7/7, typecheck y lint verdes.
- `pnpm build`: backend, frontend y website en verde.
- Paquete Linux y smoke test: PASS.
- Backup real del paquete: `roleplay.db` + assets; sin `data/roleplay.db`,
  WAL, SHM ni `data/logs`.
- API del paquete: **21/21**.
- Playwright/Chromium: 0 errores de consola y 0 violaciones CSP.

## Commits

1. `732c500 perf(backend): fix character conversation N+1`
2. `88c3445 fix(backup): exclude live database and logs, add retention`
3. `docs(slice): document S104 backups and queries` (this commit)
