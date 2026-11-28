# S138 — Test plan (políticas de contexto fast/balanced/deep)

**Estado:** Aprobado
**Rama:** `feat/S138-context-policies` · **Base:** `master`
**Contrato de referencia:** `S138-progress.md` (RFC aprobado + clarificaciones) · `S138-orchestration.md`

> Contratos fijados en el RFC: ventana desconocida por política, firma de
> `resolveContextBudget`, precedencia del umbral de compactación y alcance del
> baseline de paridad. Quedan recogidos como aserciones abajo (no hay ambigüedad abierta).

## Resumen de la matriz

| # | Área | Archivo(s) de test (exactos) | Tipo |
|---|------|------------------------------|------|
| 1 | Shared `context-policy` | `packages/backend/src/application/services/context-policy.test.ts` | runtime (unit, puro) |
| 2 | Migración 0023 | `packages/backend/src/infrastructure/database/migrations/migration-0023.test.ts` | runtime (sqlite real) |
| 3 | Compactación | extender `context-compaction.service.test.ts` | runtime |
| 4 | Memoria | extender `memory-retrieval.service.test.ts` | runtime |
| 5 | Resumen | extender `generate-summary.use-case.test.ts` | runtime |
| 6 | Manifiesto/API | extender `context-compiler.service.test.ts` + `conversation-settings.routes.test.ts` + `update-conversation-settings.use-case.test.ts` | runtime |
| 7 | Entidad/repo/export/branch/plantilla | `drizzle-conversation.repository.test.ts`, `export-character.use-case.test.ts`, `import-character.use-case.test.ts`, `branch-conversation.use-case.test.ts`, `apply-settings-template.use-case.test.ts` (extender) | runtime |
| 8 | UI | `packages/frontend/src/components/conversation/context-policy-card.test.tsx` + `context-manifest-view.test.tsx` (extender) | runtime |
| 9 | Eval | `packages/backend/evals/context-policy.eval.test.ts` + `evals/fixtures/context-policy.ts` | eval |
| — | Import-red / typecheck | compilación dirigida (ver Comandos) | type/import-red |

**Nota de ubicación del test shared (1):** `@workspace/shared` no tiene runner (solo
`typecheck`/`lint`). El test puro de `context-policy.ts` vive en **backend** (que ya
resuelve `@workspace/shared/lib/*`) para que corra con `pnpm --filter @workspace/backend test`.
No se añade vitest a `shared` en S138.

## Fixtures/builders a reutilizar (no duplicar)

- `packages/backend/evals/fixtures/memory-retrieval.ts` → `memoryRetrievalFixtures` (5 escenarios S136) y sus `mkConversation`/`mkMemory`/`noiseMemories`.
- `packages/backend/evals/fixtures/memory-vector-retrieval.ts` → `memoryVectorRetrievalFixtures` (regresión S137 + paráfrasis).
- `packages/backend/src/domain/entities/*.entity.ts` → factories `Conversation.create`, `Memory.reconstruct`, `Message.create`, `Summary.reconstruct`, `Character/CharacterVersion/PlayerCharacter.create`.
- `packages/backend/src/test-utils/message-history.ts` → `buildMessageHistoryRepository`.
- `packages/backend/src/test-utils/deterministic-embedding.ts` → `createDeterministicEmbeddingProvider` (fake sin red) para el camino híbrido.
- `context-assembly.eval.test.ts` / `get-prompt-context.parity.test.ts` → patrón de repos falsos (`buildRepos`) y de paridad preview/send.
- Nuevo (solo en S138): `evals/fixtures/context-policy.ts` que compone los factories anteriores y **no** reimplementa `resolveMemoryBudget`/`resolveContextBudget`.

## Casos que prueban el contrato (por área)

### 1. Shared `context-policy.ts`
- `ContextPolicyId` = `"fast" | "balanced" | "deep"`; `normalizeContextPolicy(x)`:
  válido → él mismo; `"FAST"`/`"Deep"`/desconocido/`undefined`/`null` → `"balanced"`.
- Tabla de ratios/clamps **exactos** (balanced/fast/deep) del RFC §1, incluidos
  `compaction.threshold/target` (80/60, 70/50, 90/70).
- `resolveContextBudget({ policy, contextWindow, workingWindow, maxTokens })` es **puro y determinista** (aritmética entera, dos llamadas → deep equal). Internamente llama a `resolveEffectiveWindow` y devuelve `window`/`outputReserve` en el plan; **los tests no pasan un `window` ya resuelto** — pasan `contextWindow`/`workingWindow`/`maxTokens` crudos y asertan que `window`/`outputReserve` del plan coinciden con `resolveEffectiveWindow` (incluido el caso `net:true` con `outputReserve:0`).
- **Paridad balanced = constantes actuales:** para `contextWindow` 4000/8000/32000 (sin `workingWindow`),
  `memoryBudget === clamp(round(window*0.12),256,2048)` y
  `summaryOutputBudget === clamp(round(window*0.10),256,1024)` (igualar literalmente
  `resolveMemoryBudget` y el `preferredSummary` de `context-compaction.service.ts:162-165`).
- **Precedencia:** con `workingWindow`/`maxTokens` seguros, los ratios se aplican sobre
  la **ventana efectiva** (`resolveEffectiveWindow`), no sobre `contextWindow` crudo
  (p.ej. `contextWindow=8192, workingWindow=5735, maxTokens=2048` → presupuestos sobre 5735).
  `workingWindow`/`maxTokens` > política (la política solo reparte la ventana ya acotada).
- **Ventana desconocida (`contextWindow:null`) → defaults por política (contrato fijado):**
  fast `{memory:256, summaryOutput:128, summaryMemory:256}`,
  balanced `{memory:512, summaryOutput:256, summaryMemory:512}`,
  deep `{memory:1024, summaryOutput:512, summaryMemory:1024}`.
  Assert para las tres políticas y para `contextWindow:null` con `workingWindow` no seguro.
- **Nunca overflow:** para `deep` con ventana pequeña (4000), `memory + summaryOutput + summaryMemory + outputReserve + system ≥ 0` sigue ≤ ventana porque cada cap se clampa y el residuo va a mensajes (assert de que ningún cap supera su `max` y que la suma de las 3 secciones de la política no supera la ventana).

### 2. Migración 0023 + persistencia
- `0023_context_policy.sql` añade `context_policy text NOT NULL DEFAULT 'balanced'`;
  filas antiguas insertadas sin la columna quedan `balanced` (backfill por `DEFAULT`).
- Snapshot `meta/0023_snapshot.json` + entrada `idx:23` en `_journal.json` (patrón 0021/0022).
- Entidad: `Conversation.create` sin `contextPolicy` → `balanced`; `get contextPolicy` lo expone; `withX`/`create` normalizan con `normalizeContextPolicy`.
- Repositorio Drizzle: `create`/`updateSettings` persisten y releen `contextPolicy`.
- DTO: `ConversationDetail.contextPolicy`, `ConversationSettingsUpdate.contextPolicy?`.

### 3. Compactación
- Conversación **nueva** sin umbral guardado: el umbral/target por defecto vienen de la
  política (`fast`→70/50, `deep`→90/70). `balanced`→80/60 idéntico a hoy.
- **Precedencia del umbral (contrato fijado):** si hay `compactionThreshold` explícito/guardado,
  ese umbral **gana** y el target se deriva con `resolveCompactionTarget` (comportamiento actual).
  Si **no** hay umbral guardado, se usan `policy.compaction.threshold/target` **sin doble margen**
  (no se aplica `resolveCompactionTarget` sobre el target de la política). Casos:
  - umbral guardado 85 → target `resolveCompactionTarget(85)` (=65), ignorando el target de la política;
  - sin umbral guardado → umbral y target de la política tal cual (80/60, 70/50, 90/70).
- **Cambiar de política no resetea `compactionThreshold`** guardado (assert: cambiar fast→deep deja el umbral manual intacto).
- El servicio consume `plan.summaryOutputBudget` (reemplaza `preferredSummary`) y
  `plan.compactionTarget`; sin volver a calcular ratios sueltos.
- `recentMessageCount`/`summaryFrequency` **no se leen** en el cálculo de compactación (assert de que el resultado no cambia al variarlos; se conservan en BD/export por compatibilidad).

### 4. Memoria (paridad S136/S137)
- `selectMemoriesForPrompt` usa `plan.memoryBudget` (deep → cap mayor, fast → menor);
  el **orden estable** de S136 (score desc, prioridad, updatedAt, id) no cambia.
- `balanced` (o sin política) → selección **bit-igual** a S136/S137: reutilizar
  `memoryRetrievalFixtures` y `memoryVectorRetrievalFixtures` sin tocar umbrales (recall ≥0.8, irrelevantes ≤0.2, `tokens ≤ budget`).
- `fast`/`deep` **no activan** embeddings por sí mismas; híbrido/fallback léxico de S137 intacto (embedding null → idéntico a léxico).
- Caps min/max por política respetados.

### 5. Resumen (`generate-summary`)
- Usa el **mismo retrieval que el chat** (léxico o híbrido según config S137, fallback léxico); **no** llama a `filterMemoriesForPrompt` (assert de que el símbolo desaparece o que la selección coincide con `selectMemoriesForPrompt`/híbrido).
- Sección de memoria del prompt de resumen ≤ `summaryMemoryBudget` (fixture que hoy inyectaría **todas** las memorias y en S138 queda acotada → "fixture que mide" el cap).
- `summaryOutputBudget` como límite de salida; **sin doble reserva**: la ventana de transcripción sigue `contextWindow − summaryMaxTokens − SUMMARY_PROMPT_RESERVE` **sin** restar de nuevo la reserva del chat (paridad con `get-prompt-context.parity.test.ts` "working window").
- `balanced` → `summaryMemory` = clamp(round(window*0.12),256,2048) (cambio acotado, documentado, medido aparte del baseline).
- Resumen **sin memorias**: prompt sin sección de memoria, sin error.

### 6. Manifiesto / API
- `manifest.contextPolicy` = id de política; `manifest.budget` = `{ window, memory, summaryOutput, summaryMemory, compactionThreshold, compactionTarget }` **resueltos** (no recomputados en cliente).
- `PATCH /api/conversations/:id/settings` acepta `contextPolicy` con enum válido; rechaza inválido (Zod 400) y el use case repite la defensa con `DomainError("INVALID_CONTEXT_POLICY")`.
- DTO sin secretos (solo enum + números; ni claves ni vectores).

### 7. Export/import/branch/plantilla
- `ExportSettings.contextPolicy` opcional; `DEFAULT_EXPORT_SETTINGS.contextPolicy="balanced"`; `toSettings`/`toSettingsUpdate` la propagan; `EXPORT_SCHEMA_VERSION` **sigue en 1**.
- Export antiguo **sin** `contextPolicy` importa `balanced` (no aborta).
- `branch-conversation` copia `contextPolicy` del origen.
- `apply-settings-template` copia `contextPolicy`; valor inválido en la plantilla → normaliza a `balanced` sin abortar el apply (warning o no, per RFC "sin abortar").

### 8. UI
- `context-policy-card.tsx` (nuevo) en la sección "resúmenes" de `settings-panel.tsx`: tres opciones con nombre corto + descripción **en/es** vía `useTranslation`; label asociado al `Select`.
- `settings-panel.tsx` envía `contextPolicy` en `handleSaveHistoria` y lo incluye en `historiaHasChanges` (sin romper los 500 líneas: la card es componente propio).
- Desglose por sección en `context-manifest-view.tsx` leyendo `manifest.budget`: tokens/cap por sección y si una sección está en su cap; `tabular-nums`, sin depender solo del color.
- Warnings descartables: cap recortado, ventana desconocida; `aria-live`. Hint de `deep` → enlace al gestor de proveedores **sin** cambiar su configuración (Clarificación #1).

### 9. Eval (`context-policy.eval.test.ts`)
Fixtures compuestas: ventanas 4000/8000/32000 × {muchas memorias (40–60), pocas (0–5), lorebook, con/sin summary} × política.
- Escenario 1 **balanced = baseline**: selección de memoria del chat, presupuesto de salida del resumen y compactación **bit-iguales** a las constantes actuales (0 diffs). **El baseline excluye deliberadamente la sección de memoria del prompt de resumen**: el cap 12 %/256–2048 es el único cambio documentado y se mide aparte como mejora acotada (tokens de esa sección ≤ `summaryMemoryBudget`, sin exigir igualdad con el baseline anterior).
- Escenario 2 **fast** muchas memorias → menos incluidas que balanced; cap respetado.
- Escenario 3 **deep** muchas memorias → más incluidas (o cap mayor) sin romper el orden estable.
- Escenario 4 ventana pequeña + deep → caps clampeados, suma nunca supera la ventana.
- Escenario 5 sin ventana → defaults por política (fast 256/128/256, balanced 512/256/512, deep 1024/512/1024) sin romper.
- Escenario 6 `generate-summary` deep → sección de memoria ≤ `summaryMemoryBudget` y usa retrieval (no `filterMemoriesForPrompt`).
- Métricas: tokens por sección vs cap, `estimatedInputTokens` vs ventana, overflow (nunca), determinismo (dos ejecuciones → igual), latencia informativa, recall/irrelevantes S136 con balanced (≥0.8 / ≤0.2).

## Comandos

```sh
pnpm --filter @workspace/backend test            # unit (incluye context-policy.test.ts y migración 0023)
pnpm --filter @workspace/backend eval            # evals (context-policy, memory-retrieval, memory-vector-retrieval)
pnpm --filter @workspace/frontend test           # UI (context-policy-card, context-manifest-view)
pnpm --filter @workspace/backend typecheck       # import-red/type: verifica contexto
pnpm --filter @workspace/shared typecheck
pnpm --filter @workspace/frontend typecheck
pnpm check:arch                                  # 500 líneas, aislamiento de features, shared/lib puro
pnpm check                                       # arch + typecheck + lint (gate de CI)
pnpm build                                       # gate final
```

## No se prueba (intencionalmente)

- **Tokenizer real** (S139): los tokens siguen siendo estimados (`token-estimate.ts`); no se aserta precisión por proveedor.
- **Selección de modelo/proveedor** por política: no toca provider/temperatura.
- **Overrides manuales por sección** (inputs numéricos): diferidos (Clarificación #4).
- **RAG sobre mensajes/lorebooks completos**, re-embedding automático, reranking, memoria entre conversaciones: fuera de alcance.
- Cobertura de backfill de la migración sobre una base pre-0023 real (patrón 0021/0022: se cubre el `DEFAULT`, no una fila migrada real) — nota conocida y aceptada.
- Ajuste fino de ratios fast/deep (solo si la eval no cumple → Stage 3C, con límite de dos ajustes).

## Riesgos del test (el autor NO debe caer en ellos)

1. **Tautología de paridad**: no reimplementar `resolveContextBudget` dentro del test/assert para "verificar" el mismo código. La paridad `balanced` se compara contra las **constantes/expresiones actuales literales** (`0.12/256/2048`, `0.10/256/1024`) y contra `resolveMemoryBudget`/`preferredSummary` **actuales**, no contra la nueva función.
2. **Doble reserva**: asegurar que el test de resumen distingue `summaryOutputBudget` (límite de salida) de `summaryMemoryBudget` (cap de memoria del prompt de resumen) y que **no** se resta dos veces la reserva del chat; usar el fixture de working-window de `get-prompt-context.parity.test.ts`.
3. **Paridad S136/S137**: reutilizar los fixtures existentes **sin cambiar** sus umbrales; si se tocan, se rompe la no-regresión. Los motivos `semantic`/`hybrid` y el orden base no cambian.
4. **Orden/determinismo**: el cap por política recorta por score; el orden estable de S136 es parte del contrato (empates → id asc). Assertarlo explícitamente, no asumirlo.
5. **Umbral guardado**: probar que cambiar de política no pisa `compactionThreshold` usando una conversación con umbral explícito distinto del default de la política.
6. **Doble margen en compactación**: cuando hay umbral guardado, el target se deriva con `resolveCompactionTarget`; cuando no, se usan `policy.compaction.threshold/target` tal cual. No aplicar ambos caminos a la vez.
