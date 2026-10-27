# S90 — Rendimiento de la base de datos

**Estado:** Completado (v1.51.0)
**Inicio:** 2026-10-27
**Fin:** 2026-10-27

## Descripción

Slice de rendimiento centrado en SQLite y en los flujos que más datos mueven.
No cambia la API pública ni la UI: los listados dejan de hacer N+1, las
consultas calientes usan índices y la generación deja de cargar el historial
completo cuando solo necesita una ventana reciente.

## Decisiones

- **Índices en una migración nueva:** se añaden índices no únicos para
  `messages`, `summaries`, `memories`, `memory_change_proposals`,
  `character_versions`, `character_cards`, `character_assets` y
  `conversations`. El de `messages(conversation_id, position)` es el crítico:
  elimina el `SCAN` y el `TEMP B-TREE` de cada lectura de mensajes.
- **Sin cambios de datos:** los índices se crean sobre tablas existentes; no hay
  backfill ni transformación de filas.
- **Puertos de lectura separados:** `CharacterSummaryRepository`,
  `CharacterAssetLookupRepository` y `MessageHistoryRepository` agrupan las
  consultas de listado/ventana. Los repositorios Drizzle implementan tanto el
  puerto de escritura como el de lectura, pero los casos de uso declaran solo lo
  que necesitan.
- **Listado de personajes en 3 consultas:** personajes + versiones actuales,
  versiones por lote y assets por lote. Antes era `1 + 2N` consultas y cargaba
  todas las versiones de cada personaje.
- **Listado de conversaciones en 5 consultas:** conversaciones, estadísticas
  agregadas de mensajes, versiones por lote, versiones actuales y assets por
  lote. Antes era ~`4N` consultas y cargaba todos los mensajes de todas las
  conversaciones solo para contar y calcular la última actividad.
- **Ventana reciente:** `send`, `continue`, `regenerate`, `get-prompt-context` y
  el título usan `findRecentByConversationId`. La posición del siguiente
  mensaje se obtiene con `findMaxPosition`, no con `messages.length`.
- **Desgaste de memoria:** se consultan solo los timestamps de los mensajes de
  usuario, no el contenido completo. El cálculo de turnos es el mismo.
- **Umbral de resumen:** `countMessagesSinceSummary` usa el total de mensajes y
  la posición del último mensaje del resumen, sin cargar el historial.
- **Resumen:** si hay resumen previo, se cargan solo los mensajes posteriores a
  su último mensaje con `findAfterPosition`; si no, se carga el historial
  completo porque es la primera síntesis.
- **Título:** usa el resumen más reciente (si existe) y los últimos 20 mensajes.
  Enviar la conversación entera al modelo después de cada resumen era un coste
  innecesario en chats largos.
- **Bug corregido:** `findLastByConversationId` ordena descendente y devuelve el
  último mensaje. Antes devolvía el primero.
- **Fuera de alcance:** paginación del chat (S93), Drizzle 0.45 (S91),
  Zod 4/OpenAI 7/Vitest 5 (S92), firma de releases y hardening. `branch`,
  `export`, `rewind` y `delete` siguen cargando el historial completo porque lo
  necesitan para copiar o borrar correctamente.

## Criterios de aceptación

- [x] Migración con los índices de las consultas calientes.
- [x] `EXPLAIN QUERY PLAN` usa índice y no `SCAN` en mensajes, resúmenes,
      versiones, tarjetas, memorias y propuestas.
- [x] Listado de personajes sin N+1 (consultas en lote).
- [x] Listado de conversaciones sin N+1 ni carga de todos los mensajes.
- [x] Flujos de generación usan ventana reciente y posición máxima.
- [x] Desgaste de memoria no carga el contenido de todos los mensajes.
- [x] Resumen con historial previo carga solo los mensajes nuevos.
- [x] Título acotado a resumen + últimos 20 mensajes.
- [x] `findLastByConversationId` devuelve el último mensaje.
- [x] API y UI sin cambios.
- [x] Backend, frontend, `pnpm check` y build en verde.
- [x] `CHANGELOG.md` actualizado en `[Unreleased]`.

## Verificación

- Backend: **606** tests (104 archivos), incluidos los nuevos de plan de
  consultas, ventana reciente, estadísticas, versiones actuales y umbral de
  resumen. La prueba de rendimiento crea una base temporal, aplica las
  migraciones y comprueba los `EXPLAIN QUERY PLAN`.
- Frontend: **329** tests (54 archivos), sin cambios funcionales.
- `pnpm check`: arquitectura 7/7, typecheck y lint verdes.
- `pnpm build`: backend, frontend y website en verde.

## Commits

1. `719adae feat(db): add indexes for hot queries`
2. `04fde76 perf(backend): batch list queries and load recent history`
3. `docs(slice): add S90 progress and performance notes` (this commit)
