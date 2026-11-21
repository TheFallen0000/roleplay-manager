# S136 — Memoria estructurada y retrieval léxico

**Estado:** Completado
**Inicio:** 2026-11-21
**Fin:** 2026-11-21

> `Draft` → `Aprobado` → `En progreso` → `Completado`.
> Solo el usuario cambia `Draft` a `Aprobado`.

## Descripción

S136 convierte la memoria dinámica en un sistema estructurado y selecciona qué
memorias entran en el prompt según relevancia y presupuesto de tokens, sin
embeddings ni llamadas externas. Añade tipos (`fact`, `episode`, `thread`),
retrieval léxico determinista, consolidación por actor/título, detalle en el
manifiesto de contexto y una eval propia. S137 queda para retrieval
vectorial/RAG, S138 para políticas de contexto y S139 para el tokenizer real.

## RFC

### Problema

1. **Todas las memorias elegibles entran en el prompt.** `filterMemoriesForPrompt`
   (`packages/backend/src/lib/memory-decay.ts`) solo aplica el decaimiento;
   `PromptContextBuilder` recibe esa lista y la serializa completa. No hay
   scoring por relevancia ni presupuesto de tokens. En una conversación larga,
   la memoria compite con mensajes, resumen y lorebook sin control.
2. **La memoria no tiene estructura.** `Memory` solo guarda `actor`, `title`,
   `description` y `priority`. No distingue un hecho estable, un episodio vivido
   o un hilo abierto, aunque S129 dejó fuera “facts/episodios/hilos” para este
   slice.
3. **El índice único impide títulos repetidos entre actores.**
   `memories_title_unique` es `(conversation_id, title)`. Dos actores no pueden
   tener una memoria llamada “Misión” aunque el dominio dice que cada memoria
   pertenece a un actor.
4. **La consolidación depende del modelo.** El prompt pide deduplicar, pero el
   servidor no impone nada: un CREATE con el mismo actor y título puede crear
   otra fila. `apply-memory-changes` no busca duplicados normalizados.
5. **El manifiesto no explica la memoria.** `ContextManifestDTO.memories` solo
   expone `total`, `included` y `excluded`; el preview no puede decir por qué
   entró o se omitió una memoria.
6. **No hay eval de selección.** `context-assembly.eval.test.ts` cubre
   prioridad/decaimiento, pero no recall, precisión, presupuesto ni orden
   estable de un retrieval real.

### Restricciones

- **Hexagonal.** El scoring vive en `application/services` o en un value object
  de dominio; no importa Drizzle. El repositorio sigue devolviendo entidades y
  `ConversationContextLoader` orquesta. No hay consultas nuevas por memoria.
- **Sin dependencias nuevas.** Nada de embeddings, modelos locales, FTS5 ni
  vector stores en S136. El retrieval es léxico y determinista.
- **`shared/` puro.** Los tipos (`MemoryType`, `MemoryDTO`, manifiesto) no
  importan React, Express ni Drizzle.
- **Migración aditiva y reversible en la práctica.** Añadir `type` con default
  `fact`; cambiar el índice único no pierde datos porque el índice antiguo era
  más restrictivo. Incluir test de migración.
- **Compatibilidad de API y export/import.** `type` es opcional en las
  entradas y default `fact`; los DTOs nuevos lo exponen. Un export antiguo sin
  `type` se importa como `fact`.
- **Presupuesto determinista.** El tamaño de la sección de memoria se deriva de
  la ventana efectiva; no se añade una pantalla de ajustes en S136. La UI para
  configurarlo llega con las políticas de contexto (S138).
- **Prompt y tool schema.** El modelo puede proponer `type`, pero el default y
  la validación son del servidor. El bloque de fallback y la herramienta deben
  seguir aceptando propuestas sin `type`.
- **Sin regresiones de prompt.** El texto de memoria cambia (tipo visible); los
  snapshots de eval y los tests de prompt se actualizan.
- **500 líneas / aislamiento de features / i18n.** La UI nueva vive en
  `components/conversation/` y las cadenas en `shared/i18n` (en/es).

### Opciones consideradas

| Opción | Ventajas | Costes | ¿Elegida? |
| ------ | -------- | ------ | --------- |
| S136 estructura + retrieval léxico; S137 vector RAG | Entregable, determinista y sin dependencias; deja el vector para su propia eval | Dos slices | Sí |
| S136 completo con embeddings/RAG | Una sola entrega | Dependencias, índice, proveedor, latencia, privacidad y eval mucho más grande | No |
| Solo estructura, sin retrieval | Cambio de schema y UI acotado | No resuelve el exceso de memoria en el prompt | No |
| Solo retrieval, sin tipos | Menos migración | Aplaza otra vez facts/episodios/hilos | No |
| SQLite FTS5 para el retrieval | Búsqueda nativa y rápida | Tokenización distinta al estimador, migración e índice extra; el volumen actual no lo exige | No en S136 |
| Scoring en memoria (O(n) por envío) | Simple, testeable y sin infraestructura | Coste lineal con el número de memorias | Sí |

### Decisión

- **S136** entrega tipos, retrieval léxico, consolidación, manifiesto, UI y
  eval. **S137** añade embeddings/vector store y búsqueda híbrida. **S138**
  políticas de contexto. **S139** tokenizer real.
- **Tipos:**
  - `fact`: hecho durable (comportamiento actual).
  - `episode`: algo que ocurrió en un momento concreto.
  - `thread`: objetivo, promesa o conflicto abierto.
  - `actor` sigue siendo el dueño de la memoria; `thread` no añade
    participantes en S136.
- **Scoring determinista** sobre las memorias elegibles por decaimiento:
  - `actorInPending` (+4) si el actor aparece como frase normalizada exacta en
    el mensaje pendiente (no substring).
  - `mainActor` (+2) si el actor es el personaje o el jugador.
  - `keywordHits` (+1 cada uno, máximo +5) por tokens únicos de título,
    descripción y actor presentes en el mensaje pendiente; tokens en minúsculas,
    normalizados sin acentos (Unicode), de 3+ caracteres, sin stopwords ES/EN.
  - `priority` (0–2) según la prioridad efectiva del decaimiento.
  - `typeWeight` (`thread` 1.5, `fact` 1, `episode` 0.5).
  - `recency` (0–1) según turnos desde `updatedAt`, con techo de 50.
  - Orden: score desc, prioridad desc, `updatedAt` desc, `id` asc.
- **Regla de entrada:** se incluye una memoria si tiene señal de relevancia
  (actor en el pendiente, actor principal o algún keyword), o si es `thread` o
  tiene prioridad efectiva ≥ 8. Las demás se omiten como `not-relevant`. El
  presupuesto recorta después por score.
- **Presupuesto:** `clamp(round(effectiveWindow * 0.12), 256, 2048)` tokens;
  con ventana desconocida, 512. El presupuesto cubre la sección completa
  (cabecera, hint y líneas). Si una memoria no cabe, se omite como `budget`.
- **Consolidación:** al aplicar un CREATE, se compara `(actor, title)`
  normalizado (minúsculas, NFD sin acentos, espacios colapsados/trim) y, si
  existe una memoria con esa clave, se aplica como UPDATE. La memoria guardada
  conserva el texto original (actor y título sin normalizar). El resultado
  indica cuántas se crearon, actualizaron o descartaron. El índice único pasa a
  `(conversation_id, actor, title)`.
- **Manifiesto:** `memories.selection` con incluidas y omitidas, su score y el
  motivo (`actor`, `keyword`, `priority`, `thread`, `budget`, `decay`,
  `not-relevant`). El preview lo muestra de forma compacta.
- **Prompt:** cada línea de memoria incluye `[type]`; la herramienta y el
  bloque aceptan `type` opcional y el servidor lo normaliza a `fact`.

### Clarificaciones confirmadas (2026-11-21)

Confirmadas por el usuario antes de la implementación; priman sobre la
redacción genérica de arriba:

- **Tokenización léxica.** Los keywords se extraen en **minúsculas**, con
  normalización Unicode sin acentos (NFD + strip de marcas), como tokens de
  letras/dígitos de **3+ caracteres**, descartando stopwords ES/EN.
  `actorInPending` (+4) se evalúa por **frase normalizada exacta** (actor
  normalizado presente como frase), no por substring.
- **Regla de entrada por prioridad efectiva.** El umbral "prioridad ≥ 8" de la
  regla de entrada usa la **prioridad efectiva tras decaimiento** (no la
  almacenada). Una memoria con prioridad almacenada alta pero ya decaída no
  entra como `priority`.
- **Thread en el umbral.** Un `thread` con prioridad efectiva igual al umbral
  de decaimiento sigue siendo elegible (comparación `>=`); `fact`/`episode` en
  ese mismo punto decaen. Es una excepción deliberada para no perder hilos
  abiertos.
- **`type` en propuestas.** `type` se persiste también en
  `memory_change_proposals`, con **columna propia en la migración 0021** y
  default `fact` (no solo en `memories`).
- **Consolidación normalizada, almacenamiento original.** La comparación de
  duplicados usa `(actor, title)` en **minúsculas**, con **NFD sin acentos** y
  **espacios colapsados/trim**; la memoria guardada **conserva el texto
  original** (actor y título sin normalizar).
- **Recencia lineal.** `recency = max(0, 1 - turnos/50)`: decrece linealmente
  de 1 a 0 hasta los 50 turnos desde `updatedAt`.
- **`memories.selection`.** Expone `id`, `included`, `score` y `reason`.
- **Servicio de retrieval.** `application/services/memory-retrieval.service.ts`
  con `selectMemoriesForPrompt(...)`.
- **Orden del loader.** El `ConversationContextLoader` resuelve los actores
  principales (personaje + personaje del usuario) **antes** del retrieval, para
  que `mainActor` esté disponible en el scoring.
- **Regenerate/continue sin `pendingMessages`.** Cuando no hay `pendingMessages`,
  el `ConversationContextLoader` usa el **último mensaje de usuario del
  historial** como señal léxica, para que el retrieval sea consistente entre un
  envío normal y una regeneración/continuación.

### Fuera de alcance

- Embeddings, RAG, vector store, búsqueda híbrida y reranking → S137.
- Políticas de contexto fast/balanced/deep y UI de presupuesto → S138.
- Tokenizer real por proveedor → S139.
- Memoria entre conversaciones, memoria global de personaje o grafo automático
  de relaciones.
- Detección de contradicciones semánticas; S136 solo detecta el conflicto
  exacto mismo actor/título.
- Cambios en el algoritmo de decaimiento o en la política de compactación.

## Plan de eval

Obligatorio porque cambia la selección de memoria y el prompt.

- **Fixtures:** `packages/backend/evals/fixtures/memory-retrieval.ts` con tres
  conversaciones de 40–60 memorias cada una, mezcla de tipos, actores,
  prioridades, edades y decaimiento, y un mensaje pendiente por escenario.
- **Escenarios:**
  1. El actor del mensaje tiene memorias relevantes y ruido de otros actores.
  2. El mensaje menciona un lugar/objeto que solo aparece en una memoria.
  3. Hay más memorias relevantes que presupuesto.
  4. Memorias decaídas que no deben entrar.
  5. Empate de score para verificar orden estable.
- **Métricas:** recall de memorias relevantes etiquetadas a mano, tasa de
  memorias irrelevantes incluidas, tokens de la sección, presupuesto respetado,
  determinismo entre ejecuciones y latencia del scoring (informativa).
- **Baseline:** el filtro actual (todas las elegibles) sobre los mismos
  fixtures; se registra cuántas entran y cuántos tokens ocupan.
- **Umbral:** recall ≥ 0,8; irrelevantes ≤ 0,2; presupuesto nunca superado;
  mismo orden en dos ejecuciones consecutivas. Si no se cumple, se ajustan
  pesos o la regla de entrada antes de cerrar el slice.

## Criterios de aceptación

- [x] `Memory` y `MemoryDTO` exponen `type`; las entradas lo aceptan opcional y
      el default es `fact`.
- [x] Migración: memorias existentes quedan como `fact`; dos actores pueden
      tener el mismo título; el mismo actor no puede duplicarlo.
- [x] El retrieval selecciona por relevancia y presupuesto, con orden estable y
      motivos en el manifiesto.
- [x] El prompt incluye solo las memorias seleccionadas y muestra el tipo.
- [x] La herramienta y el bloque de propuestas aceptan `type`; sin `type` se
      normaliza a `fact`.
- [x] Un CREATE duplicado por actor/título se aplica como UPDATE y el resultado
      lo refleja.
- [x] La UI permite elegir tipo, filtrar por tipo y ver la selección en el
      preview.
- [x] Export/import conserva `type`; un export antiguo importa como `fact`.
- [x] Eval de retrieval en verde con los umbrales del RFC.
- [x] `pnpm check`, tests backend/frontend, `pnpm build`, `pnpm audit --prod` y
      `pnpm eval` pasan.
- [x] `CHANGELOG` bajo `[Unreleased]`, en inglés; sin bump de versión.

## Red tests

| Área | Test rojo esperado |
| ---- | ------------------ |
| Entidad | `Memory.create` sin `type` → `fact`; `type` inválido → error; `update` cambia el tipo. |
| Migración | Base con memorias antiguas → `type = 'fact'`; mismo título con actores distintos permitido; mismo actor/título rechazado. |
| Repositorio | `findByConversationId` devuelve `type`; el alta/edición lo persiste. |
| Retrieval | Actor en pendiente gana a prioridad alta no relacionada; keyword selecciona; decaimiento excluye; presupuesto recorta; empate estable. |
| Manifiesto | Incluidas/omitidas con motivo y score; conteos coherentes. |
| Consolidación | CREATE con actor/título existente actualiza y no crea; el resultado marca `updated`. |
| Prompt/tool | La línea incluye `[fact]`/`[thread]`; el schema acepta `type`; sin `type` usa `fact`; el bloque fallback también. |
| UI | Selector de tipo, badge y filtro; el preview muestra motivos. |
| Eval | Los cinco escenarios y los umbrales del plan de eval. |

## Decisiones

Decisiones ya cerradas en el RFC:

- **Léxico antes que vectorial.** S136 resuelve el problema actual sin añadir
  dependencias ni latencia de embeddings.
- **Regla de entrada explícita.** No se inyectan memorias sin señal de
  relevancia, salvo `thread` o prioridad efectiva ≥ 8; el presupuesto recorta
  después.
- **Presupuesto conservador.** 12 % de la ventana efectiva, con mínimo 256 y
  máximo 2048; se ajustará con la eval y se expondrá en S138.
- **El servidor manda en la consolidación.** El modelo puede proponer, pero el
  CREATE duplicado se resuelve como UPDATE.
- **Tipo visible en el prompt.** `[type]` ayuda al modelo a distinguir un hecho
  de un hilo abierto sin cambiar el orden de las secciones.
- **Sin memoria entre conversaciones.** La unidad sigue siendo la conversación.

### Decisiones finales de implementación

- **Decaimiento estricto.** Una memoria por debajo del umbral de decaimiento se
  omite como `decay` aunque su actor o un keyword aparezcan en el mensaje: la
  señal léxica no la revive. `thread` conserva su propia regla de elegibilidad.
- **Tope de keywords.** `Math.min(keywordHits, 5)`: cinco o más keywords empatan
  en `+5`; cuatro puntúan menos. Los tests asertan el tope, no el conteo exacto.
- **`thread >=` es una excepción deliberada.** Un `thread` con prioridad efectiva
  igual al umbral sigue siendo elegible; `fact`/`episode` en ese mismo punto
  decaen. Está comentado en el servicio y cubierto por un test de frontera.
- **Señal léxica en regenerate/continue.** Sin `pendingMessages`, el loader usa
  el último mensaje de usuario del historial cargado; con mensaje pendiente no
  recorre el historial (escaneo perezoso).
- **Resultado de consolidación.** `apply` y `apply-all` devuelven
  `{ memories, created, updated, discarded }`. La ruta y el store consumen
  `result.memories`, y el store fusiona por `id` para conservar las memorias que
  no viajan en la respuesta.
- **Presupuesto único.** `resolveMemoryBudget` es la única fuente del
  presupuesto (`clamp(round(ventana efectiva * 0.12), 256, 2048)`; 512 sin
  ventana). La eval lo importa en lugar de duplicarlo. La sección renderizada se
  mide en `en` y `es` y se toma el máximo.
- **Pesos finales.** Actor en el pendiente `+4`, actor principal `+2`, keywords
  `+1` hasta `+5`, prioridad efectiva `0–2`, recencia lineal
  `max(0, 1 - turnos/50)` y multiplicador de tipo (`thread` 1.5, `fact` 1,
  `episode` 0.5). Orden: score desc, prioridad almacenada desc, `updatedAt`
  desc, `id` asc.

## Verificación

- `pnpm check`: 5/5 (`check:arch` + `typecheck` + `lint`).
- Backend: 171 archivos / 1139 tests.
- Frontend: 94 archivos / 506 tests.
- `pnpm --filter @workspace/backend eval`: 2 archivos / 52 tests.
- `pnpm build`: 4/4.
- `pnpm audit --prod`: limpio.
- `git diff --check`: limpio.
- Migración 0021 (columnas `type` con default, índice
  `(conversation_id, actor, title)`) y tests dirigidos de retrieval,
  consolidación y manifiesto: verdes.
- Release dry-run: no aplica (sin cambios de packaging, lockfile ni módulos
  nativos).
- Sin bump de versión y sin release: el slice queda bajo `[Unreleased]`.

## Review

- **Estado:** PASS WITH NOTES
- **Informe:** `docs/10-slices/S136-review.md`
- **Bloqueantes/mayores:** ninguno tras las correcciones. La primera pasada
  devolvió BLOCKED por un mayor: regenerate/continue perdía la señal léxica
  porque `pendingMessage` quedaba vacío.
- **Mayor resuelto:** fallback al último mensaje de usuario del historial
  (`5e881d8`), escaneo perezoso (`d6858ff`) y test de regresión (`c19a7d9`).
- **Menores resueltos:** la asimetría `thread >=` frente a `fact`/`episode >`
  queda documentada como excepción deliberada y probada en la frontera
  (`5928314`, `c19a7d9`); el presupuesto de la eval se importa del servicio
  (`c19a7d9`).
- **Nota aceptada:** la cobertura de backfill de `migration-0021.test.ts` cubre
  el `DEFAULT`, no una fila pre-0021 real.
- **Nit corregido:** el comentario de `selection` explica el orden que exige la
  eval (`5e881d8`).

## Deferred

- **`generate-summary` con el filtro antiguo.** La compactación sigue usando
  `filterMemoriesForPrompt`; alinear el prompt de resumen con el retrieval y
  darle su propio presupuesto corresponde a **S138 (políticas de contexto)**.
- **Cobertura de backfill de la migración.** `migration-0021.test.ts` comprueba
  el `DEFAULT 'fact'` sobre inserciones posteriores, no una base pre-0021 con
  filas reales migradas.
- **Complejidad de `selection`.** Se documenta el orden exigido por la eval;
  simplificar la construcción requiere cambiar ese contrato.
- Retrieval vectorial/RAG y búsqueda híbrida → S137.
- Políticas de contexto y UI del presupuesto → S138.
- Tokenizer real → S139.
- Contradicciones semánticas y consolidación avanzada → posterior.
- Memoria entre conversaciones o por personaje → posterior.
- FTS5 o índice invertido → solo si la eval o el volumen lo justifican.

## Commits

1. `92c3ad4` `docs(slice): add S136 RFC`
2. `24bc243` `docs(slice): approve S136 RFC`
3. `3a12549` `docs(slice): add S136 orchestration plan`
4. `e7e9a42` `docs(slice): approve S136 test plan and clarifications`
5. `d706a58` `docs(slice): define S136 consolidation result`
6. `7267088` `test(memory): add S136 red tests and eval fixtures`
7. `b1b0920` `docs(slice): enforce strict decay in S136 test plan`
8. `d792572` `test(memory): align S136 decay and keyword cap expectations`
9. `7aaab43` `feat(shared): add memory types and retrieval contracts`
10. `5caf5c1` `feat(backend): add memory persistence and lexical retrieval`
11. `945c150` `feat(backend): consolidate memories and expose apply counts`
12. `824644d` `test(frontend): isolate memory list persistence`
13. `5665116` `feat(frontend): add memory type controls and selection preview`
14. `7cf4646` `test(frontend): cover memory store merge`
15. `adfdda4` `fix(frontend): preserve unrelated memories on apply`
16. `5928314` `docs(slice): clarify S136 regenerate and thread boundary`
17. `c19a7d9` `test(backend): cover S136 regenerate and thread boundary`
18. `5e881d8` `fix(backend): keep lexical signal on regenerate`
19. `d6858ff` `refactor(backend): avoid history scan when a pending message exists`
