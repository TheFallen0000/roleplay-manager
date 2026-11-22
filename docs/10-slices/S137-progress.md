# S137 — Retrieval vectorial/RAG y búsqueda híbrida

**Estado:** Completado
**Inicio:** 2026-11-21
**Fin:** 2026-11-21

> `Draft` → `Aprobado` → `En progreso` → `Completado`.
> Solo el usuario cambia `Draft` a `Aprobado`.

## Descripción

S137 añade recuperación semántica sobre la memoria dinámica mediante
embeddings y la fusiona con el retrieval léxico de S136 en una búsqueda
híbrida determinista, con fallback léxico cuando el proveedor de embeddings no
existe o falla. Los vectores son datos derivados, opt-in, local-first por
defecto y nunca bloquean el envío. S138 (políticas de contexto), S139
(tokenizer) y el RAG sobre mensajes/lorebooks completos quedan fuera.

> **Nota de alcance:** S137 es retrieval **semántico de memoria**, no RAG sobre
> mensajes o lorebooks completos. La recuperación vectorial solo indexa la
> memoria dinámica; los mensajes y los lorebooks siguen su camino actual (S129,
> S133) y el RAG sobre ellos queda fuera.

## RFC

### Problema

1. **El retrieval léxico pierde relevancia semántica.** S136 puntúa por actor
   exacto, keywords normalizados y tipo/prioridad/recencia. No recupera una
   memoria cuya redacción no comparte tokens con el mensaje pendiente: un
   usuario escribe «El dragón escupe fuego» y la memoria «El wyrm exhala
   llamas» no comparte ningún keyword de 3+ caracteres, así que se omite como
   `not-relevant`. En conversaciones largas con sinónimos y paráfrasis, las
   memorias relevantes se quedan fuera aunque el modelo las habría necesitado.
2. **No hay señal semántica en el manifiesto.** `MemorySelectionReason` solo
   distingue `actor`, `keyword`, `priority`, `thread`, `budget`, `decay` y
   `not-relevant`. El preview no puede explicar por qué entró una memoria por
   significado.
3. **No existe infraestructura de embeddings.** No hay puerto, adaptador,
   tabla ni ciclo de vida para vectores; todo el pipeline de S136 es léxico.
4. **No hay eval que mida el fallo semántico.** `memory-retrieval.eval.test.ts`
   cubre recall/precisión/presupuesto sobre señales léxicas, pero ningún
   fixture con paráfrasis donde el léxico falla por diseño.

### Restricciones

- **Hexagonal.** El scoring híbrido vive en `application/services`; el
  repositorio de embeddings es un puerto (`domain/ports/`); la implementación
  Drizzle vive en `infrastructure/`. Nada de `drizzle-orm` en `application/`.
- **`shared/` puro.** Los tipos nuevos (`embedding.ts`, motivos `semantic`/
  `hybrid` en `context.ts`) no importan React, Express ni Drizzle.
- **Sin dependencias nuevas ni extensiones nativas.** Nada de `sqlite-vec`,
  `pgvector`, `onnx` ni bibliotecas de vectores. La similitud coseno se calcula
  en JS sobre `Float32Array`; el volumen (40–60 memorias por conversación) lo
  permite. Cualquier dependencia requeriría justificación fuerte y aprobación.
- **Sin regresiones de S136.** El contrato de selección (`selection`, motivos,
  presupuesto, orden estable) se mantiene; el híbrido añade señales, no cambia
  el presupuesto ni el orden base.
- **Local-first y privacidad.** Sin configuración, el comportamiento es
  idéntico a S136: el texto de memoria **no** sale del dispositivo. Los
  embeddings son opt-in; el proveedor por defecto es local (Ollama); remoto es
  elección explícita con aviso.
- **Sin red en tests/eval.** Todo embedding en tests y eval usa un proveedor
  falso determinista (sin `fetch`).
- **Compatibilidad export/import.** Los vectores son derivados y no viajan en
  export/import; se reconstruyen por reindexado. El schema de export no cambia.
- **500 líneas / aislamiento de features / i18n en/es.** La UI nueva vive en
  `components/provider/` (o una sección del gestor de proveedores) y las
  cadenas en `shared/i18n`.
- **Sin invadir S138.** Aquí no se tocan políticas de contexto
  fast/balanced/deep ni el presupuesto; solo se configura **qué proveedor/modelo
  produce vectores** y el estado de indexado.

### Opciones consideradas

| Opción | Ventajas | Costes | ¿Elegida? |
| ------ | -------- | ------ | --------- |
| A. Embeddings solo Ollama local | Privacidad total, sin red, simple | No cubre usuarios con OpenAI-compatible; menos flexible | No |
| B. Embeddings solo OpenAI-compatible | Un único camino | Rompe local-first; envía texto de memoria a red por defecto | No |
| C. Ambos, default local, remoto opt-in | Local-first + flexibilidad; fallback léxico si no hay | Dos adaptadores de embed + configuración por proveedor | **Sí** |
| A. `EmbeddingProviderPort` separado | Aislamiento de responsabilidades | Segundo registro, más wiring, duplica selección de proveedor | No |
| B. Método opcional `embed?` en `ProviderPort` | Un solo registro; coherente con `getModelContextWindow?`/`resolveCapabilities?`; no rompe adaptadores | El puerto crece | **Sí** |
| A. `sqlite-vec` / ANN nativo | Búsqueda vectorial rápida | Extensión nativa nueva (prohibida), packaging, build por plataforma | No |
| B. Tabla derivada `memory_embeddings` + coseno en JS | Sin dependencias; volumen pequeño; migración aditiva | Brute-force O(n·d) por conversación | **Sí** |
| A. Embedding eager (al crear/editar) | Vectores siempre listos | Bloquea o complica el guardado; fallo del proveedor interrumpe | No (solo best-effort) |
| B. Embedding lazy (solo en retrieval) | Nunca bloquea el envío; fallback natural | Primera consulta paga la latencia; backfill separado | Parcial |
| C. Eager best-effort + lazy en retrieval + reindexado manual | Siempre degrada a léxico; indexado progresivo | Más caminos de escritura | **Sí** |
| A. RRF (Reciprocal Rank Fusion) | Robusto ante escalas distintas | Rompe el contrato de score de S136; opaco para el preview | No |
| B. Suma ponderada de score léxico + coseno normalizado | Conserva `score` y orden de S136; un motivo nuevo por señal | Calibrar pesos en la eval | **Sí** |

### Decisión

- **Embeddings opt-in y local-first.** Sin configuración, S137 se comporta
  exactamente como S136 (léxico). El usuario activa embeddings eligiendo un
  proveedor + modelo. El proveedor por defecto es **Ollama local** (el texto no
  sale del dispositivo); OpenAI-compatible (`/v1/embeddings`) queda disponible
  como opción remota **explícita**, con aviso de privacidad en la UI. Si el
  proveedor configurado no soporta embeddings, no responde o no está disponible,
  el retrieval **degrada a léxico** sin error de usuario.
- **Puerto: método opcional en `ProviderPort`.** Se añade
  `embed?(input: EmbedRequest): Promise<EmbedResult>` (y, si aporta valor, un
  `supportsEmbeddings?()` barato) junto a los métodos opcionales existentes.
  Los adaptadores actuales no se rompen (no implementan el método). La
  capacidad se descubre de forma perezosa: intentar `embed` y, ante error o
  ausencia de método, fallback léxico. No hay segundo registro.
  - `EmbedRequest { texts: string[]; model: string }`.
  - `EmbedResult { vectors: number[][]; model: string; dimension: number }`.
  - Errores: reutilizar `ProviderError`/`ProviderTimeoutError`; añadir
    `EmbeddingUnavailableError` (dominio, sin propagar al usuario) para
    distinguir «no soporta» de «fallo transitorio».
  - Los vectores se L2-normalizan en el adaptador o en el servicio al
    persistirse, para que coseno == producto escalar.
- **Modelo por proveedor/instancia.** Configuración global en la tabla
  `settings`: `embeddings_provider`, `embeddings_provider_instance_id`,
  `embeddings_model_ollama`, `embeddings_model_openai_compatible`. Sin
  auto-detección de modelo de embedding (Ollama `/api/tags` no distingue chat
  de embed): el usuario selecciona el modelo explícitamente; la UI sugiere
  modelos conocidos (`nomic-embed-text`, `mxbai-embed-large`, `all-minilm`)
  como ayuda, no como default forzado.
- **Almacenamiento: tabla derivada + coseno en JS.** Migración aditiva `0022`
  con tabla `memory_embeddings`:
  - `memory_id` (PK/FK → `memories.id`, `onDelete: cascade`),
  - `provider` (text), `model` (text), `dimension` (integer),
  - `vector` (BLOB: `Float32Array` little-endian),
  - `text_hash` (text; hash del texto embebido para invalidación),
  - `created_at`, `updated_at` (timestamp).
  - Índice único sobre `memory_id` (1:1). Para reindexado/estado, un
    `LEFT JOIN` sobre `memories` encuentra las memorias sin vector.
  - En retrieval se cargan los embeddings de las memorias ya cargadas
    (`WHERE memory_id IN (...)`), y el coseno se calcula en JS contra el vector
    de la consulta. El batch de escritura (backfill) usa el array de textos que
    los adaptadores ya aceptan.
- **Ciclo de vida.** (1) Al crear/editar una memoria, el servicio **intenta**
  embeder de forma best-effort (fire-and-forget con timeout corto) y persiste el
  vector si tiene éxito; si el proveedor falla, la memoria queda sin vector.
  (2) En retrieval, un vector es válido solo si existe, su `text_hash` coincide
  con el texto actual (`title + description`) **y** su `provider`/`model`/
  `dimension` coinciden con la configuración activa. `text_hash` cubre
  únicamente el texto; `provider`/`model`/`dimension` se comparan por separado,
  de modo que cambiar de modelo (u otro proveedor/dimensión) invalida el vector
  y fuerza reindexado o fallback léxico. Una memoria sin vector válido se
  puntúa solo léxicamente o se re-embebe perezosamente. (3) Reindexado manual:
  recorre las
  memorias sin vector o con hash desactualizado, en lotes (p. ej. 16), con
  progreso y estado (`indexed`/`missing`/`failed`). (4) Sin reintentos
  automáticos (coherente con §06); sin límite de coste adicional porque la
  latencia se acota al timeout del proveedor y el volumen es pequeño. **El
  envío nunca espera al embedding**: la generación continúa con lo que haya.
- **Híbrido (suma ponderada).** Se extiende `selectMemoriesForPrompt` para
  recibir opcionalmente `semanticScores: Map<memoryId, number>` (coseno ya
  normalizado en [0,1]):
  - `base = signal + priorityScore + recency + SEMANTIC_WEIGHT * semanticScore`,
    con `SEMANTIC_WEIGHT` calibrado en la eval (propuesta inicial 2.0).
  - Elegibilidad: una memoria sin señal léxica pero con
    `semanticScore >= SEMANTIC_THRESHOLD` (propuesta 0.55) se vuelve elegible
    con motivo `semantic`; si además tiene señal léxica y supera el umbral, el
    motivo es `hybrid`.
  - `MemorySelectionReason` gana `"semantic" | "hybrid"`. El orden base de S136
    (score desc, prioridad desc, `updatedAt` desc, `id` asc) no cambia.
  - El presupuesto no cambia: la fusión solo reordena/elige, no altera
    `resolveMemoryBudget` ni la renderización.
  - El texto embebido es `title + "\n" + description` (no `actor`): el actor se
    resuelve léxicamente (señal fuerte y ya cubierta) y el vector captura el
    **hecho**. Ajustable en la eval.
- **Manifiesto.** `ContextManifestDTO.memories` gana
  `embedding?: { enabled: boolean; provider?: string; model?: string; indexed: number; missing: number }`
  para depurar el preview. Los motivos nuevos aparecen en `selection`.
- **Privacidad/seguridad.** Sin vectores en logs (nunca se loguea contenido del
  vector ni texto de memoria en el camino de embedding). La config expone
  `hasApiKey`/`url`, nunca la clave. El aviso de la UI deja claro que al
  elegir un proveedor remoto el **texto de memoria** sale del dispositivo.
- **Export/import y migración.** Los vectores son derivados y no se exportan;
  al importar se crean memorias sin vector y se reconstruyen con reindexado. El
  `EXPORT_SCHEMA_VERSION` no cambia. La migración `0022` es aditiva (tabla
  vacía, sin datos que migrar).

### Fuera de alcance

- Políticas de contexto fast/balanced/deep y UI del presupuesto → **S138**.
- Tokenizer real por proveedor → **S139**.
- RAG sobre mensajes completos o lorebooks (aquí solo memoria dinámica).
- Memoria entre conversaciones o memoria global de personaje.
- Reranking con LLM (re-rank de candidatos semánticos con el modelo).
- Grafo de relaciones o detección de contradicciones semánticas.
- `sqlite-vec` / ANN nativo / cualquier extensión nativa nueva.
- Re-embedding automático al cambiar de modelo (se cubre con invalidación por
  hash + reindexado manual).
- Alinear `generate-summary` con el retrieval híbrido → sigue diferido a S138.

## Plan de eval

Obligatorio: cambia la selección de memoria y el prompt.

- **Fixtures:** `packages/backend/evals/fixtures/memory-vector-retrieval.ts`
  con escenarios de **paráfrasis/sinónimos** donde el léxico falla por diseño,
  más los cinco fixtures de S136 reutilizados como regresión. El proveedor de
  embeddings es un **fake determinista sin red** (`MemoryEmbeddingProvider`
  falso): mapea un vocabulario reducido de sinónimos (p. ej.
  «dragón»≈«wyrm», «fuego»≈«llamas», «bosque»≈«arboleda») a vectores cercanos
  con una semilla fija, y tokens no mapeados a vectores casi ortogonales.
- **Escenarios nuevos:**
  1. Paráfrasis pura (sin keywords compartidos) → el léxico omite, el vector
     recupera.
  2. Sinonimia parcial (algún keyword común + significado cercano) → motivo
     `hybrid`.
  3. Falsa proximidad (texto semánticamente lejano con tokens parecidos) → no
     debe entrar por vector.
  4. Proveedor de embeddings ausente/falla → selección idéntica a S136
     (fallback léxico).
  5. Presupuesto con señales semánticas (más candidatos relevantes que
     presupuesto) → recorta sin romper el orden.
- **Métricas:** recall de relevantes etiquetados a mano, tasa de irrelevantes
  incluidas, tokens de la sección, presupuesto respetado, determinismo entre
  ejecuciones y latencia del pipeline híbrido (informativa).
- **Baseline:** S136 léxico sobre los mismos fixtures: en los escenarios de
  paráfrasis el recall léxico es ~0; el híbrido debe levantarlo sin degradar la
  precisión de los fixtures léxicos.
- **Umbral:** recall ≥ 0,8 en los escenarios de paráfrasis; irrelevantes ≤ 0,2
  en todos; presupuesto nunca superado; orden estable entre dos ejecuciones;
  fallback léxico bit-igual a S136 cuando el proveedor no está. Si no se
  cumple, se calibran `SEMANTIC_WEIGHT`/`SEMANTIC_THRESHOLD` antes de cerrar.

## Criterios de aceptación

- [x] `ProviderPort` expone `embed?` opcional; los adaptadores existentes
      compilan sin implementarlo; Ollama (`/api/embed`) y OpenAI-compatible
      (`/v1/embeddings`) lo implementan con normalización L2 y dimensiones.
- [x] Migración `0022` crea `memory_embeddings` aditiva; `onDelete: cascade`
      sobre `memories`; test de migración.
- [x] Config global de embeddings (`provider`, `instance`, `model`) persiste en
      `settings` y se expone por DTO sin secretos.
- [x] Al crear/editar una memoria, el embedding se intenta best-effort y un
      fallo del proveedor **no** interrumpe el guardado ni el envío.
- [x] En retrieval, una memoria sin vector, con `text_hash` desactualizado o con
      `provider`/`model`/`dimension` distintos a la configuración activa se
      puntúa léxicamente (sin señal semántica) o se re-embebe; nunca rompe.
- [x] La fusión híbrida añade motivos `semantic`/`hybrid` al manifiesto y
      mantiene el orden estable y el presupuesto de S136.
- [x] Con embeddings desactivados o proveedor caído, la selección es bit-igual a
      S136 (test de regresión).
- [x] Reindexado manual con progreso y estado (`indexed`/`missing`/`failed`);
      no exporta vectores; import reconstruye por reindexado.
- [x] UI: sección de embeddings (proveedor/modelo/estado + reindexar) en el
      gestor de proveedores, con aviso de privacidad para remoto; i18n en/es.
- [x] Eval de vector/híbrido en verde con los umbrales del plan de eval; los
      fixtures de S136 siguen en verde sin regresión.
- [x] `pnpm check`, tests backend/frontend, `pnpm build`, `pnpm audit --prod` y
      `pnpm eval` pasan.
- [x] `CHANGELOG` bajo `[Unreleased]`, en inglés; sin bump de versión.

## Red tests

| Área | Test rojo esperado |
| ---- | ------------------ |
| Puerto/adaptadores | Ollama `/api/embed` normaliza y devuelve dimensión; OpenAI-compatible `/v1/embeddings` idem (fetch/`openai` mockeado); un adaptador sin `embed` no se rompe. |
| Migración | `memory_embeddings` existe, PK sobre `memory_id`, cascade al borrar memoria; test de migración. |
| Repositorio embeddings | `upsert`/`findByMemoryIds`/`deleteByMemoryId(s)`/`listMissingForConversation`/`countStatus` persisten y leen BLOB `Float32Array`. |
| Servicio de embedding | Vector L2-normalizado; `text_hash` invalida al cambiar texto/modelo; fallo del proveedor → sin vector y sin excepción al caller. |
| Retrieval híbrido | Paráfrasis sin keywords entra como `semantic`; sinonimia parcial como `hybrid`; sin embeddings el resultado iguala S136; orden estable y presupuesto respetado. |
| Manifiesto | `selection` admite `semantic`/`hybrid`; `memories.embedding` con `enabled/indexed/missing`. |
| Config/API | `get`/`set` de config de embeddings; DTO sin apiKey; `reindex` devuelve estado. |
| UI | Selector proveedor/modelo, aviso de privacidad remoto, botón reindexar y estado; sin strings hardcodeadas. |
| Eval | Escenarios de paráfrasis/sinonimia/falsa proximidad/fallback/presupuesto con los umbrales del plan de eval. |

## Decisiones

- **Opt-in y local-first.** Sin configuración, S137 es S136 (léxico puro).
  Embeddings se activan explícitamente; default local (Ollama) y remoto
  (OpenAI-compatible) solo por elección del usuario, con aviso de privacidad.
- **Método opcional `embed?` en `ProviderPort`, no un puerto separado.**
  `EmbedRequest { texts, model }` y `EmbedResult { vectors, model, dimension }`;
  los adaptadores existentes compilan sin implementarlo. Errores de dominio
  (`EmbeddingUnavailableError`) no se propagan al usuario.
- **Tabla derivada + coseno en JS**, sin extensiones nativas: migración aditiva
  `0022` con `memory_embeddings` (`memory_id` PK/FK cascade, `provider`,
  `model`, `dimension`, `vector` BLOB `Float32Array` little-endian,
  `text_hash`, timestamps). El coseno se calcula en JS sobre el volumen de
  memoria de una conversación.
- **Eager best-effort + lazy en retrieval + reindexado manual global.** Al
  crear/editar se intenta embeber sin bloquear el guardado; en retrieval se
  re-embebe perezosamente; `ReindexMemoryEmbeddingsUseCase.execute()` no recibe
  `conversationId`, recorre todas las conversaciones en lotes de 16 y devuelve
  `{ indexed, missing, failed }` (fallos por memoria, sin abortar el resto).
- **Fusión por suma ponderada** sobre el scorer de S136, no RRF:
  `base = signal + priorityScore + recency + 2.0 * semanticScore`, elegibilidad
  con umbral 0.55 y motivos `semantic`/`hybrid` nuevos. Orden y presupuesto de
  S136 intactos; sin `semanticScores` el resultado es bit-igual.
- **Dimensión en `settings`.** `embeddings_dimension` se escribe tras el primer
  embed correcto (eager o reindex) y se borra al cambiar provider/model/
  instancia; sin dimensión activa no se usa el coseno y todo cuenta como
  `missing`.
- **Validación de provider/instancia.** `configure-embedding` rechaza una
  instancia cuyo `kind` no coincide con el provider
  (`INVALID_EMBEDDING_INSTANCE`, 400), el servicio repite la defensa y
  `hasApiKey` consulta también la clave global heredada. El DTO nunca expone la
  clave.
- **Privacidad.** Sin texto de memoria ni vectores en logs; el camino remoto
  solo se activa de forma explícita y queda validado en servidor. Los vectores
  son derivados: no viajan en export/import ni cambian
  `EXPORT_SCHEMA_VERSION`.

## Clarificaciones confirmadas (2026-11-21)

Confirmadas por el usuario al aprobar el RFC; priman sobre la redacción
genérica de arriba:

1. **Embeddings desactivados por defecto.** Sin configuración, el comportamiento
   es bit-igual a S136 (léxico). La activación es explícita: el usuario elige
   proveedor + modelo en la sección «Embeddings». Default local (Ollama),
   remoto opt-in.
2. **Sin auto-detección del modelo de embedding.** El usuario selecciona el
   modelo; la UI sugiere nombres conocidos (`nomic-embed-text`,
   `mxbai-embed-large`, `all-minilm`) como ayuda, nunca como default forzado.
3. **Configuración en el gestor de proveedores.** La sección «Embeddings» vive
   dentro del gestor de proveedores, no en un panel propio de memoria; no toca
   las políticas de contexto (S138).
4. **Texto embebido = `title + description`.** El actor se resuelve léxicamente
   (señal ya cubierta por S136); el vector captura el hecho, no la propiedad
   del actor.

## Verificación

- **Tests:** backend 181 archivos / 1213 tests; frontend 96 archivos /
  513 tests; eval 3 archivos / 92 tests.
- **`pnpm check`:** 5/5 (`check:arch` + typecheck + lint).
- **`pnpm build`:** 4/4.
- **`pnpm audit --prod`:** limpio.
- **`git diff --check`:** limpio.
- **Release:** sin bump de versión ni release publicada; los cambios van bajo
  `[Unreleased]`.
- **Release dry-run:** no aplica (sin cambios de packaging, lockfile ni módulos
  nativos).

## Review

- **Estado:** PASS WITH NOTES
- **Informe:** `docs/10-slices/S137-review.md`
- **Bloqueantes/mayores:** ninguno.
- **Resumen:** seis hallazgos menores. Resueltos el 1 (la dimensión solo se
  escribía en el reindex), el 2 (el reindex no validaba la longitud del vector)
  y el 5 (formato en `get-prompt-context`), además del 3 (provider/instancia y
  `hasApiKey` global), todos en `dba2f5f` con tests. Aceptados y documentados el
  4 (`aggregateStatus` hace 2N consultas en ajustes) y el 6 (race inherente al
  fire-and-forget, se auto-cura por `textHash` y reindex).

## Deferred

- **`aggregateStatus` O(2N)** en `get-embedding-config`: aceptado para el
  volumen actual; una consulta agregada queda como mejora futura.
- **Race fire-and-forget** al crear/editar: un edit inmediato puede persistir el
  vector de la versión anterior; se auto-cura en retrieval y reindex.
- **Re-embedding automático al cambiar de modelo**: por ahora invalidación por
  provider/model/dimension + reindexado manual.
- **`sqlite-vec` / ANN nativo**: solo si el volumen o la latencia lo justifican.
- **RAG sobre mensajes/lorebooks completos**: fuera del alcance de S137.
- **`generate-summary` con el filtro antiguo** → **S138** (políticas de
  contexto).
- **Reranking con LLM** de candidatos semánticos → posterior.
- **Memoria entre conversaciones o por personaje** → posterior.

## Commits

1. `544a41c` `docs(slice): add S137 RFC`
2. `8b8adac` `docs(slice): approve S137 RFC`
3. `49f83b3` `docs(slice): add S137 orchestration plan`
4. `503822e` `docs(slice): add S137 test plan`
5. `eb895d9` `docs(slice): set S137 global reindex and dimension contract`
6. `51a07f8` `test(memory): add S137 red tests and eval fixtures`
7. `7d58e87` `test(backend): fix S137 reindex target typing`
8. `75300fc` `feat(shared): add embedding types and hybrid selection reasons`
9. `085b03e` `feat(backend): add embedding persistence and provider adapters`
10. `6e2eed1` `feat(backend): add embedding service, hybrid retrieval and reindex API`
11. `9efa874` `feat(frontend): add embedding settings and reindex controls`
12. `a5e6b68` `chore(website): refresh release snapshot to 1.58.1`
13. `ee82ec1` `test(backend): cover S137 review edge cases`
14. `dba2f5f` `fix(backend): validate S137 embedding target and dimension`
15. `c3f98f8` `docs(slice): add S137 review report`
16. `3d6cafa` `docs(slice): close S137 and update changelog`
17. `7a0230d` `docs(slice): update S137 commit log`
