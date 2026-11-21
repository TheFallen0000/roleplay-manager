# S135 — Backend & database audit

**Fecha:** 2026-11-21
**Skill:** `backend-database-review`
**Alcance:** `packages/backend/src` (use cases, repositorios Drizzle, esquema,
migraciones, rutas y tests).

## Baseline

| Comprobación | Resultado |
| ------------ | --------- |
| `pnpm check:arch` | 7/7, 0 warnings |
| `pnpm --filter @workspace/backend test` | 167 archivos / 1085 tests |
| `query-performance.test.ts` | 6 planes de consulta con `USING INDEX`, sin `SCAN` |
| `drizzle-kit check` | `Everything's fine` |
| Migraciones 0019/0020 | Tests de migración presentes |

## Hallazgos

### DB-1 — `reorderEntries` aceptaba ids ajenos (corregido)

- **Severidad:** Major (integridad).
- **Ubicación:** `application/use-cases/character/lorebook/reorder-lorebook-entries.use-case.ts`.
- **Evidencia:** el use case comprobaba que existiera el libro del personaje,
  pero pasaba `entryIds` directamente al repositorio; el repositorio hace
  `UPDATE ... WHERE id = ?` sin comprobar pertenencia.
- **Impacto:** un id de otro libro podía cambiar su `order`; un id inexistente
  se ignoraba silenciosamente.
- **Fix:** se valida que cada id pertenezca a las entradas del libro y que no
  haya duplicados antes de escribir. Códigos: `LOREBOOK_NOT_FOUND` (404) e
  `INVALID_LOREBOOK_ORDER` (400).
- **Validación:** `reorder-lorebook-entries.use-case.test.ts` cubre orden
  válido, id ajeno y duplicados; el test existente de `lorebook.use-case.test.ts`
  se actualizó con dos entradas reales.

### DB-2 — Paginación sin desempate único (corregido)

- **Severidad:** Minor (correctitud bajo datos repetidos).
- **Ubicación:** `drizzle-lorebook.repository.ts` (`list` y `listSummaries`).
- **Evidencia:** `ORDER BY lorebooks.created_at` sin una columna única; dos
  libros creados en el mismo instante pueden intercambiar posición entre
  páginas con `LIMIT/OFFSET`.
- **Fix:** `ORDER BY created_at, id` en ambas consultas.
- **Validación:** el orden sigue pasando los tests de repositorio; no se añadió
  un test específico de timestamps duplicados (ver DB-4).

### DB-3 — `listSummaries` escala con subconsultas por fila (diferido)

- **Severidad:** Minor (rendimiento a escala).
- **Ubicación:** `drizzle-lorebook.repository.ts` (`listSummaries`).
- **Evidencia:** por cada libro se ejecutan subconsultas correlacionadas para
  `entryCount`, `usageCount` y `usageVersionCount`; no hay índice parcial para
  `deleted_at IS NULL` + `created_at`.
- **Impacto:** con la biblioteca actual (decenas de libros) es aceptable. Con
  cientos de libros y muchas versiones, el coste crece con el número de filas
  de la página.
- **Decisión:** diferido. Si se superan ~500 libros o el tiempo de la estantería
  supera 50 ms, agrupar las métricas en una CTE y añadir un índice parcial
  `lorebooks(created_at) WHERE deleted_at IS NULL`.
- **Trigger:** medición con la biblioteca real o crecimiento del catálogo.

### DB-4 — Cobertura de planes para las consultas de lorebooks (diferido)

- **Severidad:** Nit.
- **Ubicación:** `query-performance.test.ts`.
- **Evidencia:** cubre mensajes, summaries, versiones de personaje, cards,
  memorias y propuestas; no cubre la estantería de lorebooks, `findVersions` ni
  `findUsageVersions`.
- **Decisión:** añadir planes cuando se toque `listSummaries` o se aborde DB-3;
  hoy los tests funcionales de repositorio cubren la corrección, no el plan.

### DB-5 — Índices y transacciones existentes (sin hallazgos)

- `messages(conversation_id, position)`, `summaries(conversation_id, created_at)`,
  `character_versions(character_id, version_number)`,
  `character_cards(version_id, position)`, `memories(conversation_id, priority)`,
  `memory_change_proposals(conversation_id, status)`,
  `lorebooks(origin_id)`, `lorebook_versions(lorebook_id, version_number)`,
  `lorebook_versions(source_key)` y `lorebook_entries(lorebook_id, order)`.
- `createContainerWithVersion`, `saveLiveHeadAndVersion`,
  `restoreVersionAsNewHead` y `reorderEntries` usan transacciones.
- `buildDatabase` fija WAL, `foreign_keys = ON`, `busy_timeout = 5000` y
  `cache_size = -16000`; los repositorios no duplican pragmas.
- Las rutas de tarjetas y lorebooks tienen límites de body específicos antes del
  parser global y devuelven errores JSON.

## Comandos ejecutados

```sh
pnpm check:arch
pnpm --filter @workspace/backend typecheck
pnpm --filter @workspace/backend test
pnpm --filter @workspace/backend exec drizzle-kit check
```

## Conclusión

No hay hallazgos bloqueantes. DB-1 y DB-2 quedan corregidos; DB-3 y DB-4 se
difieren con un disparador medible. La arquitectura, las migraciones y los
índices actuales cumplen las guard-rails de `AGENTS.md`.
