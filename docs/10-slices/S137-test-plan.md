# S137 — Test plan (retrieval vectorial + búsqueda híbrida)

**Estado:** Aprobado
**Rama:** `feat/S137-vector-retrieval`
**Contrato:** `docs/10-slices/S137-progress.md` (Aprobado)
**Orquestación:** `docs/10-slices/S137-orchestration.md`

> Alcance de este documento: qué probar, con qué fixtures, qué debe fallar en
> rojo, qué umbrales exige la eval, qué comandos ejecutar y qué riesgos tiene.
> No es código. El `slice-test-author` lo implementa en Flash; el `slice-reviewer`
> lo contrasta en V4 Pro.

---

## 0. Decisiones confirmadas (RFC Aprobado, 2026-11-21)

1. **Opt-in y local-first.** Sin configuración, S137 = S136 (léxico). Embeddings
   se activan eligiendo proveedor + modelo; default Ollama local; remoto opt-in
   con aviso.
2. **`ProviderPort.embed?` opcional**, no un puerto separado. `EmbedRequest
   { texts: string[]; model: string }` · `EmbedResult { vectors: number[][];
   model: string; dimension: number }`. Vectores **L2-normalizados** en el
   adaptador o al persistir (coseno == producto escalar). Errores: reutilizar
   `ProviderError`/`ProviderTimeoutError`; añadir `EmbeddingUnavailableError`
   de dominio (nunca se propaga al usuario).
3. **Config global en `settings`**: `embeddings_provider`,
   `embeddings_provider_instance_id`, `embeddings_model_ollama`,
   `embeddings_model_openai_compatible`. Sin auto-detección de modelo.
4. **Migración `0022`** aditiva: tabla `memory_embeddings` con `memory_id`
   (PK/FK → `memories.id`, `onDelete: cascade`), `provider`, `model`,
   `dimension`, `vector` (BLOB `Float32Array` little-endian), `text_hash`,
   `created_at`, `updated_at`. Índice único sobre `memory_id` (1:1).
5. **Texto embebido = `title + "\n" + description`** (no `actor`).
   `text_hash` cubre **solo** el texto; `provider`/`model`/`dimension` se
   comparan aparte. Cambiar de modelo invalida el vector.
6. **Ciclo de vida**: eager best-effort (fire-and-forget con timeout corto) al
   crear/editar; lazy en retrieval; reindexado manual por lotes (16) con
   progreso y estado `indexed`/`missing`/`failed`. **El envío nunca espera ni
   falla por el embedding.**
7. **Híbrido (suma ponderada)** en `selectMemoriesForPrompt`: recibe
   `semanticScores: Map<memoryId, number>` opcional (coseno en [0,1]);
   `base = signal + priorityScore + recency + SEMANTIC_WEIGHT * semanticScore`
   (`SEMANTIC_WEIGHT` 2.0); elegibilidad por `semanticScore >= SEMANTIC_THRESHOLD`
   (0.55) → motivo `semantic` (sin señal léxica) o `hybrid` (con señal léxica).
   Orden y presupuesto de S136 intactos.
8. **Manifiesto**: `memories.embedding?: { enabled: boolean; provider?: string;
   model?: string; indexed: number; missing: number }`. `MemorySelectionReason`
   gana `"semantic" | "hybrid"`.
9. **Sin red en tests/eval.** Fake determinista de embeddings.
10. **Export/import sin vectores.** Son derivados; `EXPORT_SCHEMA_VERSION` no
    cambia.

---

## 1. Matriz por área

| Área | Qué prueba | Rojo |
| ---- | ---------- | ---- |
| **shared/types** | `embedding.ts` (`EmbedRequest`/`EmbedResult`), `MemorySelectionReason` `semantic`/`hybrid`, `memories.embedding` del manifiesto | T |
| **ProviderPort** | `embed?` opcional; adaptadores actuales compilan sin implementarlo | T |
| **adaptador Ollama** | `POST /api/embed` con `{model,input}`, parseo de `embeddings[][ ]`, L2, dimensión; errores | R |
| **adaptador OpenAI-compatible** | `POST /v1/embeddings` (`client.embeddings.create` mockeado), L2, dimensión; errores | R |
| **adaptador sin `embed`** | no se rompe; el servicio degrada a léxico | R |
| **migración 0022** | tabla + columnas + PK/FK cascade + índice único; snapshot; negativo "no 0023" | R |
| **repositorio embeddings** | BLOB `Float32Array` round-trip, `upsert`/`findByMemoryIds`/`deleteByMemoryId(s)`/`listMissingForConversation`/`countStatus` (triple provider/model/dimension, sin hash) | R/T |
| **servicio embedding** | L2, `text_hash`, invalidación provider/model/dimension, timeout/fallo sin excepción, best-effort | R/T |
| **retrieval híbrido** | `semanticScores` fusion, motivos, umbral/pesos, fallback S136 bit-igual, orden/presupuesto | I/R |
| **manifiesto** | `selection` admite `semantic`/`hybrid`; `memories.embedding` `enabled/indexed/missing` | T |
| **config/API** | get/set de config sin secretos; `reindex` por lotes con estado; DTO sin `apiKey` | R/T |
| **export/import** | export no incluye vectores; import crea memorias sin vector | R |
| **UI** | sección Embeddings (proveedor/modelo/estado/reindexar), aviso remoto, i18n en/es | R/T |
| **eval** | paráfrasis/sinonimia/falsa proximidad/fallback/presupuesto + baseline S136 | R |

`T` = type-red (`tsc`/`astro check`), `R` = runtime-red (`vitest`), `I` = import-red
(módulo nuevo que aún no existe).

---

## 2. Archivos y nombres de test exactos

**Nuevos (backend + shared)**

- `packages/shared/src/types/embedding.test.ts` — tipos/guardas si el RFC los expone
  (si `embedding.ts` solo exporta interfaces, este archivo es opcional; el rojo
  real es el typecheck de los consumidores).
- `packages/backend/src/infrastructure/adapters/secondary/providers/ollama-embedding.test.ts`
- `packages/backend/src/infrastructure/adapters/secondary/providers/openai-compatible-embedding.test.ts`
- `packages/backend/src/infrastructure/database/migrations/migration-0022.test.ts`
- `packages/backend/src/infrastructure/adapters/secondary/drizzle/repositories/drizzle-memory-embedding.repository.test.ts`
- `packages/backend/src/application/services/embedding/memory-embedding.service.test.ts`
- `packages/backend/src/application/services/memory-hybrid-retrieval.service.test.ts`
- `packages/backend/src/application/use-cases/memory/reindex-memory-embeddings.use-case.test.ts`
- `packages/backend/src/application/use-cases/memory/configure-embedding.use-case.test.ts`
- `packages/backend/src/application/use-cases/memory/get-embedding-config.use-case.test.ts`
- `packages/backend/src/infrastructure/adapters/primary/routes/settings-embedding.routes.test.ts`
- `packages/backend/evals/fixtures/memory-vector-retrieval.ts`
- `packages/backend/evals/memory-vector-retrieval.eval.test.ts`

**Nuevos (frontend)**

- `packages/frontend/src/components/provider/embedding-settings.test.tsx`
- `packages/frontend/src/lib/api/embeddings.test.ts` (o cubrir en
  `settings.test.ts` si el endpoint vive ahí)

**A modificar (tests existentes que ahora fallan en rojo)**

- `packages/backend/src/infrastructure/database/migrations/migration-0020.test.ts`
  — su negativo "no existe 0022" pasa a "no existe 0023".
- `packages/backend/src/infrastructure/adapters/secondary/providers/ollama.adapter.test.ts`
  y `openai-compatible.adapter.test.ts` — solo si el método `embed` comparte
  helpers (`fetchWithTimeout`); añadir `describe` de embedding, no reescribir.
- `packages/backend/src/application/services/conversation-context-loader.service.test.ts`
  — el loader gana una dependencia opcional de embeddings; añadir el caso
  "sin embeddings → `memorySelection`/`promptMemories` idéntico a S136".
- `packages/backend/src/application/services/context-compiler.service.test.ts` y
  `packages/backend/evals/context-assembly.eval.test.ts` — solo si el manifiesto
  cambia de forma (nuevo campo `memories.embedding` opcional no debería romper
  snapshots; verificar).
- `packages/backend/evals/memory-retrieval.eval.test.ts` — **no debe romperse**;
  es la regresión S136. Si rompe, el híbrido invadió el contrato base (bloqueo).

> Nota: `memory-retrieval.service.test.ts` **no se toca**: `selectMemoriesForPrompt`
> conserva su firma y su comportamiento léxico. La fusión semántica se prueba en
> `memory-hybrid-retrieval.service.test.ts` (ver §4, frontera A).

---

## 3. Fixtures y builders

**Fake de embeddings determinista (sin red) — contrato del fixture**

`packages/backend/evals/fixtures/` (y reutilizado desde `src/test-utils/` para
unit). Una única fuente, no dos copias. Esquema:

- Vocabulario fijo de sinónimos → **token vector** (semilla fija, p. ej. un hash
  simple o constantes): `dragón≈wyrm`, `fuego≈llamas`, `bosque≈arboleda`,
  `rey≈monarca`, `promesa≈juramento`, `amanecer≈alba`, `herida≈cicatriz`.
- Token **no mapeado** → vector pseudoaleatorio determinista casi ortogonal a
  todos los demás (hash del token normalizado).
- `embed(texts: string[]): EmbedResult` — normaliza cada texto (minúsculas, NFD
  sin acentos, tokens 3+), **suma los vectores de sus tokens** y **L2-normaliza**
  el resultado. Devolver `dimension` fija (p. ej. 8) y `model` = el recibido.
- `vector(texto)` helper para que los tests conozcan el vector esperado de un
  texto sin pasar por `embed` (evita tautología en la eval: la verdad son las
  etiquetas `relevantIds`, no el coseno calculado por el código bajo prueba).

**Fixtures de unit (inline, estilo `mkMemory` de S136)**

| Fixture | Caso |
| ------- | ---- |
| `mkMemory(id, {actor,title,description,...})` | builder base reutilizado de `memory-retrieval.ts` |
| memoria `(title="El dragón escupe fuego")` + pendiente `"El wyrm exhala llamas"` | paráfrasis pura sin keywords compartidos → léxico la omite, vector la entra |
| memoria con un keyword común + significado cercano (`bosque`/`arboleda`) | motivo `hybrid` |
| texto semánticamente lejano con tokens superficiales parecidos (p. ej. `"fuego"` vs `"fuego artificial"` sin token mapeado) | falsa proximidad → no entra por vector |
| proveedor ausente / `embed` sin definir / timeout | selección idéntica a S136 |
| memoria **editada** (cambia `description`) | `text_hash` desactualizado → sin señal semántica / re-embebe |
| cambio de `model`/`provider`/`dimension` en config | vector invalidado aunque el texto no cambie |
| vector de **dimensión distinta** a la config activa | descartado (no se usa el coseno) |
| conversación **sin memorias** | `semanticScores` vacío, `selection: []`, `tokens: 0` |
| ventana desconocida (`contextWindow: null`) | presupuesto 512; el híbrido no lo altera |
| más relevantes que presupuesto | recorte `budget` sin romper orden |

**Fixtures de migración (raw SQL, estilo 0021)**

- `PRAGMA table_info(memory_embeddings)` → columnas `memory_id, provider, model,
  dimension, vector, text_hash, created_at, updated_at`.
- `PRAGMA foreign_key_list(memory_embeddings)` → FK `memory_id → memories.id`,
  `on_delete: "CASCADE"`.
- `PRAGMA index_list` → índice único de una columna sobre `memory_id`.
- INSERT de memoria + embedding, `DELETE FROM memories WHERE id=?` → fila de
  `memory_embeddings` desaparece (cascade).

**Fixtures de repositorio (round-trip BLOB)**

- `Float32Array` con valores no triviales (p. ej. `[0.5, -0.25, 0.75]`) →
  `upsert` → `findByMemoryIds` devuelve el **mismo** array con tolerancia
  `1e-6` por elemento (endianness/round-trip).
- `upsert` sobre la misma `memory_id` → reemplaza (no inserta duplicado).
- `listMissingForConversation("conv-1", {provider:"ollama", model:"nomic-embed-text",
  dimension:8})` con 3 memorias — 1 con fila coincidente, 1 sin fila, 1 con fila
  de `model`/`dimension` distintos — → devuelve exactamente las 2 no válidas
  (sin fila + fila con triple distinto), **no** la coincidente (LEFT JOIN).
- `listMissingForConversation` con hash desactualizado pero fila presente →
  **no** la devuelve (el hash se compara fuera del repositorio, en el caso de
  uso vía `findByMemoryIds`).
- `countStatus("conv-1", {provider, model, dimension})` → `{ indexed, missing }`
  coherente con las filas: `indexed` = filas con triple coincidente, `missing`
  = memorias sin fila o con triple distinto (sin concepto de `failed`).

**Fixtures de eval (`evals/fixtures/memory-vector-retrieval.ts`)**

- Los **cinco** fixtures de `memory-retrieval.ts` reutilizados como regresión
  (léxico puro, embeddings desactivados).
- 3–4 escenarios nuevos de paráfrasis/sinonimia (40–60 memorias, etiquetas
  `relevantIds`/`irrelevantIds` **a mano**), el fake de embeddings y un
  `pendingMessage` por escenario.

---

## 4. Red: runtime vs type vs import

- **Type-red:** todo lo que referencia `MemorySelectionReason` con
  `"semantic" | "hybrid"`, `ContextManifestDTO.memories.embedding`, `EmbedRequest`/
  `EmbedResult`, `ProviderPort.embed?`, el `EmbeddingRepository` (port) y sus
  DTOs de config/reindex, y los props de la UI nueva. El test-author **no** los
  enmascara con `as any`: el rojo correcto es el de `tsc`/`astro check`.
- **Runtime-red:** migración (PRAGMA + cascade), round-trip BLOB, normalización
  L2 de los adaptadores, invalidación por hash/modelo/dimensión, fallback
  léxico ante ausencia/timeout, reindex por lotes.
- **Import-red:** `memory-embedding.service.test.ts` y
  `memory-hybrid-retrieval.service.test.ts` importan módulos que aún no existen.
  Contrato de símbolo fijado (ver §4 fronteras A y B). El implementador crea el
  módulo con ese símbolo exacto.

**Fronteras que el test-author NO debe adivinar (reportar si el implementador
las resuelve distinto):**

- **A. `selectMemoriesForPrompt` es síncrono** pero el embedding lazy es
  asíncrono. El plan fija: la fusión se prueba en
  `memory-hybrid-retrieval.service.ts` (un servicio **orquestador** que resuelve
  `semanticScores` de forma asíncrona y llama al selector síncrono). El selector
  de S136 solo gana el campo opcional `semanticScores`; no se convierte en
  asíncrono. Si el implementador opta por otra frontera, es un cambio de
  contrato y hay que revisarlo.
- **B. `EmbeddingRepository`** (port en `domain/ports/embedding.repository.ts`)
  expone `upsert`, `findByMemoryIds`, `deleteByMemoryId`, `deleteByMemoryIds`,
  `listMissingForConversation(conversationId, { provider, model, dimension })` y
  `countStatus(conversationId, { provider, model, dimension })`. Ninguno compara
  `text_hash`: el repositorio solo detecta filas **ausentes** o con
  `provider`/`model`/`dimension` distintos a la configuración activa (LEFT JOIN
  sobre `memories`). La obsolescencia por `text_hash` se resuelve **en el caso
  de uso**: carga las filas presentes con `findByMemoryIds`, recalcula el hash de
  cada memoria y re-embebe solo las que no coinciden. `countStatus` devuelve
  `{ indexed, missing }` (no `failed`: el fallo es transitorio del reindexado,
  no un estado persistible). El DTO de fila es
  `{ memoryId, provider, model, dimension, vector: Float32Array, textHash,
  createdAt, updatedAt }`.
- **C. API de config/reindex.** GET `/api/settings/embeddings` →
  `{ provider, providerInstanceId, models: {ollama?, openaiCompatible?},
  hasApiKey, enabled, status: {indexed, missing} }` (sin clave). PUT
  `/api/settings/embeddings` persiste y **no** devuelve la clave. POST
  `/api/settings/embeddings/reindex` → `{ indexed, missing, failed }`. Si el
  implementador usa otra ruta/forma, ajustar antes de congelar los tests.

---

## 5. Casos límite (aserciones exactas)

| Caso | Aserción |
| ---- | -------- |
| L2 del adaptador | cada `vectors[i]` cumple `sum(v²) ≈ 1` (tol `1e-6`); `dimension` = longitud devuelta por el proveedor |
| Ollama `/api/embed` | `fetch` llamado **una vez** con URL `…/api/embed`, método `POST`, body `{ model, input: texts }`; parsea `embeddings: number[][]` |
| OpenAI `/v1/embeddings` | `client.embeddings.create` llamado con `{ model, input: texts }`; mapea `data[].embedding` a `vectors` |
| adaptador sin `embed` | `"embed" in adapter === false`; el servicio llama `supportsEmbeddings?()` o `embed?` con fallback léxico sin lanzar |
| timeout/fallo | `ProviderTimeoutError`/`ProviderError`/`EmbeddingUnavailableError` → servicio devuelve `null` (sin vector) y **no propaga**; el guardado de la memoria sigue |
| `text_hash` | hash estable para `title + "\n" + description`; distinto si cambia `title` o `description`; **igual** si cambia solo `actor` (el vector no cubre actor) |
| invalidación modelo | mismo texto, `model` distinto → vector no válido; `listMissingForConversation`/`countStatus` lo marcan como `missing` (comparación por triple, sin hash) |
| dimensión distinta | `dimension !== config.dimension` → no se usa el vector; sin coseno |
| paráfrasis pura | `semanticScore >= 0.55`, sin `actorInPending`/`mainActor`/keyword → `included:true, reason:"semantic"` |
| sinonimia parcial | señal léxica + `semanticScore >= 0.55` → `reason:"hybrid"`; score = léxico + `2.0 * semanticScore` (redondeado igual que S136) |
| falsa proximidad | `semanticScore < 0.55` y sin señal léxica → `included:false, reason:"not-relevant"` (o `decay` si decayó) |
| fallback S136 | con embeddings desactivados/proveedor caído, `selection` y `promptMemories` **bit-iguales** a la ejecución sin `semanticScores` (comparar `toEqual` completo) |
| orden | score desc → prioridad desc → `updatedAt` desc → `id` asc; determinista en 2 ejecuciones |
| presupuesto | `tokens <= budget`; `reason:"budget"` para las recortadas; sin cambiar `resolveMemoryBudget` |
| conversación sin memorias | `selection: []`, `memories: []`, `tokens: 0`, `manifest.memories.embedding.indexed/missing` coherentes |
| ventana desconocida | presupuesto de memoria = 512 (S136) |
| reindex | procesa en lotes de 16; resultado `{indexed, missing, failed}`; `failed` cuenta fallos del proveedor sin abortar el resto; las memorias con `text_hash` desactualizado se detectan **en el caso de uso** (via `findByMemoryIds`) y se re-embeben |
| manifiesto | `memories.embedding` presente solo cuando hay config; `indexed + missing = total` (cuando aplica); `missing` sale de `countStatus` (sin hash) |
| export/import | `toMemoryDTO` no incluye `vector`/`embedding`; import crea `Memory` sin fila en `memory_embeddings` |

---

## 6. Plan de eval

- **Fixtures:** `evals/fixtures/memory-vector-retrieval.ts` con escenarios de
  paráfrasis/sinonimia donde el léxico falla por diseño + los 5 de S136 como
  regresión. Proveedor = fake determinista sin red.
- **Escenarios nuevos:**
  1. Paráfrasis pura (sin keywords compartidos) → léxico omite, vector recupera.
  2. Sinonimia parcial → motivo `hybrid`.
  3. Falsa proximidad → no entra por vector.
  4. Proveedor ausente/falla → selección idéntica a S136.
  5. Más relevantes que presupuesto → recorta sin romper orden.
- **Métricas:** recall de `relevantIds` etiquetados a mano, tasa de irrelevantes
  incluidas, tokens de sección, presupuesto respetado, determinismo (2
  ejecuciones), latencia del pipeline híbrido (informativa).
- **Baseline:** S136 léxico sobre los mismos fixtures: recall léxico ≈ 0 en los
  de paráfrasis; el híbrido lo levanta sin degradar la precisión de los léxicos.
- **Umbrales (RFC):** recall ≥ 0,8 en paráfrasis · irrelevantes ≤ 0,2 en todos ·
  presupuesto nunca superado · orden estable · fallback léxico **bit-igual** a
  S136. Si no se cumple, Stage 3C calibra `SEMANTIC_WEIGHT`/`SEMANTIC_THRESHOLD`
  **antes** de cerrar (no se relaja la eval).
- **Anti-tautología:** el recall se mide contra `relevantIds`/`irrelevantIds`
  manuales, nunca contra `included` ni contra el coseno calculado por el código
  bajo prueba. El fake `vector()` helper no se usa para decidir qué es relevante.

---

## 7. Comandos

```sh
# Unit backend dirigidos (por área)
pnpm --filter @workspace/backend exec vitest run src/infrastructure/adapters/secondary/providers/ollama-embedding.test.ts
pnpm --filter @workspace/backend exec vitest run src/infrastructure/adapters/secondary/providers/openai-compatible-embedding.test.ts
pnpm --filter @workspace/backend exec vitest run src/infrastructure/database/migrations/migration-0022.test.ts src/infrastructure/database/migrations/migration-0020.test.ts
pnpm --filter @workspace/backend exec vitest run src/infrastructure/adapters/secondary/drizzle/repositories/drizzle-memory-embedding.repository.test.ts
pnpm --filter @workspace/backend exec vitest run src/application/services/embedding/memory-embedding.service.test.ts
pnpm --filter @workspace/backend exec vitest run src/application/services/memory-hybrid-retrieval.service.test.ts
pnpm --filter @workspace/backend exec vitest run src/application/use-cases/memory/reindex-memory-embeddings.use-case.test.ts src/application/use-cases/memory/configure-embedding.use-case.test.ts src/application/use-cases/memory/get-embedding-config.use-case.test.ts
pnpm --filter @workspace/backend exec vitest run src/infrastructure/adapters/primary/routes/settings-embedding.routes.test.ts
pnpm --filter @workspace/backend exec vitest run src/application/services/conversation-context-loader.service.test.ts src/application/services/context-compiler.service.test.ts

# Frontend
pnpm --filter @workspace/frontend exec vitest run src/components/provider/embedding-settings.test.tsx
pnpm --filter @workspace/frontend exec vitest run src/lib/api/embeddings.test.ts

# Eval (fixtures + umbrales + regresión S136)
pnpm --filter @workspace/backend eval
pnpm eval

# Gates
pnpm --filter @workspace/backend test
pnpm --filter @workspace/frontend exec vitest run
pnpm check
pnpm build
pnpm audit --prod
```

---

## 8. Riesgos de test

- **Red en tests:** prohibida. Todo embedding usa el fake; cualquier `fetch`/
  `client.embeddings.create` real en unit/eval es un fallo. Mockear `globalThis.fetch`
  (Ollama) y `openai` (`vi.mock`, como en `openai-compatible.adapter.test.ts`).
- **Orden no determinista:** `findByConversationId` ordena por `priority`; los
  tests de selección dependen del orden estable del scorer, no del orden del
  repositorio. Fijar `updatedAt` y `priority`; no dejar fechas al azar.
- **BLOB/endianness:** serializar `Float32Array` con `DataView`/`Buffer`
  little-endian explícito; asertar round-trip con tolerancia `1e-6` por
  elemento, no igualdad bit a bit cruda. Una dimensión/byteorder distinta en el
  fixture daría falsos negativos.
- **Latencia/timeout:** no usar timers reales; `vi.useFakeTimers()` o inyectar
  `timeoutMs` pequeño y mockear el aborto. El "fire-and-forget" best-effort debe
  probarse como **no bloqueante** (el guardado resuelve aunque el embed falle).
- **Dependencia de proveedor real:** el fake es determinista; no asumir que el
  modelo real (`nomic-embed-text`) devuelve vectores compatibles. Los umbrales
  de la eval solo son válidos contra el fake.
- **Tautología de la eval:** no medir recall contra la salida del scoring; usar
  las etiquetas manuales. El `vector()` helper solo verifica el fake, no decide
  relevancia.
- **Regresión S136:** `memory-retrieval.eval.test.ts` y
  `memory-retrieval.service.test.ts` deben quedar verdes **sin tocar**. Si el
  híbrido los rompe, es una invasión del contrato base (bloqueo, no ajuste de
  umbral).
- **Snapshots/manifiesto:** `ContextManifestDTO` gana un campo opcional; si
  `context-assembly.eval.test.ts` o `context-compiler.service.test.ts` comparan
  el manifiesto completo, actualizar **snapshots** (no aserciones de
  comportamiento) y verificar que `memories.embedding` solo aparece con config.
- **Migración 0020:** su negativo "no existe 0022" pasa a "no existe 0023"; no
  borrarlo. El snapshot `0022_snapshot.json` y el SQL `0022_*.sql` deben existir
  (mismo patrón que 0019/0020/0021).
- **Estado compartido en migración/repo:** `mkdtempSync` por archivo; no
  reutilizar `db` entre `describe` (patrón de `drizzle-memory.repository.test.ts`).

---

## Entregables

- **Ruta:** `docs/10-slices/S137-test-plan.md`
- **Resumen de matriz:** 14 áreas; 13 archivos nuevos de backend/shared, 2
  nuevos de frontend, 7 existentes a modificar; clasificados en type-red /
  runtime-red / import-red.
- **Bloqueos / ambigüedades reportadas (sin cambiar alcance):** tres fronteras
  de implementación que el test-author no debe adivinar — (A) la fusión
  semántica vive en un orquestador asíncrono nuevo porque
  `selectMemoriesForPrompt` es síncrono; (B) la forma exacta del
  `EmbeddingRepository` port y su DTO de fila; (C) la ruta/forma de la API de
  config y reindex. Si el implementador las resuelve distinto, son cambios de
  contrato a confirmar antes de congelar los tests. Ninguna cambia el alcance
  del RFC aprobado.
