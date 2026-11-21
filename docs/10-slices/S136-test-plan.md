# S136 — Test plan (memoria estructurada + retrieval léxico)

**Estado:** Aprobado
**Rama:** `feat/S136-structured-memory`
**Contrato:** `docs/10-slices/S136-progress.md` (Aprobado)

> Alcance de este documento: qué probar, con qué fixtures, qué debe fallar en
> rojo, qué umbrales exige la eval y qué comandos ejecutar. No es código.

---

## 0. Decisiones confirmadas (2026-11-21)

1. **Tokenización.** Minúsculas, normalización Unicode sin acentos (NFD + strip
   de diacríticos), tokens de letras/dígitos de **3+ caracteres**, stopwords
   ES/EN. `actorInPending` (+4) es por **frase normalizada exacta** (no
   substring).
2. **Regla de prioridad.** Usa la **prioridad efectiva** tras decaimiento. Una
   memoria decaída por debajo de 8 no entra por `priority`, pero sí puede entrar
   por `thread` o keyword.
3. **`type` en propuestas.** Se persiste en `memory_change_proposals` con
   columna propia en la migración 0021 y default `fact`.
4. **Recencia.** `max(0, 1 - turnos/50)`. Los tests asertan **monotonía y
   límites**, no puntajes exactos.
5. **`memories.selection`.** Entradas con `{ id, included, score, reason }`.
   Tests por semántica y motivos (`actor`, `keyword`, `priority`, `thread`,
   `budget`, `decay`, `not-relevant`).
6. **Servicio de retrieval.** `application/services/memory-retrieval.service.ts`
   con `selectMemoriesForPrompt(...)`. El loader resuelve los actores
   principales (personaje + personaje del usuario) **antes** del retrieval.
7. **Normalización de consolidación.** La comparación `(actor, title)` usa la
   misma normalización que los keywords (minúsculas, NFD sin acentos, espacios
   colapsados y trim), pero **guarda el texto original** del actor y del título
   para mostrarlo.

---

## 1. Matriz por área

| Área | Qué prueba | Rojo |
| ---- | ---------- | ---- |
| **shared/domain** | `MemoryType`, `MemoryDTO.type`, `CreateMemoryInput.type`, `UpdateMemoryInput.type`, entidad valida/default | T |
| **migración** | columna `type` default `fact` en `memories` y `memory_change_proposals`, índice único `(conversation_id, actor, title)`, datos antiguos | R |
| **repositorio** | persiste/lee `type`, duplicado actor+título rechazado | R/T |
| **retrieval** | scoring, orden estable, regla de entrada, presupuesto | I |
| **manifiesto** | `memories.selection` incluidas/omitidas + motivo + score | T |
| **consolidación** | CREATE con `(actor,title)` normalizado existente → UPDATE; texto original preservado; resultado lo refleja | R |
| **prompt/tool** | `[type]` en línea; schema y bloque aceptan `type`; normalización a `fact`; `type` persiste en la propuesta | R/T |
| **export/import** | round-trip de `type`; export antiguo sin `type` → `fact` | R/T |
| **UI** | selector/badge/filtro de tipo; preview de selección | R/T |
| **eval** | 5 escenarios + umbrales del RFC | R |

`T` = type-red (falla `tsc`/`astro check`), `R` = runtime-red, `I` = red por módulo nuevo (import del servicio).

---

## 2. Archivos y nombres de test exactos

**Nuevos**

- `packages/backend/src/domain/entities/memory.entity.test.ts`
- `packages/backend/src/infrastructure/database/migrations/migration-0021.test.ts`
- `packages/backend/src/infrastructure/adapters/secondary/drizzle/repositories/drizzle-memory.repository.test.ts`
- `packages/backend/src/application/services/memory-retrieval.service.test.ts`
- `packages/backend/evals/fixtures/memory-retrieval.ts`
- `packages/backend/evals/memory-retrieval.eval.test.ts`

**A modificar (tests existentes que ahora fallan en rojo)**

- `packages/backend/src/application/use-cases/memory/create-memory.use-case.test.ts`
- `packages/backend/src/application/use-cases/memory/update-memory.use-case.test.ts`
- `packages/backend/src/application/use-cases/memory/list-memories.use-case.test.ts`
- `packages/backend/src/application/use-cases/memory/list-proposals.use-case.test.ts`
- `packages/backend/src/application/use-cases/memory/apply-memory-changes.use-case.test.ts`
- `packages/backend/src/application/use-cases/memory/apply-all-memory-changes.use-case.test.ts`
- `packages/backend/src/application/services/conversation-context-loader.service.test.ts`
- `packages/backend/src/application/services/context-compiler.service.test.ts`
- `packages/backend/src/infrastructure/adapters/secondary/prompt-context-builder/prompt-context-builder.impl.test.ts`
- `packages/backend/src/lib/propose-memory-changes.tool.test.ts`
- `packages/backend/src/lib/memory-proposal-extractor.test.ts`
- `packages/backend/src/lib/normalize-proposals.test.ts`
- `packages/backend/src/application/use-cases/character/import-character.use-case.test.ts`
- `packages/backend/src/infrastructure/database/migrations/migration-0020.test.ts` (su aserción "no existe 0021" pasa a "no existe 0022")
- `packages/backend/evals/context-assembly.eval.test.ts` (snapshots de memoria cambian por `[type]` y por retrieval)
- `packages/frontend/src/components/conversation/memory-list.test.tsx`
- `packages/frontend/src/components/conversation/proposal-list.test.tsx`
- `packages/frontend/src/components/conversation/context-manifest-view.test.tsx`
- `packages/frontend/src/lib/stores/memory.store.test.ts`
- `packages/frontend/src/lib/group-memories.test.ts`
- `packages/frontend/src/lib/format-memory.test.ts`

---

## 3. Fixtures y caso que cubre cada uno

**Fixtures de unit (inline en cada test, estilo `mkMemory` de `context-assembly.eval.test.ts`)**

| Fixture | Caso |
| ------- | ---- |
| `mkMemory(id, { type?, priority, updatedAt, actor, title, description })` | builder base; sin `type` → `fact` |
| memoria `thread` con actor fuera del pendiente | entra por regla `thread` |
| memoria prioridad 10 decaída (>50 turnos, efectiva < 8) | no entra por `priority`; sí por `thread` o keyword |
| título con acentos/stopword/token de 2 chars vs pendiente normalizado | `keyword` respeta normalización + stopwords + longitud mínima |
| dos memorias score idéntico, `updatedAt` distinto | orden estable `updatedAt desc` |
| dos memorias score/updatedAt idénticos | desempate final por `id asc` |
| memoria keyword (objeto/lugar solo en su título) | `keyword` selecciona |
| conjunto mayor que el presupuesto mínimo (256) | recorte `budget` |
| conversación `contextWindow: null` | presupuesto por defecto 512 |

**Fixtures de consolidación (use-case `apply-memory-changes` / `apply-all-memory-changes`)**

| Fixture | Caso |
| ------- | ---- |
| memoria existente `(actor="Lyra", title="Misión")` + CREATE `(actor="Lyra", title="mision")` | consolida como UPDATE (misma clave normalizada); conserva el título original "Misión" |
| memorias `(actor="Lyra", title="Misión")` y `(actor="Kael", title="Misión")` + CREATE `(actor="Kael", title="Misión")` | no consolida con la de Lyra (actor distinto); consolida solo con la de Kael |

**Fixtures de migración (raw SQL)**

- INSERT omitiendo `type` en `memories` (mismo `INSERT` pre-0021) → `SELECT type` = `fact`.
- INSERT omitiendo `type` en `memory_change_proposals` → `SELECT type` = `fact`.
- INSERT dos actores con título "Misión" → OK; mismo actor+título → UNIQUE.

**Fixtures de eval (`evals/fixtures/memory-retrieval.ts`)**

- Tres conversaciones de 40–60 memorias: mezcla de `fact`/`episode`/`thread`,
  4–6 actores, prioridades 1–10, `updatedAt` escalonados, un `pendingMessage`
  por escenario y **etiquetas manuales** `relevantIds`/`irrelevantIds`.

---

## 4. Red: runtime vs type

- **Runtime-red (falla `vitest run`, compila):** migración (PRAGMA + backfill),
  consolidación CREATE→UPDATE, orden estable del retrieval si el servicio se
  importa con `as never`, recorte de presupuesto.
- **Type-red (falla `tsc`/`astro check`):** todo lo que referencia
  `MemoryDTO.type`, `MemoryType`, `CreateMemoryInput.type`, `UpdateMemoryInput.type`,
  `MemoryProps.type`, `memories.selection`, `MemoryChangeProposalDTO.type`, y los
  props de componentes UI. El test-author **no** los enmascara con `as any`;
  el rojo correcto es el de typecheck.
- **Import-red:** `memory-retrieval.service.test.ts` importa un módulo que aún no
  existe. Es el rojo esperado del contrato nuevo; el implementador crea el
  módulo con el símbolo `selectMemoriesForPrompt` exacto.

---

## 5. Casos límite (aserciones exactas)

| Caso | Aserción |
| ---- | -------- |
| ventana desconocida (`contextWindow:null`) | presupuesto de memoria = 512 |
| presupuesto mínimo | `effectiveWindow*0.12 < 256` → clamp a 256; sección ≤ 256 tokens |
| presupuesto máximo | `effectiveWindow*0.12 > 2048` → clamp a 2048 |
| empate de score | orden `score desc → priority desc → updatedAt desc → id asc`; determinista en 2 ejecuciones |
| memoria decaída | excluida como `decay` si la efectiva cae bajo el umbral; si es elegible y la efectiva < 8, no entra por `priority` pero sí por `thread`/keyword |
| actor principal | `actorInPending (+4)` por frase normalizada exacta / `mainActor (+2)` ganan a prioridad alta no relacionada |
| keyword | tokens normalizados únicos (minúsculas, sin acentos, 3+ chars, sin stopwords), `+1` cada uno, tope `+5`; motivo `keyword` |
| thread | entra sin señal léxica; peso `1.5` |
| prioridad alta | prioridad **efectiva** ≥ 8 entra como `priority` |
| recencia | `max(0, 1 - turnos/50)`: 0 turnos → 1, ≥50 turnos → 0, monótona decreciente |
| duplicado exacto | CREATE con `(actor,title)` cuya clave normalizada (minúsculas + NFD sin acentos + espacios colapsados + trim) coincide → UPDATE, `created:0 updated:1`; el título/actor guardados conservan el texto original |
| duplicado con mayúsculas/acentos | "Misión" vs "mision" (mismo actor) → consolida; actores distintos con el mismo título → **no** consolida |
| migración datos antiguos | fila sin `type` → `fact` (en `memories` y `memory_change_proposals`); índice nuevo permite títulos repetidos entre actores y rechaza dentro del mismo actor |

---

## 6. Plan de eval

- **Fixtures:** `evals/fixtures/memory-retrieval.ts` (3 conversaciones, 40–60
  memorias c/u, etiquetas manuales de relevancia).
- **Escenarios:**
  1. Actor del mensaje con memorias relevantes + ruido de otros actores.
  2. Lugar/objeto mencionado que solo está en una memoria (keyword).
  3. Más relevantes que presupuesto.
  4. Memorias decaídas que no deben entrar (sin señal de `thread`/keyword/actor
     principal).
  5. Empate de score → orden estable.
- **Métricas:** recall de relevantes, tasa de irrelevantes incluidas, tokens de
  la sección de memoria, presupuesto respetado, determinismo (dos ejecuciones),
  latencia de scoring (informativa).
- **Baseline:** `filterMemoriesForPrompt` actual (todas las elegibles) sobre los
  mismos fixtures; registrar cuántas entran y cuántos tokens ocupan.
- **Umbrales (RFC):** recall ≥ 0,8 · irrelevantes ≤ 0,2 · presupuesto nunca
  superado · mismo orden en dos ejecuciones consecutivas. Si no se cumple, se
  ajustan pesos/regla de entrada **antes** de cerrar (Stage 3C).

---

## 7. Comandos

```sh
# Unit backend dirigidos (por área)
pnpm --filter @workspace/backend exec vitest run src/domain/entities/memory.entity.test.ts
pnpm --filter @workspace/backend exec vitest run src/infrastructure/database/migrations/migration-0021.test.ts
pnpm --filter @workspace/backend exec vitest run src/infrastructure/adapters/secondary/drizzle/repositories/drizzle-memory.repository.test.ts
pnpm --filter @workspace/backend exec vitest run src/application/services/memory-retrieval.service.test.ts
pnpm --filter @workspace/backend exec vitest run src/application/use-cases/memory
pnpm --filter @workspace/backend exec vitest run src/application/services/conversation-context-loader.service.test.ts src/application/services/context-compiler.service.test.ts
pnpm --filter @workspace/backend exec vitest run src/lib/propose-memory-changes.tool.test.ts src/lib/memory-proposal-extractor.test.ts src/lib/normalize-proposals.test.ts
pnpm --filter @workspace/backend exec vitest run src/infrastructure/adapters/secondary/prompt-context-builder/prompt-context-builder.impl.test.ts
pnpm --filter @workspace/backend exec vitest run src/application/use-cases/character/import-character.use-case.test.ts

# Frontend
pnpm --filter @workspace/frontend exec vitest run src/components/conversation/memory-list.test.tsx src/components/conversation/proposal-list.test.tsx src/components/conversation/context-manifest-view.test.tsx
pnpm --filter @workspace/frontend exec vitest run src/lib/stores/memory.store.test.ts src/lib/group-memories.test.ts src/lib/format-memory.test.ts

# Eval (fixtures + umbrales)
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

- **Tautología en la eval:** no medir recall contra la propia salida del scoring
  (baseline incluido) — usar las **etiquetas manuales** de `relevantIds` como
  verdad, nunca `included` del resultado.
- **Dependencia de orden / estado compartido:** la migración usa `mkdtempSync`
  por archivo (como 0019/0020); no reutilizar el mismo `db` entre `describe`.
- **Reloj/fechas:** `recency` y `updatedAt` dependen de `new Date()`. Fijar con
  `vi.useFakeTimers()` o fechas constantes en fixtures; no dejar `updatedAt`
  al azar o el empate de score será inestable.
- **Módulo nuevo (retrieval):** el import rojo es el contrato; no "arreglarlo"
  escribiendo la implementación en el test. El símbolo `selectMemoriesForPrompt`
  y su módulo están fijados en §0.6.
- **Snapshots de eval existentes:** `context-assembly.eval.test.ts` y los tests
  de `prompt-context-builder` contienen el texto de la línea de memoria; al
  añadir `[type]` y cambiar la selección, se actualizan **los snapshots**, no
  las aserciones de comportamiento.
- **Regresión `migration-0020`:** su negativo "no existe 0021" debe moverse a
  "no existe 0022", no borrarse.
- **Presupuesto y `estimateTextTokens`:** el recorte mide la sección renderizada
  (cabecera + hint + líneas). El test debe medir con el mismo estimador, no con
  `length`/caracteres, o el umbral "nunca superado" dará falsos positivos.

---

## Entregables

- Ruta: `docs/10-slices/S136-test-plan.md`
- Resumen de matriz: 10 áreas; 6 archivos nuevos, 21 existentes a modificar;
  clasificados en type-red / runtime-red / import-red.
- Sin bloqueos: las decisiones de §0 quedaron confirmadas el 2026-11-21
  (tokenización, prioridad efectiva, `type` en propuestas, recencia lineal,
  forma de `selection`, servicio de retrieval, orden del loader y
  normalización de consolidación).
