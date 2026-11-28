# S138 — Políticas de contexto fast/balanced/deep y presupuesto

**Estado:** Draft
**Inicio:** 2026-11-28
**Fin:** —

> `Draft` → `Aprobado` → `En progreso` → `Completado`.
> Solo el usuario cambia `Draft` a `Aprobado`.

## Descripción

S138 introduce una **política de contexto** por conversación (`fast`, `balanced`,
`deep`) que reparte la ventana efectiva entre resumen, memoria, mensajes y
reserva de salida de forma determinista, unifica el presupuesto que hoy vive
disperso en tres servicios y lo expone en la UI con un selector y un desglose
por sección. `balanced` reproduce **exactamente** el comportamiento actual, así
que las conversaciones existentes no cambian salvo por las mejoras documentadas.
Deja fuera el tokenizer real (S139), la selección de modelo, el RAG completo y
cualquier cambio de embeddings.

## RFC

### Problema

Con la ventana (S121), la compactación (S122), la ventana de trabajo (S130/S131),
el manifiesto (S129) y el retrieval léxico/híbrido (S136/S137) ya cerrados, el
presupuesto de contexto sigue repartido en **constantes sueltas** y no hay forma
de que el usuario lo ajuste según lo que quiere priorizar:

1. **El presupuesto está disperso y no es configurable.** `resolveMemoryBudget`
   (`memory-retrieval.service.ts:229-240`) usa `clamp(round(window * 0.12), 256,
   2048)`. `ContextCompactionService` usa `min(1024, max(256, floor(window *
   0.1)))` para el resumen (`context-compaction.service.ts:162-165`). El umbral
   de compactación es un campo suelto (`compactionThreshold`). No hay una única
   fuente de verdad ni un "modo" que el usuario pueda elegir: quien quiera más
   memoria o más historia no tiene control.
2. **No existe el concepto de política.** El usuario no puede decir "respuesta
   rápida" vs "más contexto" sin tocar números sueltos (umbral, ventana,
   `maxTokens`). `fast/balanced/deep` no existen en el dominio.
3. **`generate-summary` usa el filtro de memoria antiguo.** S136/S137 lo dejaron
   diferido explícitamente a S138 (`filterMemoriesForPrompt`,
   `generate-summary.use-case.ts:27,169-173`): el prompt de resumen no usa el
   retrieval léxico/híbrido y no tiene presupuesto propio, así que la memoria
   que ve el resumen puede diferir de la que ve el prompt de chat.
4. **No hay evidencia de que el presupuesto se cumpla por sección.** El
   manifiesto (S129) ya mide `tokens` por sección, pero nadie comprueba que
   `system + summary + memories + messages` respete una cota declarada; solo la
   compactación (mensajes) y la memoria tienen presupuesto, cada una por su
   cuenta.
5. **`recentMessageCount`/`summaryFrequency` siguen vivos en el esquema** y en
   los DTO/export, pero el motor ya no los usa (S122 los retiró de la UI). Son
   ruido que compite conceptualmente con la nueva política.

### Restricciones

- **Hexagonal.** La política y la aritmética del presupuesto viven en
  `@workspace/shared/lib/` (puro, sin I/O ni dependencias) o en un value
  object de dominio; los servicios de aplicación (`memory-retrieval`,
  `context-compaction`, `generate-summary`, `context-compiler`) consumen el
  plan. Nada de Drizzle/Express en `domain/`/`application/` (salvo la excepción
  `error-handler` ya documentada).
- **`shared/` puro.** Los tipos nuevos (`context-policy.ts`, campos en
  `conversation.ts`/`context.ts`/`export.ts`) no importan React, Express,
  Drizzle ni zod.
- **Sin dependencias nuevas.** Ninguna.
- **Migración aditiva y compatible.** Añadir `context_policy` (migration
  `0023`) con default `balanced` y backfill; no romper export/import
  (`EXPORT_SCHEMA_VERSION` sigue en 1) ni conversaciones existentes.
- **Sin regresión de S136/S137/S130/S131.** Con `balanced` (o sin política) el
  presupuesto de memoria, el de resumen y la compactación deben producir los
  mismos valores que hoy. Las evals `memory-retrieval`, `memory-vector-retrieval`
  y `context-assembly` siguen en verde sin tocar sus umbrales.
- **Nunca superar la ventana.** La suma de las secciones + reserva de salida
  nunca excede la ventana efectiva (`resolveEffectiveWindow`); el plan clampa
  cada cap y el residuo va a mensajes, que la compactación ya recorta.
- **La política no promete "mejor modelo".** No toca proveedor, modelo, ni
  temperatura. Solo reparte presupuesto y fija umbrales por defecto.
- **500 líneas / aislamiento de features / i18n en-es.** La UI nueva vive en
  `components/conversation/` y las cadenas en `shared/i18n` (en/es).
- **Sin red en tests/eval.** Todo determinista; los fixtures usan los factories
  existentes.

### Opciones consideradas

| Opción | Ventajas | Costes | ¿Elegida? |
| ------ | -------- | ------ | --------- |
| **A. Política como constantes puras en `shared/lib/context-policy.ts` + columna `context_policy` en `conversations`** | Una sola fuente de verdad; el plan se calcula en `resolveContextBudget` y lo consumen los tres servicios; `balanced` reproduce los valores actuales; migración aditiva trivial; la política viaja en export/rama/plantilla como el resto de settings de conversación | Nueva columna + migración; hay que propagar el campo por entidad/DTO/repo/export/plantilla | **Sí** |
| B. Política solo como clave en la tabla `settings` (global) | Sin migración en `conversations`; una política para toda la app | La política es **por conversación** en este dominio (cada chat tiene su modelo/ventana/historia); una clave global no permite "esta conversación va rápida y esta otra profunda" y rompería el patrón de settings locales | No |
| C. Política solo como clave en `settings` por conversación (KV `context_policy.<id>`) | Evita tocar el esquema | Dos fuentes de verdad; el ciclo de vida (branch/export/template) ya copia columnas, no claves KV; más fácil que se desincronice | No |
| D. Política inferida de los campos actuales (umbral + ventana + maxTokens) | Sin migración | No es un modo explícito; el usuario no elige "fast" ni "deep"; no resuelve el presupuesto de memoria/resumen disperso | No |
| E. Política en un valor JSON (columnas `context_budget_*` separadas) | Control fino | N columnas nuevas, migración y UI más grandes; sobredimensionado para 3 modos | No |

**Descarte explícito de B/C:** la política es una propiedad de la conversación
como lo son `contextWindow`, `workingWindow` y `compactionThreshold`; una clave
global o un KV rompe export/import/rama/plantilla, que ya propagan columnas.

### Decisión

Se elige **A**. Resumen de las decisiones (cada punto con su detalle abajo):

1. **Semántica.** `fast`/`balanced`/`deep` reparten el **presupuesto de entrada**
   entre resumen, memoria y mensajes, y fijan el **umbral de compactación por
   defecto**. No tocan el modelo, la reserva de salida ni el retrieval en sí.
2. **Dónde se guarda.** Columna `context_policy` en `conversations` (migration
   `0023`), default `balanced`, backfill de filas existentes, en export/import,
   ramas y plantillas de settings.
3. **Presupuesto.** Un único `resolveContextBudget({ policy, effectiveWindow })`
   en `shared` devuelve el plan `{ memoryBudget, summaryOutputBudget,
   summaryMemoryBudget, compactionThreshold, compactionTarget }`; los tres
   servicios lo consumen y dejan de usar constantes sueltas.
4. **Compactación.** La política aporta el umbral/target **por defecto** para
   conversaciones nuevas; un `compactionThreshold` explícito del usuario gana.
5. **Memoria.** La política solo cambia el **presupuesto** de memoria; el modo
   léxico/híbrido sigue siendo el opt-in de S137.
6. **Resumen.** `generate-summary` se alinea con el retrieval (mismo selector) y
   recibe su propio presupuesto; se evita la doble reserva.
7. **UI.** Selector de política en Historia + desglose de presupuesto por
   sección + warnings; sin tocar el gestor de proveedores.
8. **API/DTO.** `contextPolicy` con default `balanced` y validación de enum; el
   manifiesto expone el plan resuelto.
9. **Eval.** Fixtures de ventanas pequeñas/grandes con muchas memorias,
   lorebook y summary; métricas de presupuesto, secciones, overflow,
   determinismo y paridad `balanced` = baseline.
10. **Fuera de alcance.** Tokenizer (S139), selección de modelo, RAG completo,
    cambios de embeddings, reranking, memoria entre conversaciones.

#### 1. Semántica de las políticas

La política es un **value object inmutable y puro** (shared):

```ts
type ContextPolicyId = "fast" | "balanced" | "deep"

interface ContextPolicy {
  id: ContextPolicyId
  /** Memory section budget: clamp(round(window * ratio), min, max). */
  memory: { ratio: number; min: number; max: number }
  /** Summary generation output budget (the summary text written into the prompt). */
  summaryOutput: { ratio: number; min: number; max: number }
  /** Memory section budget inside the summary prompt (generate-summary). */
  summaryMemory: { ratio: number; min: number; max: number }
  /** Default compaction threshold/target for new conversations. */
  compaction: { threshold: number; target: number }
}
```

- **`balanced`** reproduce los valores actuales **exactamente**:
  - `memory.ratio = 0.12, min = 256, max = 2048` (idéntico a
    `resolveMemoryBudget` de hoy).
  - `summaryOutput.ratio = 0.10, min = 256, max = 1024` (idéntico a
    `preferredSummary` de hoy).
  - `summaryMemory.ratio = 0.12, min = 256, max = 2048` (mismo criterio que el
    prompt de chat; hoy el resumen inyecta **todas** las memorias sin límite,
    así que esto es una mejora acotada y documentada).
  - `compaction.threshold = 80, target = 60` (idéntico a hoy).
- **`fast`**: menos contexto, más margen de velocidad (menos tokens a procesar
  y compacta antes): `memory.ratio = 0.06, min = 128, max = 1024`;
  `summaryOutput.ratio = 0.05, min = 128, max = 512`;
  `summaryMemory.ratio = 0.06, min = 128, max = 1024`;
  `compaction.threshold = 70, target = 50`.
- **`deep`**: más contexto (más memoria y resumen, compacta más tarde):
  `memory.ratio = 0.18, min = 256, max = 4096`;
  `summaryOutput.ratio = 0.15, min = 256, max = 2048`;
  `summaryMemory.ratio = 0.18, min = 256, max = 4096`;
  `compaction.threshold = 90, target = 70`.

Los números de `fast`/`deep` son **punto de partida** y se calibran con la eval;
los de `balanced` son fijos (no se tocan: son el baseline).

**Qué controla y qué no.** La política controla: presupuesto de memoria, de
resumen (salida) y de memoria-en-resumen, y el umbral/target de compactación
**por defecto**. La política **no** controla: el modelo/proveedor, la reserva de
salida (`maxTokens`/`workingWindow`), el modo léxico/híbrido (opt-in S137), ni
el decaimiento. La copia de la UI lo deja claro: elegir `deep` no cambia de
modelo, solo reparte más tokens a memoria/resumen.

#### 2. Dónde se guarda

- **Migración `0023_context_policy.sql`**: `ALTER TABLE conversations ADD
  context_policy text NOT NULL DEFAULT 'balanced';` (aditiva, con backfill
  automático por el `DEFAULT`; test de migración que verifica filas antiguas →
  `balanced`).
- **Esquema Drizzle**: `contextPolicy: text("context_policy", { enum: ["fast",
  "balanced", "deep"] }).notNull().default("balanced")` en
  `conversations.schema.ts`; snapshot `meta/0023_snapshot.json` y journal con
  `db:generate`.
- **Entidad**: `ConversationProps.contextPolicy` (con default `balanced` en
  `create`, igual que `compactionThreshold`). No se valida en la entidad: el
  enum se valida en la ruta/Zod y en el `withX`/`create` se normaliza con
  `normalizeContextPolicy` (shared).
- **Export/import**: `ExportSettings.contextPolicy` (opcional, default
  `balanced`); un export antiguo sin la clave importa `balanced`.
  `EXPORT_SCHEMA_VERSION` **no** cambia.
- **Ramas**: `branch-conversation` copia `contextPolicy` del origen.
- **Plantillas de settings**: `apply-settings-template` copia `contextPolicy`;
  un valor inválido se normaliza a `balanced` sin abortar el apply.
- **No se guarda en `settings`**: es una propiedad de conversación, no global.

#### 3. Presupuesto

Nuevo `resolveContextBudget` puro en
`packages/shared/src/lib/context-policy.ts`:

```
resolveContextBudget({ policy, window, workingWindow, maxTokens })
  → ContextBudgetPlan
```

donde `window`/`outputReserve` salen de `resolveEffectiveWindow` (S131). El plan:

```
memoryBudget        = clamp(round(window * policy.memory.ratio), memory.min, memory.max)
summaryOutputBudget = clamp(round(window * policy.summaryOutput.ratio), summaryOutput.min, summaryOutput.max)
summaryMemoryBudget = clamp(round(window * policy.summaryMemory.ratio), summaryMemory.min, summaryMemory.max)
compactionThreshold = policy.compaction.threshold   // default; user value wins (ver §4)
compactionTarget    = policy.compaction.target
```

- **Caps por sección**: memoria, resumen (salida) y memoria-en-resumen tienen
  caps independientes; **mensajes** absorben el residuo (`window` menos system,
  resumen, memoria y reserva de salida), que es exactamente lo que la
  compactación ya recorta. La suma nunca supera la ventana porque los caps se
  claman y el residuo lo gestiona la compactación.
- **Sin override manual en S138** salvo el umbral de compactación ya existente.
  Un override fino por sección (input numérico en la UI) queda **diferido** (ver
  Deferred y Ambigüedades); no bloquea.
- **Precedencia**: `workingWindow`/`maxTokens` (usuario o "Aplicar detectado")
  > política. La política solo decide cómo se reparte la ventana **de entrada**
  que ya quedó acotada por `resolveEffectiveWindow`. `compactionThreshold`
  explícito > política (§4).
- **Consumidores**: `memory-retrieval.service.ts` reemplaza
  `resolveMemoryBudget` por `plan.memoryBudget`; `context-compaction.service.ts`
  reemplaza `preferredSummary` por `plan.summaryOutputBudget` y el umbral/target
  por los del plan (respetando el override); `generate-summary.use-case.ts` usa
  `plan.summaryOutputBudget` y `plan.summaryMemoryBudget`.

#### 4. Compactación

- La política aporta `compaction.threshold/target` **por defecto**. Para
  conversaciones **nuevas** el umbral inicial es el de la política. Una
  conversación **existente** conserva su `compactionThreshold` guardado (no se
  pisa al cambiar de política). Si el usuario edita el umbral a mano, ese valor
  gana siempre.
- **Recomendación sobre cambiar de política en una conversación existente:**
  **no** se resetea `compactionThreshold`; la política solo cambia los
  presupuestos de memoria/resumen y el modo en la UI. El umbral sigue siendo
  editable de forma independiente. (Ambigüedad #2.)
- `recentMessageCount`/`summaryFrequency` **quedan obsoletos** de facto: el
  motor no los lee (desde S122); la política asume el papel de "cuánta historia
  cabe". Se conservan en BD/export por compatibilidad (como ya se hacía) y se
  documenta que no se usan. No se añade UI nueva para ellos.

#### 5. Memoria

- La política **solo** cambia `memoryBudget`. El modo de retrieval (léxico vs
  híbrido) sigue siendo el opt-in de S137: `fast`/`deep` **no** activan
  embeddings por sí mismos. Si no hay proveedor de embeddings configurado o
  falla, el fallback léxico de S137 se mantiene intacto.
- Con `deep`, una memoria relevante entra con más presupuesto (ratio 0.18), pero
  la regla de entrada y el orden de S136 no cambian; solo cabe más dentro del
  cap. Con `fast`, menos.
- **Hint en la UI (no bloqueante):** en el desglose, `deep` puede mostrar "para
  aprovechar más memoria, activa embeddings" (enlace al gestor de proveedores)
  **sin** invadir ese gestor ni cambiar su configuración. (Ambigüedad #1.)

#### 6. Resumen

- `generate-summary` se alinea con el retrieval: usa `selectMemoriesForPrompt`
  (o el híbrido) con el `summaryMemoryBudget` del plan en lugar de
  `filterMemoriesForPrompt`. Esto cierra el deferido explícito de S136/S137.
- **Doble reserva**: el resumen consume `summaryOutputBudget` como límite de
  salida y `summaryMemoryBudget` para la sección de memoria del prompt de
  resumen; la ventana de transcripción sigue la fórmula actual
  (`contextWindow − summaryMaxTokens − SUMMARY_PROMPT_RESERVE`) **sin** restar
  de nuevo la reserva de salida del chat. El `summaryMemoryBudget` es un cap
  sobre las memorias inyectadas al resumen, no una resta del presupuesto del
  prompt de chat (son dos llamadas distintas).
- La política **no** cambia el proveedor/modelo del resumen (sigue usando el de
  la conversación).

#### 7. UI

- **Selector de política** en el diálogo de Historia (`settings-panel.tsx`,
  sección "resúmenes" junto a `CompactionSettingsCard`): tres opciones con
  nombre corto y descripción en en/es, y un resumen de lo que prioriza cada una
  (menos/más memoria y resumen). Componente propio
  (`context-policy-card.tsx`) para no agrandar `settings-panel.tsx` (hoy 492
  líneas).
- **Desglose de presupuesto por sección**: se añade al `context-manifest-view.tsx`
  (o a un componente `context-budget-view.tsx`) la lectura del `manifest.budget`
  (nuevo, §8): tokens por sección, cap por sección y si una sección está en su
  cap. Se reutiliza el manifiesto ya existente, no se recalcula en el cliente.
- **Warnings**: si el presupuesto de memoria o resumen se recorta por cap, o si
  la ventana es desconocida, se muestra un aviso descartable con i18n. No se
  bloquea el envío (coherente con S121/S122).
- **Accesibilidad**: el selector es un `Select` con label asociado; el desglose
  usa texto + tabular-nums, sin depender solo del color; `aria-live` para los
  warnings. Todo en en/es vía `useTranslation`.
- **No invade el gestor de proveedores**: la política vive en los ajustes de la
  conversación; embeddings sigue en su sección del gestor de proveedores.

#### 8. API/DTO

- `ConversationDetail.contextPolicy: ContextPolicyId` y
  `ConversationSettingsUpdate.contextPolicy?: ContextPolicyId`.
- Zod en `conversation.routes.ts`: `contextPolicy: z.enum(["fast", "balanced",
  "deep"]).optional()`.
- `UpdateConversationSettingsUseCase` normaliza el valor (rechaza/`DomainError`
  con `INVALID_CONTEXT_POLICY` si no es un enum válido — la ruta ya lo filtra,
  pero el use case repite la defensa como en S137).
- `PromptContextMetadataDTO` y `ContextManifestDTO` ganan:
  - `manifest.contextPolicy: ContextPolicyId`
  - `manifest.budget`: `{ window, memory, summaryOutput, summaryMemory,
    compactionThreshold, compactionTarget }` (valores resueltos) para que la UI
    pinte el desglose sin recomputar.
- Sin secretos en DTOs (la política es un enum y números).
- `ExportSettings.contextPolicy` opcional (default `balanced`).

#### 9. Eval

Ver "Plan de eval" abajo.

#### 10. Fuera de alcance

- Tokenizer real por proveedor → **S139**.
- Selección automática de modelo por política.
- RAG sobre mensajes/lorebooks completos (S137 solo cubrió memoria).
- Cambios en embeddings, reindexado o reranking.
- Memoria entre conversaciones o memoria global de personaje.
- Override fino por sección (inputs numéricos) → diferido (Ambigüedad #4).
- Resumen jerárquico/multi-resumen.

### Ambigüedades que requieren aprobación

1. **¿`deep` sugiere embeddings o se queda léxico?** Recomendación: la política
   solo cambia presupuesto; `deep` muestra un **hint no bloqueante** que enlaza
   al gestor de proveedores, sin activar nada.
2. **¿Cambiar de política en una conversación existente resetea el umbral de
   compactación?** Recomendación: **no**. La política solo fija el default para
   conversaciones nuevas; un `compactionThreshold` guardado gana siempre.
3. **Calibrado de `fast`/`deep`.** Los ratios son punto de partida; la eval los
   fija. ¿Se aprueban los valores propuestos en §1?
4. **Override manual por sección.** ¿Lo dejamos fuera (recomendado) o añadimos
   ya un input numérico de memoria/resumen por conversación? Recomendado: fuera,
   diferido, para no agrandar el slice.

## Plan de eval

Obligatorio: cambia el presupuesto y el comportamiento del prompt.

- **Fixtures:** `packages/backend/evals/fixtures/context-policy.ts` con
  conversaciones deterministas (factories existentes) que combinan:
  - Ventana pequeña (p. ej. 4 000), media (8 000) y grande (32 000).
  - Muchas memorias elegibles (40–60) y pocas (0–5).
  - Lorebook activado con entradas que compiten por presupuesto.
  - Con resumen previo y sin él.
  - Una política por escenario (`fast`/`balanced`/`deep`) y mensaje pendiente.
- **Escenarios:**
  1. `balanced` sobre los fixtures de S136/S137 → **bit-igual** a la selección
     y al presupuesto actuales (paridad, baseline).
  2. `fast` con muchas memorias relevantes → menos memorias incluidas que
     `balanced`; el cap de memoria se cumple.
  3. `deep` con muchas memorias → más memorias incluidas (o el cap mayor), sin
     romper el orden estable de S136.
  4. Ventana pequeña con `deep` → los caps se claman y la suma
     system+summary+memories+reserva nunca supera la ventana.
  5. Sin ventana (`contextWindow: null`) → `balanced` devuelve los defaults
     actuales (512 de memoria, 256/1024 de resumen) y no rompe.
  6. `generate-summary` con `deep` → la sección de memoria del prompt de
     resumen respeta `summaryMemoryBudget` y usa el retrieval (no
     `filterMemoriesForPrompt`).
- **Métricas:** tokens por sección vs cap (memoria, resumen), `estimatedInputTokens`
  vs ventana, overflow (nunca), orden estable entre dos ejecuciones, latencia
  (informativa) y recall/irrelevantes de los fixtures de S136 reutilizados.
- **Baseline:** comportamiento actual con `balanced` (constantes de hoy):
  `resolveMemoryBudget` y `preferredSummary` actuales; se registran como
  referencia y se exige igualdad exacta.
- **Umbral:** paridad exacta `balanced` = baseline (0 diffs); caps nunca
  superados; determinismo (misma salida en dos ejecuciones); los umbrales de
  S136/S137 (recall ≥ 0,8, irrelevantes ≤ 0,2) siguen en verde con `balanced`.
  Si `fast`/`deep` no mejoran la sección que prometen (más/menos memoria) en los
  fixtures, se recalibran los ratios antes de cerrar.

## Criterios de aceptación

- [ ] `context-policy.ts` en `shared` con `ContextPolicyId`, las tres políticas
      y `resolveContextBudget` puro y determinista (aritmética entera).
- [ ] Migración `0023` añade `context_policy` con default `balanced` y backfill;
      test de migración (filas antiguas → `balanced`).
- [ ] `Conversation`/Drizzle/DTO/export/rama/plantilla propagan `contextPolicy`;
      un export antiguo importa `balanced`; `EXPORT_SCHEMA_VERSION` no cambia.
- [ ] `memory-retrieval`, `context-compaction` y `generate-summary` consumen el
      plan de `resolveContextBudget` y dejan de usar constantes sueltas.
- [ ] `generate-summary` usa el retrieval (no `filterMemoriesForPrompt`) con
      `summaryMemoryBudget` propio.
- [ ] Con `balanced` (o sin política) la selección de memoria, el presupuesto de
      resumen y la compactación son **idénticos** al comportamiento actual
      (tests de no-regresión; evals S136/S137 intactas).
- [ ] La suma de secciones + reserva de salida nunca supera la ventana efectiva
      (test de overflow con ventana pequeña y `deep`).
- [ ] `PATCH /api/conversations/:id/settings` acepta `contextPolicy` con enum
      válido y rechaza valores inválidos (`INVALID_CONTEXT_POLICY`); DTO sin
      secretos.
- [ ] El manifiesto expone `contextPolicy` y `budget` (plan resuelto) y la UI
      pinta el desglose por sección.
- [ ] UI: selector de política en Historia con descripción en en/es, desglose de
      presupuesto en el preview y warnings descartables; accesible (labels,
      foco, `aria-live`); sin invadir el gestor de proveedores.
- [ ] Eval de políticas en verde con los umbrales del plan de eval.
- [ ] `pnpm check`, tests backend/frontend, `pnpm build`, `pnpm audit --prod` y
      `pnpm eval` pasan.
- [ ] `CHANGELOG` bajo `[Unreleased]`, en inglés; sin bump de versión.

## Red tests

| Área | Test rojo esperado |
| ---- | ------------------ |
| Shared | `resolveContextBudget` no existe; `ContextPolicyId`/`normalizeContextPolicy` no se exportan; `balanced` no iguala `resolveMemoryBudget` actual. |
| Migración | `context_policy` no existe en el esquema; filas antiguas no quedan `balanced`. |
| Repositorio/entidad | `Conversation.contextPolicy` es `undefined`; `updateSettings` no persiste el campo; `ConversationDetail` no lo expone. |
| Retrieval | `resolveMemoryBudget` no respeta el plan (usa la constante 0.12 en vez de la política). |
| Compactación | `preferredSummary` no usa `summaryOutputBudget` de la política; el umbral default de `fast`/`deep` no aplica en conversaciones nuevas. |
| Resumen | `generate-summary` sigue usando `filterMemoriesForPrompt`; no aplica `summaryMemoryBudget`. |
| Compiler/manifiesto | `manifest.budget`/`manifest.contextPolicy` no existen. |
| UI | Falta `context-policy-card.tsx`; `settings-panel` no manda `contextPolicy`; el preview no muestra el desglose. |
| Eval | `context-policy` eval falla: `balanced` difiere del baseline o un cap se supera. |

## Decisiones

Decisiones ya cerradas en el RFC (sujetas a aprobación):

- **Política como constantes puras + columna por conversación** (opción A), no
  `settings` ni KV.
- **`balanced` = comportamiento actual** (ratios 0.12 / 0.10 / 0.12, umbral
  80/target 60); `fast`/`deep` son punto de partida calibrable.
- **La política reparte presupuesto y fija defaults de compactación; no toca
  modelo, reserva de salida ni modo de retrieval.**
- **Un único `resolveContextBudget`** como fuente de verdad del presupuesto,
  consumido por retrieval, compactación y resumen.
- **`generate-summary` se alinea con el retrieval** y recibe presupuesto propio
  (cierra el deferido de S136/S137).
- **`recentMessageCount`/`summaryFrequency` quedan obsoletos** y documentados;
  se conservan en BD/export por compatibilidad.

## Verificación

Pendiente. Al cerrar el slice:

- Tests: backend/frontend/evals con los conteos finales.
- `pnpm check` (arch + typecheck + lint).
- `pnpm build`.
- `pnpm audit --prod`.
- Release dry-run: no aplica (sin cambios de packaging, lockfile ni módulos
  nativos).
- Prueba manual: cambiar de política en una conversación y ver el desglose y el
  indicador de uso.

## Review

- **Estado:** pendiente
- **Informe:** `docs/10-slices/S138-review.md`

## Deferred

- **Override fino por sección** (input numérico de memoria/resumen por
  conversación) — no entra en S138 salvo decisión contraria (Ambigüedad #4).
- **Tokenizer real por proveedor** → S139.
- **Selección de modelo por política** y **RAG sobre mensajes/lorebooks**
  completos.
- **Re-embedding / reranking / memoria entre conversaciones** — fuera de S138.

## Commits

1. `docs(slice): add S138 RFC`
2. `docs(slice): approve S138 RFC`
3. `test(backend): add S138 red tests and context policy fixtures`
4. `feat(shared): add context policy types and budget resolver`
5. `feat(backend): add context_policy column and thread it through conversations`
6. `feat(backend): use the policy budget in retrieval, compaction and summary`
7. `feat(backend): expose the resolved budget in the context manifest`
8. `feat(frontend): add policy selector and budget breakdown`
9. `test(frontend): cover policy selector and budget view`
10. `docs(slice): add S138 review report`
11. `docs(slice): close S138 and update roadmap`
