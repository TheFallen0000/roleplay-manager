# S138 — Políticas de contexto fast/balanced/deep y presupuesto

**Estado:** Aprobado
**Inicio:** 2026-11-28
**Fin:** —

> `Draft` → `Aprobado` → `En progreso` → `Completado`.
> Solo el usuario cambia `Draft` a `Aprobado`.

## Descripción

S138 introduce una **política de contexto** por conversación (`fast`, `balanced`,
`deep`) que reparte la ventana efectiva entre resumen, memoria, mensajes y
reserva de salida de forma determinista, unifica el presupuesto que hoy vive
disperso en tres servicios y lo expone en la UI con un selector y un desglose
por sección. `balanced` reproduce **exactamente** el prompt de chat y la
compactación actuales, así que las conversaciones existentes no cambian salvo por
la mejora documentada del resumen (cap de memoria del resumen, 12 %).
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
- **Sin regresión de S136/S137/S130/S131.** Con `balanced` (o sin política) la
  selección de memoria del **chat**, el presupuesto de salida del resumen y la
  compactación producen los mismos valores que hoy. El **cap de memoria del
  resumen** es el único cambio frente al comportamiento actual (confirmado y
  acotado). Las evals `memory-retrieval`, `memory-vector-retrieval` y
  `context-assembly` siguen en verde sin tocar sus umbrales.
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
3. **Presupuesto.** Un único `resolveContextBudget({ policy, contextWindow, workingWindow, maxTokens })`
   en `shared` devuelve el plan `{ window, outputReserve, memoryBudget,
   summaryOutputBudget, summaryMemoryBudget, compactionThreshold,
   compactionTarget }`; los tres
   servicios lo consumen y dejan de usar constantes sueltas.
4. **Compactación.** La política aporta el umbral/target **por defecto** para
   conversaciones nuevas; un `compactionThreshold` explícito del usuario gana
   (y el target se deriva con `resolveCompactionTarget`, sin doble margen).
5. **Memoria.** La política solo cambia el **presupuesto** de memoria; el modo
   léxico/híbrido sigue siendo el opt-in de S137.
6. **Resumen.** `generate-summary` usa el **mismo retrieval que el chat**
   (léxico o híbrido según S137) con `summaryMemoryBudget` propio y fallback
   léxico; se evita la doble reserva. El cap de memoria del resumen aplica
   también en `balanced` (cambio acotado, confirmado).
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
  /** Memory section budget: clamp(round(window * ratio), min, max); `fallback` when window is null. */
  memory: { ratio: number; min: number; max: number; fallback: number }
  /** Summary generation output budget (the summary text written into the prompt). */
  summaryOutput: { ratio: number; min: number; max: number; fallback: number }
  /** Memory section budget inside the summary prompt (generate-summary). */
  summaryMemory: { ratio: number; min: number; max: number; fallback: number }
  /** Default compaction threshold/target for new conversations. */
  compaction: { threshold: number; target: number }
}
```

- **`balanced`** reproduce los valores actuales **exactamente**:
  - `memory.ratio = 0.12, min = 256, max = 2048, fallback = 512` (idéntico a
    `resolveMemoryBudget` de hoy, incluido el default sin ventana).
  - `summaryOutput.ratio = 0.10, min = 256, max = 1024, fallback = 256` (idéntico
    a `preferredSummary` de hoy).
  - `summaryMemory.ratio = 0.12, min = 256, max = 2048, fallback = 512` (mismo
    criterio que el prompt de chat; **cambio confirmado**: hoy el resumen inyecta
    **todas** las memorias sin límite, así que este cap es un cambio acotado y
    documentado).
  - `compaction.threshold = 80, target = 60` (idéntico a hoy).
- **`fast`**: menos contexto, más margen de velocidad (menos tokens a procesar
  y compacta antes): `memory.ratio = 0.06, min = 128, max = 1024, fallback = 256`;
  `summaryOutput.ratio = 0.05, min = 128, max = 512, fallback = 128`;
  `summaryMemory.ratio = 0.06, min = 128, max = 1024, fallback = 256`;
  `compaction.threshold = 70, target = 50`.
- **`deep`**: más contexto (más memoria y resumen, compacta más tarde):
  `memory.ratio = 0.18, min = 256, max = 4096, fallback = 1024`;
  `summaryOutput.ratio = 0.15, min = 256, max = 2048, fallback = 512`;
  `summaryMemory.ratio = 0.18, min = 256, max = 4096, fallback = 1024`;
  `compaction.threshold = 90, target = 70`.

Los números de `fast`/`deep` son **punto de partida** y se calibran con la eval;
los de `balanced` son fijos (no se tocan: son el baseline).

**Ratios y defaults por política** (los `fallback` aplican solo con
`contextWindow: null`, cuando no hay ventana para calcular el ratio):

| Política  | memory (ratio / min / max / fallback) | summaryOutput (ratio / min / max / fallback) | summaryMemory (ratio / min / max / fallback) | compaction (threshold / target) |
| --------- | ------------------------------------- | -------------------------------------------- | -------------------------------------------- | ------------------------------- |
| `fast`     | 0.06 / 128 / 1024 / **256**           | 0.05 / 128 / 512 / **128**                   | 0.06 / 128 / 1024 / **256**                   | 70 / 50                         |
| `balanced` | 0.12 / 256 / 2048 / **512**           | 0.10 / 256 / 1024 / **256**                  | 0.12 / 256 / 2048 / **512**                   | 80 / 60                         |
| `deep`     | 0.18 / 256 / 4096 / **1024**          | 0.15 / 256 / 2048 / **512**                  | 0.18 / 256 / 4096 / **1024**                  | 90 / 70                         |

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
resolveContextBudget({ policy, contextWindow, workingWindow, maxTokens })
  → ContextBudgetPlan
```

La función llama **internamente** a `resolveEffectiveWindow({ contextWindow,
workingWindow, maxTokens })` (S131): no recibe una ventana ya resuelta. El plan
devuelve la ventana y la reserva de salida resueltas (`window`/`outputReserve`)
junto a los presupuestos, para que el llamador no re-compute la precedencia:

```
effective = resolveEffectiveWindow({ contextWindow, workingWindow, maxTokens })
window    = effective.window          // null si no hay ventana
outputReserve = effective.outputReserve

memoryBudget        = window === null
  ? policy.memory.fallback
  : clamp(round(window * policy.memory.ratio), memory.min, memory.max)
summaryOutputBudget = window === null
  ? policy.summaryOutput.fallback
  : clamp(round(window * policy.summaryOutput.ratio), summaryOutput.min, summaryOutput.max)
summaryMemoryBudget = window === null
  ? policy.summaryMemory.fallback
  : clamp(round(window * policy.summaryMemory.ratio), summaryMemory.min, summaryMemory.max)
compactionThreshold = policy.compaction.threshold   // default; ver §4 para el override
compactionTarget    = policy.compaction.target      // default; ver §4 para el target derivado
```

- **Caps por sección**: memoria, resumen (salida) y memoria-en-resumen tienen
  caps independientes; **mensajes** absorben el residuo (`window` menos system,
  resumen, memoria y reserva de salida), que es exactamente lo que la
  compactación ya recorta. La suma nunca supera la ventana porque los caps se
  claman y el residuo lo gestiona la compactación.
- **Ventana desconocida (`contextWindow: null`).** Sin ventana no hay ratio que
  aplicar: cada sección usa su `fallback` (ver tabla §1). Con `balanced` son los
  defaults actuales (512 memoria / 256 resumen / 512 memoria-resumen); con
  `fast` 256/128/256 y con `deep` 1024/512/1024. La compactación no se dispara
  sin ventana (comportamiento actual).
- **Sin override manual en S138** salvo el umbral de compactación ya existente.
  Un override fino por sección (input numérico en la UI) queda **diferido** (ver
  Deferred); no bloquea.
- **Precedencia**: `workingWindow`/`maxTokens` (usuario o "Aplicar detectado")
  > política. La política solo decide cómo se reparte la ventana **de entrada**
  que ya quedó acotada por `resolveEffectiveWindow`. `compactionThreshold`
  explícito > política (§4).
- **Consumidores**: `memory-retrieval.service.ts` reemplaza
  `resolveMemoryBudget` por `plan.memoryBudget`; `context-compaction.service.ts`
  reemplaza `preferredSummary` por `plan.summaryOutputBudget` y usa el umbral del
  plan como default (con `resolveCompactionTarget` si hay umbral explícito, §4);
  `generate-summary.use-case.ts` usa `plan.summaryOutputBudget` y
  `plan.summaryMemoryBudget`.

#### 4. Compactación

- **Umbral y target por defecto de la política.** Para conversaciones **nuevas**
  sin umbral guardado, se usan `policy.compaction.threshold` y
  `policy.compaction.target` **tal cual** (sin margen adicional: el target ya es
  el resultado del margen deseado por la política). Una conversación **existente**
  conserva su `compactionThreshold` guardado (no se pisa al cambiar de política).
- **Umbral explícito/guardado.** Si la conversación tiene un
  `compactionThreshold` guardado (o el usuario lo edita a mano), se usa **ese**
  umbral y el target se deriva con `resolveCompactionTarget(threshold)`
  (comportamiento actual: umbral − 20, mínimo 30). **No** se aplica
  `policy.compaction.target` ni se vuelve a restar margen: no hay doble margen.
- **Cambiar de política en una conversación existente no resetea
  `compactionThreshold` (confirmado):** la política solo cambia los presupuestos
  de memoria/resumen y el modo en la UI. El umbral sigue siendo editable de
  forma independiente (Clarificación #2).
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
- **Hint en la UI (no bloqueante, confirmado):** en el desglose, `deep` muestra
  "para aprovechar más memoria, activa embeddings" (enlace al gestor de
  proveedores)
  **sin** invadir ese gestor ni cambiar su configuración (Clarificación #1).

#### 6. Resumen

- `generate-summary` usa el **mismo retrieval que el chat**: léxico o híbrido
  según la configuración de embeddings de S137, con el `summaryMemoryBudget` del
  plan como cap de la sección de memoria y **fallback léxico** si no hay
  proveedor de embeddings o falla. Sustituye `filterMemoriesForPrompt`, cerrando
  el deferido explícito de S136/S137.
- **Cap del resumen en `balanced`.** El cap `summaryMemoryBudget` aplica también
  en `balanced` (12 %, 256–2048), un cambio acotado frente al comportamiento
  actual (que inyectaba **todas** las memorias al resumen); se documenta y se
  mide en la eval.
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
  - `manifest.budget`: `{ window, outputReserve, memory, summaryOutput,
    summaryMemory, compactionThreshold, compactionTarget }` (valores resueltos del
    plan) para que la UI pinte el desglose sin recomputar.
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
- Override fino por sección (inputs numéricos) → diferido (Clarificación #4).
- Resumen jerárquico/multi-resumen.

### Clarificaciones confirmadas (2026-11-28)

Confirmadas por el usuario al aprobar el RFC; priman sobre cualquier redacción
genérica de arriba:

1. **`deep` solo sugiere embeddings, nunca los activa.** La política no activa
   embeddings; en el desglose, `deep` muestra un **hint no bloqueante** hacia el
   gestor de proveedores (enlace + aviso), sin cambiar su configuración.
2. **Cambiar de política no resetea `compactionThreshold`.** La política solo
   fija el umbral/target por defecto para conversaciones nuevas; una conversación
   existente conserva su `compactionThreshold` guardado y el umbral editado a
   mano gana siempre.
3. **Ratios de `fast`/`deep` aprobados como punto de partida.** Se aprueban los
   valores propuestos en §1; la eval los calibra y, si hace falta, se ajustan
   antes de cerrar el slice.
4. **Overrides manuales por sección diferidos.** S138 solo ofrece las tres
   políticas; un input numérico de memoria/resumen por conversación queda
   diferido (ver Deferred).
5. **Cap de memoria del resumen también en `balanced`.** Se acepta
   `summaryMemory.ratio = 0.12, min = 256, max = 2048` en `balanced` como cambio
   acotado frente al comportamiento actual (que inyecta **todas** las memorias al
   resumen sin límite); se documenta y se mide en la eval.
6. **El prompt de resumen usa el mismo retrieval que el chat.** `generate-summary`
   usa el retrieval léxico o híbrido según la configuración de embeddings de
   S137, con `summaryMemoryBudget` y fallback léxico si no hay proveedor o falla.

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
  5. Sin ventana (`contextWindow: null`) → cada política usa su `fallback`
     (fast 256/128/256, balanced 512/256/512, deep 1024/512/1024) y no compacta
     (comportamiento actual).
  6. `generate-summary` con `deep` → la sección de memoria del prompt de
     resumen respeta `summaryMemoryBudget` y usa el retrieval (no
     `filterMemoriesForPrompt`).
- **Métricas:** tokens por sección vs cap (memoria, resumen), `estimatedInputTokens`
  vs ventana, overflow (nunca), orden estable entre dos ejecuciones, latencia
  (informativa) y recall/irrelevantes de los fixtures de S136 reutilizados.
- **Baseline:** comportamiento actual con `balanced` (constantes de hoy):
  `resolveMemoryBudget` y `preferredSummary` actuales. **La paridad del baseline
  excluye la sección de memoria del prompt de resumen**: el cap
  `summaryMemory` (12 %, 256–2048) es el **único** cambio documentado de
  `balanced`. La **selección de memoria del chat**, el **presupuesto de salida
  del resumen** y la **compactación** se registran como referencia y se exige
  igualdad exacta; la **sección de memoria del prompt de resumen** se mide
  aparte (tokens ≤ `summaryMemoryBudget`).
- **Umbral:** paridad exacta `balanced` = baseline (0 diffs) en selección de
  memoria del chat, presupuesto de salida del resumen y compactación — con la
  salvedad explícita de la sección de memoria del resumen, que no se exige
  idéntica; caps nunca superados; determinismo (misma salida en dos ejecuciones);
  los umbrales de S136/S137 (recall ≥ 0,8, irrelevantes ≤ 0,2) siguen en verde
  con `balanced`. Si `fast`/`deep` no mejoran la sección que prometen (más/menos
  memoria) en los fixtures, se recalibran los ratios antes de cerrar.

## Criterios de aceptación

- [ ] `context-policy.ts` en `shared` con `ContextPolicyId`, las tres políticas
      y `resolveContextBudget({ policy, contextWindow, workingWindow, maxTokens })`
      puro y determinista (aritmética entera), que llama a `resolveEffectiveWindow`
      y devuelve `window`/`outputReserve` resueltos y los `fallback` por política
      cuando no hay ventana.
- [ ] Migración `0023` añade `context_policy` con default `balanced` y backfill;
      test de migración (filas antiguas → `balanced`).
- [ ] `Conversation`/Drizzle/DTO/export/rama/plantilla propagan `contextPolicy`;
      un export antiguo importa `balanced`; `EXPORT_SCHEMA_VERSION` no cambia.
- [ ] `memory-retrieval`, `context-compaction` y `generate-summary` consumen el
      plan de `resolveContextBudget` y dejan de usar constantes sueltas; con un
      `compactionThreshold` explícito/guardado, el target se deriva con
      `resolveCompactionTarget` (sin doble margen), y sin umbral se usan
      `policy.compaction.threshold/target` tal cual.
- [ ] `generate-summary` usa el **mismo retrieval que el chat** (léxico o híbrido
      según S137, fallback léxico) con `summaryMemoryBudget` propio, no
      `filterMemoriesForPrompt`.
- [ ] Con `balanced` (o sin política) la selección de memoria del chat, el
      presupuesto de salida del resumen y la compactación son **idénticos** al
      comportamiento actual (tests de no-regresión; evals S136/S137 intactas); la
      sección de memoria del prompt de resumen queda acotada por
      `summaryMemoryBudget` (cambio confirmado, ≤ 12 %) y es la **única** sección
      excluida de la paridad.
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
| Shared | `resolveContextBudget` no existe; `ContextPolicyId`/`normalizeContextPolicy` no se exportan; `balanced` no iguala `resolveMemoryBudget` actual; `fallback` por política ausente con `contextWindow: null`. |
| Migración | `context_policy` no existe en el esquema; filas antiguas no quedan `balanced`. |
| Repositorio/entidad | `Conversation.contextPolicy` es `undefined`; `updateSettings` no persiste el campo; `ConversationDetail` no lo expone. |
| Retrieval | `resolveMemoryBudget` no respeta el plan (usa la constante 0.12 en vez de la política). |
| Compactación | `preferredSummary` no usa `summaryOutputBudget` de la política; el umbral default de `fast`/`deep` no aplica en conversaciones nuevas; con umbral explícito el target no usa `resolveCompactionTarget`. |
| Resumen | `generate-summary` sigue usando `filterMemoriesForPrompt`; no aplica `summaryMemoryBudget`. |
| Compiler/manifiesto | `manifest.budget`/`manifest.contextPolicy` no existen. |
| UI | Falta `context-policy-card.tsx`; `settings-panel` no manda `contextPolicy`; el preview no muestra el desglose. |
| Eval | `context-policy` eval falla: `balanced` difiere del baseline o un cap se supera. |

## Decisiones

Decisiones ya cerradas en el RFC y confirmadas el 2026-11-28:

- **Política como constantes puras + columna por conversación** (opción A), no
  `settings` ni KV.
- **`balanced` = comportamiento actual del chat y de la compactación** (ratios
  0.12 / 0.10 / 0.12, umbral 80/target 60), con el cap de memoria del resumen
  (12 %, 256–2048) como único cambio acotado y documentado; `fast`/`deep` son
  punto de partida calibrable en la eval.
- **La política reparte presupuesto y fija defaults de compactación; no toca
  modelo, reserva de salida ni modo de retrieval.**
- **Un único `resolveContextBudget`** como fuente de verdad del presupuesto,
  consumido por retrieval, compactación y resumen.
- **`generate-summary` usa el mismo retrieval que el chat** (léxico o híbrido,
  fallback léxico) y recibe `summaryMemoryBudget` propio (cierra el deferido de
  S136/S137).
- **`recentMessageCount`/`summaryFrequency` quedan obsoletos** y documentados;
  se conservan en BD/export por compatibilidad.
- **Los overrides manuales por sección quedan diferidos**; S138 solo ofrece las
  tres políticas.

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
  conversación) — no entra en S138 (Clarificación #4). Si se retoma: un override
  numérico por sección con precedencia sobre la política, viajando en
  export/rama/plantilla igual que `compactionThreshold`.
- **Calibración de ratios de `fast`/`deep`.** Los ratios aprobados en §1 son el
  punto de partida; la eval los fija. Si se ajustan, actualizar
  `context-policy.ts` y el desglose de la UI (son la misma fuente).
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
