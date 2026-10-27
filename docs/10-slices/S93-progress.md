# S93 — Paginación del historial del chat

**Estado:** Completado (v1.52.0)
**Inicio:** 2026-10-27
**Fin:** 2026-10-27

## Descripción

El chat deja de cargar la conversación completa al abrirse. Ahora muestra la
última página de mensajes y carga páginas anteriores automáticamente al
acercarse al principio, conservando la posición del scroll. El slice incluye
las optimizaciones necesarias para que la memoria y el rewind sigan siendo
correctos con historial parcial.

## Decisiones

- **Página inicial de 50 mensajes:** `GET /api/conversations/:id` devuelve la
  última página y añade `messagesHasMore` y `messagesNextCursor`. El máximo por
  petición es 200.
- **Endpoint de páginas anteriores:** `GET /api/conversations/:id/messages`
  acepta `before` (posición) y `limit`. El cursor es la posición del mensaje más
  antiguo de la página; las páginas se piden hacia atrás.
- **Sin cambios de esquema:** el índice `messages(conversation_id, position)` de
  S90 cubre la consulta. `hasMore` se calcula pidiendo `limit + 1` filas.
- **Auto-load con el scroller nativo:** `MessageScrollerProvider` usa
  `scrollEdgeThreshold={200}` y `MessageScroller` ya preserva el scroll al
  prepender (`preserveScrollOnPrepend`). No se reimplementa la restauración
  manual.
- **Sin carga al montar:** el auto-load solo se dispara cuando el usuario cruza
  el umbral; el montaje inicial se ancla al final sin pedir una página extra.
- **Respaldo accesible:** además del auto-load, hay un botón “Cargar mensajes
  anteriores”, un spinner durante la petición y un estado de error con reintento.
- **Store paginado:** `messages`, `hasMoreMessages`, `nextMessageCursor`,
  `isLoadingOlder` y `loadOlderError`. `prependMessages` deduplica y ordena por
  posición.
- **Memoria sin historial completo:** `ListMemoriesUseCase` calcula
  `turnsSinceUpdate` en el backend con los timestamps de mensajes de usuario.
  La UI usa ese valor y deja de depender de `chatMessages`. En respuestas de
  crear/actualizar, el campo es opcional y el fallback es 0 (la memoria acaba
  de actualizarse).
- **Rewind ligero:** `POST /conversations/:id/rewind` devuelve
  `deletedMessageIds` en vez de todos los mensajes restantes. El frontend
  trunca el store localmente y refresca memorias, propuestas y resúmenes.
- **Apertura de chat más ligera:** `GetConversationUseCase` usa
  `findVersionSummariesByIds` y `findCurrentVersionSummaryByCharacterId` en vez
  de cargar todas las versiones y tarjetas del personaje.
- **Fuera de alcance:** virtualización de mensajes (la página de 50 y
  `content-visibility` bastan), paginar ramas/exportaciones/contexto de
  generación, y hacer configurable el tamaño de página.

## Criterios de aceptación

- [x] La conversación se abre con la última página y metadatos de paginación.
- [x] Existe un endpoint de páginas anteriores con cursor por posición.
- [x] El chat carga páginas anteriores automáticamente al acercarse al inicio.
- [x] El scroll no salta al prepender mensajes.
- [x] Hay botón manual, spinner y reintento si falla la carga.
- [x] No se lanzan peticiones duplicadas ni se mezclan conversaciones.
- [x] La memoria calcula el desgaste con datos del backend, no con el historial
      parcial del cliente.
- [x] El rewind ya no devuelve el historial completo.
- [x] La apertura del chat no carga todas las versiones del personaje.
- [x] Backend, frontend, `pnpm check`, build y smoke test en verde.
- [x] `CHANGELOG.md` actualizado en `[Unreleased]`.

## Verificación

- Backend: **612** tests (106 archivos), incluidos paginación de mensajes,
  detalle con metadatos, rewind por IDs, memoria con turnos y ruta HTTP.
- Frontend: **335** tests (56 archivos), incluidos store paginado, hook de carga
  de páginas, memoria por turnos y formato de desgaste.
- `pnpm check`: arquitectura 7/7, typecheck y lint verdes.
- `pnpm build`: backend, frontend y website en verde.
- Paquete Linux generado y smoke test completo, incluyendo metadatos de
  paginación y `GET /conversations/:id/messages`.
- `pnpm audit --prod`: sin cambios de dependencias; 0 críticas y 4 altas en el
  árbol de build de Astro.

## Commits

1. `23f1ca8 feat(chat): paginate message history with auto-load`
2. `docs(slice): add S93 progress and pagination notes` (this commit)
