# S131 — Alinear la compactación con la ventana de trabajo y pulir follow-ups de S130

**Estado:** Draft
**Inicio:** 2026-11-06
**Fin:** —

> `Draft` → `Aprobado` → `En progreso` → `Completado`.
> Solo el usuario cambia `Draft` a `Aprobado`.

## Descripción

Cierra los tres follow-ups de S130: (1) elimina la **doble reserva de salida** en
la compactación separando la ventana bruta del modelo de la ventana de trabajo
aplicada (columna nueva + ajuste de consumidores), (2) corrige el NIT-4 del hook
`useModelCapabilities` para que no envíe un `conversationOverride` vacío, y
(3) deja **diferido y medido** el coste de arranque del catálogo curado de
modelos (no se optimiza a ciegas). Sin cambios de prompt, sin features nuevas,
sin bump de versión ni CHANGELOG.

---

## RFC

### Problema

#### 1) Doble reserva de salida en la compactación

S130 hizo que «Aplicar detectado» escriba `workingWindow.workingWindow` en
`conversations.context_window`. Ese valor ya es **neto** de la reserva de salida
y de un margen de seguridad del 5 %:

```
outputReserve = min(requestedMaxTokens, modelMaxOutputTokens ?? requestedMaxTokens)
safetyMargin  = max(128, floor(contextWindow * 5 / 100))
workingWindow = contextWindow - outputReserve - safetyMargin   // ya neto
```

(`packages/shared/src/lib/model-capabilities.ts`, aritmética `computeWorkingWindow`;
«Aplicar detectado» lo persiste en `model-selector.tsx` / `context-window-card.tsx`).

Pero `ContextCompactionService`
(`packages/backend/src/application/services/context-compaction.service.ts`) sigue
tratando `conversation.contextWindow` como la **ventana bruta del modelo**:

- `needsCompaction` (`:93-104`): `threshold = window * compactionThreshold/100`,
  comparado contra `estimate.totalTokens`.
- `compact` (`:110-124`): `window = conversation.contextWindow`,
  `desiredOutput = maxTokens ?? 2048`, y luego resta `outputTokens` del
  presupuesto (`totalBudget - fixedTokens - outputTokens`, `:149-164`).
- `buildContext` (`:442-447`): `estimateContextTokens({ outputReserve: maxTokens ?? 2048,
  contextWindow: conversation.contextWindow })` — añade `outputReserve` a `totalTokens`.

`estimateContextTokens` (`packages/shared/src/lib/token-estimate.ts:48`) define
`totalTokens = inputTokens + outputReserve` y `contextPercent = totalTokens /
contextWindow * 100`. Como el valor guardado por S130 ya restó la salida, la
reserva se aplica **dos veces**: en el umbral y en el porcentaje mostrado.

Consumidores afectados (además de la compactación):

- `generate-summary.use-case.ts:156-161`: `transcriptBudget = max(512,
  (contextWindow ?? 8192) - summaryMaxTokens - SUMMARY_PROMPT_RESERVE)` — si
  `contextWindow` es neto, resta la reserva de salida del chat que el resumen no
  necesita.
- `get-prompt-context.use-case.ts:73-78` y `context-compiler.service.ts:117-124`:
  exponen `contextWindow` y `estimatedTotalTokens` con la misma doble reserva.
- Frontend: `context-usage-badge.tsx:25` calcula `used = inputTokens + draft +
  outputReserve` y `percent = used / metadata.contextWindow`; el badge repite la
  doble reserva vía `metadata.outputReserve` cuando `metadata.contextWindow` es neto.

La columna viene de la migración `0016_context_window.sql`
(`ALTER TABLE conversations ADD context_window integer;`); la mapea
`drizzle-conversation.repository.ts:45,83,219`; la propagan
`branch-conversation.use-case.ts:77,194`, `apply-settings-template.use-case.ts:165`,
`export-character.use-case.ts:283`, `import-character.use-case.ts:290` y
`packages/shared/src/types/export.ts:54,80`.

**Consecuencia observable:** una conversación que aplicó la ventana de trabajo
compacta ~`outputReserve` tokens antes de lo debido y muestra un porcentaje
inflado (ver ejemplo numérico más abajo). Es conservador (nunca desborda), pero
no es lo ideal; S130 lo dejó anotado como follow-up.

#### 2) NIT-4 — `conversationOverride` en `useModelCapabilities`

`packages/frontend/src/components/conversation/use-model-capabilities.ts:26-36`
construye `options.conversationOverride = { maxTokens: conversationMaxTokens }`
siempre que `conversationMaxTokens !== undefined` (incluido `null`).
`packages/frontend/src/lib/api/providers.ts:60-63` filtra `null`/no-positivos
(`typeof === "number" && > 0`) antes de montar la query. Resultado: el hook envía
un `conversationOverride: { maxTokens: null }` que la capa API descarta — sin
impacto funcional, pero con payload muerto y dos fuentes de verdad. El test
`model-selector.test.tsx:334` fija el caso válido
`conversationOverride: { maxTokens: 4_096 }`.

#### 3) Catálogo curado en el bundle

`packages/backend/src/infrastructure/adapters/secondary/model-catalog/curated-model-catalog.ts`
(529 538 B raw / 42 362 gzip / 28 151 brotli, 5 695 entradas) se importa
estáticamente desde `app-container.ts:10` y se inyecta como `curatedTable`
(`:587`). Hechos medidos (Node 24.22.1, Linux, local):

- `dist/server.mjs`: 4 314 992 B raw / 786 103 gzip / 562 091 brotli.
- Metafile esbuild: catálogo = 529 538 de 4 865 646 B de input (10,9 %, el mayor
  input aislado). Otros pesados: `mime-db` ~199 KB, zod, openai.
- Arranque controlado (5 runs): normal mediana 259,1 ms vs módulo vacío 250,8 ms
  → delta ~8,3 ms (~3,2 %); RSS en "Server listening" ~153,5 MB vs ~146,9 MB →
  ~6,6 MB. Built: 4 314 956 vs 3 793 608 B (521 KB raw / 43,6 KB gzip / 28,6 KB
  brotli de ahorro).

El catálogo se necesita en la primera resolución de capacidades / apertura del
diálogo, no en el arranque, pero `app-container` lo importa ansiosamente.

### Restricciones

- **Sin cambios de prompt ni features nuevas**; no tocar ensamblado, compilador
  de S129 ni política de compactación (más allá de la corrección de la doble
  reserva). Sin bump de versión, tag, release ni `CHANGELOG`.
- **No romper a los usuarios de S130 que ya aplicaron una ventana de trabajo.**
  Sus filas guardan un valor neto en `context_window` **sin procedencia**: una
  ventana aplicada es indistinguible de una ventana bruta tecleada a mano. No hay
  forma de hacer backfill fiable. La política debe ser conservadora y explícita.
- **Sin reinterpretación silenciosa** de valores guardados.
- **Arquitectura hexagonal** (`domain/`/`application/` puros), pureza de
  `shared/`, límite de 500 líneas en frontend, sin archivos muertos,
  `pnpm check:arch`.
- **Compatibilidad** con export/import (`EXPORT_SCHEMA_VERSION = 1`), ramas,
  plantillas de settings y migraciones; las migraciones se copian en el
  empaquetado por `scripts/package.mjs:490`.
- **Slice ajustado:** cleanup, no rediseño.

### Opciones consideradas

| # | Opción | Ventajas | Costes | ¿Elegida? |
| --- | --- | --- | --- | --- |
| **A** | `contextWindow` = ventana **bruta** siempre; la ventana de trabajo aplicada se guarda en una columna nueva nullable (`working_window`). Compactación/prevista usan `working_window` cuando existe (ya neto) y caen a bruto + reserva en filas legacy. | Semántica no ambigua (bruto es bruto, neto es neto); `generate-summary` y el badge quedan correctos **sin tocarlos** (leen bruto); conserva el margen de seguridad del 5 % en applies nuevos; filas legacy = comportamiento actual (sin cambio). | Migración + columna; propagar por entidad/repo/DTO/use-cases/export/rama/plantilla. Superficie media. | **Sí** |
| **B** | Añadir una marca `contextWindowKind`/`contextWindowIsWorkingWindow`; seguir escribiendo la ventana de trabajo en `contextWindow` como hace S130; la compactación omite la segunda reserva cuando la marca está activa. | Superficie de esquema mínima (un booleano); conserva el UX actual del badge (muestra neto). | `contextWindow` pasa a significar dos cosas; la **ventana bruta se pierde** (no recuperable) y `generate-summary`/manifest que necesitan bruto quedan sub-presupuestados; toda lectura futura debe consultar la marca (fácil de olvidar). | No |
| **C** | Revertir «Aplicar detectado» para escribir la ventana **bruta**; `workingWindow` queda solo como sugerencia de UI (no se persiste). | Sin migración ni columna ni export; compactación actual ya es correcta con bruto; superficie mínima. | Cambia la semántica de Apply de S130; **pierde el margen de seguridad del 5 %** en el camino de compactación; deja las filas legacy netas permanentemente ambiguas (interpretadas como bruto para siempre). | No |
| — (descartada) | Quitar la segunda reserva globalmente (sin saber si el valor es bruto o neto). | Ninguna real. | Inseguro: tratar un neto como bruto sin reservar salida puede desbordar la ventana real del modelo. | No |

**Descarte explícito de B:** aunque S130 lo sugirió, B destruye la ventana bruta
(el único valor que `generate-summary` y el manifest necesitan como denominador
real) y obliga a cada consumidor presente y futuro a consultar la marca. A rompe
la ambigüedad de raíz: bruto y neto viven en columnas distintas con significado
fijo.

**Descarte explícito de C:** revierte Apply y descarta el margen de seguridad
(parte del valor de S130); además no resuelve la ambigüedad de las filas legacy
netas, solo la condena.

### Decisión

Se elige **A** (raw + `working_window`).

1. **Esquema.** Nueva columna nullable `working_window` en `conversations`
   (ver `Plan de migración` más abajo). `NULL` = «sin ventana de trabajo aplicada
   (o legacy sin procedencia)» → la fila se trata como bruto.

2. **Clasificación de filas existentes (política conservadora y explícita).**
   Todas las filas actuales tienen `working_window = NULL`, independientemente de
   si su `context_window` se tecleó a mano (bruto) o se aplicó con S130 (neto).
   Como no hay backfill posible, se tratan **como bruto**: la compactación
   reserva la salida una vez, que es **exactamente** el comportamiento actual
   (hoy la compactación ya trata todo como bruto y reserva una vez). Resultado:
   los usuarios de S130 que ya aplicaron una ventana **no cambian de
   comportamiento** (siguen con la doble reserva conservadora actual, porque su
   valor neto se sigue interpretando como bruto); no se les rompe nada ni se les
   reinterpreta silenciosamente el valor. Solo las aplicaciones **nuevas** pasan
   al comportamiento corregido (una única reserva).

3. **Aritmética exacta (antes/después).** Con bruto `R = 8192`,
   `maxTokens M = 2048`, `modelMaxOutputTokens = 4096`, umbral `T = 80 %`:

   - **Aplicación S130:** `outputReserve = min(2048, 4096) = 2048`;
     `safetyMargin = max(128, floor(8192·5/100)) = 409`;
     `workingWindow = 8192 − 2048 − 409 = 5735`.

   - **ANTES (hoy, con Apply = 5735 en `context_window`):**
     `threshold = 5735·0,8 = 4588`; `estimate.totalTokens = input + 2048`;
     dispara cuando `input + 2048 ≥ 4588` → `input ≥ 2540`. En `compact`,
     `totalBudget = 4588`, `outputTokens = 2048`, presupuesto de entrada =
     `4588 − 2048 = 2540`. Porcentaje: `round((input+2048)/5735·100)`; con
     `input = 4600` → `round(6648/5735·100) = 116 %`.

   - **DESPUÉS (A, con `context_window = 8192`, `working_window = 5735`):**
     la compactación usa `window = 5735` (neto) y **no** resta salida:
     `threshold = 5735·0,8 = 4588` (presupuesto de entrada); dispara cuando
     `input ≥ 4588`; `outputTokens = 2048` se **devuelve** al llamador pero no
     se resta del presupuesto; presupuesto de entrada = `4588`. Porcentaje:
     `round(input/5735·100)`; con `input = 4600` → `round(4600/5735·100) = 80 %`.

   - **Fila legacy bruto (`context_window = 8192`, `working_window = NULL`):**
     **sin cambio.** `threshold = 8192·0,8 = 6553,6`; dispara cuando
     `input + 2048 ≥ 6553,6` → `input ≥ 4505,6`; porcentaje
     `round((input+2048)/8192·100)`.

   El contrato completo y el ejemplo reproducido (con `systemTokens`,
   `minimumKeptTokens` y `summaryBudget` concretos) están en
   `Contrato y aritmética de compactación`, más abajo.

4. **Cambio por consumidor.**

   | Consumidor | Cambio |
   | --- | --- |
   | `context-compaction.service.ts` | Usar ventana efectiva (`working_window` si > 0, si no `contextWindow`); en `needsCompaction` comparar `totalTokens` con `threshold` donde `estimate` ya usa `outputReserve = 0` en modo neto; en `compact` no restar `outputTokens` del presupuesto cuando la ventana es neta (seguir devolviendo `outputTokens = desiredOutput`). |
   | `get-prompt-context.use-case.ts` | Pasar `contextWindow = workingWindow` y `outputReserve = 0` cuando hay ventana neta; si no, igual que hoy. El badge queda correcto sin cambios. |
   | `context-compiler.service.ts` (manifest) | `manifest.contextWindow` = ventana efectiva; `estimatedTotalTokens` sin sumar `outputReserve` en modo neto. |
   | `generate-summary.use-case.ts` | **Sin cambio de código**: lee `contextWindow` (siempre bruto en A), luego la fórmula `contextWindow − summaryMaxTokens − SUMMARY_PROMPT_RESERVE` queda correcta para applies nuevos; las filas legacy netas conservan el comportamiento actual (sin cambio). |
   | `estimateContextTokens` (`shared`) | **Sin cambio de firma**: los llamadores pasan `outputReserve = 0` y `contextWindow = workingWindow` en modo neto. Opcional: un helper puro compartido `resolveEffectiveWindow({ contextWindow, workingWindow, outputReserve }) → { window, outputReserve }` para no duplicar el ternario. |
   | Frontend `model-selector.tsx` / `context-window-card.tsx` | «Aplicar detectado» escribe `contextWindow = capabilities.contextWindow` (bruto) **y** `workingWindow = workingWindow.workingWindow`; teclear/preset limpia `workingWindow` a `null`; «Detectar» escribe bruto y limpia `workingWindow`. |

   **Invariante:** cualquier edición manual de `contextWindow` (teclear, preset,
   template, import sin `workingWindow`) deja `working_window = NULL`; solo
   «Aplicar detectado» (o un import/plantilla que lo traiga) escribe
   `working_window`.

5. **Item 2 (NIT-4).** Ajustar `use-model-capabilities.ts` para construir
   `conversationOverride` **solo** cuando `conversationMaxTokens` es un número
   finito **positivo** (`typeof === "number" && > 0`); en `null`/`undefined`/`0`/
   negativo se omite la clave (la capa API sigue filtrando como defensa en
   profundidad). Sin cambio de comportamiento para valores válidos (4 096 sigue
   enviándose). Opcional y no bloqueante: estrechar el tipo de
   `conversationOverride` en `providers.ts` a `{ contextWindow?: number; maxTokens?: number }`.

6. **Item 3 (catálogo).** **Deferir** (ver Deferred). El coste medido (~8,3 ms /
   ~6,6 MB RSS / ~3,5 % gzip del bundle) no justifica externalizar, dividir ni
   comprimir, dado el coste de empaquetado/resolución de rutas en los tres modos
   (`tsx` dev, bundle único `build.mjs`, app empaquetada `package.mjs`) y el
   fallback ante archivo ausente. La compresión necesitaría un descompresor en
   runtime y no elimina el coste de parseo.

### Fuera de alcance

- Tokenizer real por proveedor (sigue diferido en S133 / slice propio).
- Adoptar `workingWindow` en el **envío/continuación/regeneración** más allá de la
  compactación (solo se corrige la compactación + prevista, no `send/continue/regenerate`).
- Persistencia on-disk/BD del caché y auto-refresco del catálogo (deferidos en S130).
- Extraer/comprimir/dividir el catálogo curado (deferido aquí, con trigger).
- Cualquier cambio de prompt, de ensamblado o de la política de compactación
  (umbrales/target) — queda intacta salvo la corrección de la doble reserva.

---

## Plan de eval

Obligatorio: la compactación y el presupuesto de contexto son comportamiento a
fijar. Sin red.

**Fixtures deterministas** (todas sin red; entidad/repo mockeados como en S130):

1. **Migración y round-trip de repositorio.** Crear `Conversation` con
   `workingWindow = 5735` y `contextWindow = 8192`; leer de vuelta (`findById`)
   y verificar ambos campos; fila legacy (sin columna / `working_window = NULL`)
   se lee como `workingWindow = null`. `ConversationSettingsUpdate.workingWindow`
   se persiste y se borra con `null`.
2. **Compactación — normal (neta).** `contextWindow = 8192`, `workingWindow = 5735`,
   `maxTokens = 2048`, umbral 80 %: `needsCompaction` dispara en
   `input ≥ 4588` (no en `input ≥ 2540`); `compact` devuelve
   `outputTokens = 2048` y un presupuesto de entrada de 4588 (sin restar salida).
3. **Compactación — neta pequeña / defensiva.** `workingWindow` positivo pero
   pequeño (p. ej. `128`) → se respeta como presupuesto (umbral `128·0,8 = 102`,
   compacta agresivamente, no desborda); `workingWindow = 0`/negativo/`NaN` → el
   helper `resolveEffectiveWindow` cae a la ventana bruta (defensivo, sin crash);
   `workingWindow = null` → bruto. Los estados `degraded`/`infeasible` de S130 se
   producen en la capa de capacidades; «Aplicar detectado» ya está deshabilitado
   en `infeasible`, así que nunca se persiste `workingWindow ≤ 0`, pero la
   compactación debe ser robusta si llegara.
4. **Compactación — fila legacy (bruto).** `contextWindow = 8192`,
   `workingWindow = null`: números idénticos a los de hoy (umbral
   `input+2048 ≥ 6553,6`; presupuesto de entrada 4505). Aserción de **no
   regresión** respecto al comportamiento actual.
5. **Paridad prevista/envío.** Para la misma conversación, el `PromptContextDTO`
   de `get-prompt-context` y el `estimate` interno de la compactación reportan el
   mismo presupuesto efectivo (misma `window`, mismo `contextPercent`): con
   `input = 4600` neto → `contextPercent = 80` y `outputReserve = 0`.
6. **`generate-summary` con ventana neta.** No cambia `transcriptBudget` respecto
   a una fila bruta equivalente (lee `contextWindow` bruto); test que fija que el
   presupuesto de transcripción usa `contextWindow`, no `workingWindow`.
7. **UI apply/detect.** «Aplicar detectado» llama `onChange` con
   `{ contextWindow: 8192 (bruto), workingWindow: 5735 }` (no escribe neto en
   `contextWindow`); teclear/preset limpia `workingWindow` a `null`; «Detectar»
   escribe bruto y limpia `workingWindow`.
8. **NIT-4.** `buildOptions`/hook: `maxTokens = 4096` → envía
   `conversationOverride: { maxTokens: 4096 }`; `maxTokens = null`/`undefined`/`0`
   → **no** envía `conversationOverride` (test de regresión en
   `model-selector.test.tsx` y/o unitario del hook).
9. **Catálogo (medición, no cambio).** Registrar en la verificación el delta de
   arranque y RSS (o confirmar el baseline 8,3 ms / 6,6 MB) para dejar constancia
   del coste medido y el trigger de re-evaluación. No se exige mejora.

**Métricas:** presupuesto efectivo de entrada por fixture (exacto, aritmética
entera); `contextPercent` exacto; `outputTokens` devuelto; paridad prevista/envío;
cero cambios en el prompt (snapshots S129 intactos); cero regresiones en filas
legacy.

**Baseline:** comportamiento S130/actual (doble reserva: entrada 2540, porcentaje
116 % en el ejemplo; fila legacy sin cambio). Capturado con los tests existentes
de compactación y de `get-prompt-context`.

**Umbral:** 100 % de fixtures nuevos en verde; las filas legacy conservan
exactamente su comportamiento (aserciones de no-regresión); cero cambios de
prompt; `pnpm check`, build y `pnpm audit --prod` en verde.

**Comandos:**
- `pnpm --filter @workspace/backend test`
- `pnpm --filter @workspace/frontend exec vitest run`
- `pnpm check` (incluye `check:arch`, typecheck y lint)
- `pnpm build`
- `pnpm --filter @workspace/backend eval` (si aplica; hoy no hay tarea `eval`
  configurada para este paquete — confirmar antes de usarla).

---

## Criterios de aceptación

- [ ] Migración `0018_…` añade `working_window` (integer nullable) con snapshot y
      journal; `db:generate` + `db:migrate` correctos; `scripts/package.mjs` ya
      copia la carpeta completa de migraciones.
- [ ] `Conversation` (entidad) expone `workingWindow` (nullable, clamp) y el repo
      Drizzle lo mapea en `create`/`findById`/`updateSettings`.
- [ ] `ConversationDetail` y `ConversationSettingsUpdate` llevan
      `workingWindow?: number | null`; ruta/Zod de settings lo acepta
      (nullable, ≥ 0 o acotado por `MAX_CONTEXT_WINDOW`).
- [ ] La compactación usa la ventana efectiva: neta → no resta salida; legacy
      bruta → comportamiento idéntico al actual (no regresión).
- [ ] `get-prompt-context` y el manifest reportan ventana efectiva y porcentaje
      sin doble reserva; el badge del frontend muestra el porcentaje correcto.
- [ ] `generate-summary` sigue leyendo `contextWindow` bruto (sin cambio de
      comportamiento en filas legacy; correcto en applies nuevos).
- [ ] «Aplicar detectado» escribe bruto + `workingWindow`; teclear/preset/Detect
      limpian `workingWindow`.
- [ ] `use-model-capabilities` omite `conversationOverride` salvo con
      `maxTokens` positivo; caso válido (4 096) intacto.
- [ ] Export/import/rama/plantilla propagan `workingWindow` (campo opcional, sin
      bump de `EXPORT_SCHEMA_VERSION`).
- [ ] Sin cambios de prompt; snapshots S129 intactos; `pnpm check`, `pnpm build`
      y `pnpm audit --prod` en verde.

---

## Riesgos

- **Ambigüedad de filas legacy (sin procedencia).** No hay backfill posible; la
  política «NULL → bruto» preserva el comportamiento actual pero deja a los
  usuarios S130 con doble reserva (conservadora) indefinidamente hasta que
  re-apliquen. Es la opción segura; se documenta en la UI si hace falta (no en
  este slice).
- **Superficie de propagación.** `workingWindow` debe viajar por entidad, DTO,
  repo, use-cases, export/import, rama y plantilla; un olvido produce
  `working_window = NULL` silencioso (comportamiento legacy, no error).
- **Invariante de limpieza.** Una edición manual de `contextWindow` que no
  limpie `workingWindow` emparejaría un bruto nuevo con un neto viejo; hay que
  cubrirlo con tests de UI y de use-case.
- **Empaquetado/migraciones.** La migración debe quedar en `migrations/` (ya
  copiada por `package.mjs`); un `ALTER TABLE` no idempotente rompería la app
  empaquetada. Verificar dry-run si se tocara `package.mjs` (no previsto).
- **Doble reserva en otros puntos.** La corrección toca compactación + prevista;
  `send/continue/regenerate` quedan fuera (deferido) y pueden seguir reservando
  como hoy — comportamiento conservador, no roto.

---

## Red tests

- **Comando:** `pnpm --filter @workspace/backend test` y
  `pnpm --filter @workspace/frontend exec vitest run`.
- **Fallo esperado:** los tests nuevos importan `workingWindow` del contrato
  todavía inexistente (`Conversation`/`ConversationDetail` sin `workingWindow`,
  columna sin migrar) y la compactación no ramifica por ventana neta.
- **Salida relevante:** errores de tipo/propiedad ausente en
  `context-compaction.service.test.ts`, `drizzle-conversation.repository.test.ts`,
  `get-prompt-context` y en `model-selector.test.tsx` (NIT-4: el caso `null`
  sigue enviando override hasta implementar el ajuste).

---

## Decisiones

(Pendientes de implementación; se rellenan al cerrar el slice. La decisión de
RFC está arriba.)

## Verificación

- Tests: ...
- `pnpm check`: ...
- `pnpm build`: ...
- `pnpm audit --prod`: ...
- Release dry-run: ...
- Prueba manual: ...

## Review

- **Estado:** pendiente
- **Informe:** `docs/10-slices/S131-review.md`
- **Bloqueantes resueltos:** ...

## Deferred

- **Catálogo curado (item 3).** Deferido con impacto medido: ~8,3 ms de arranque
  (~3,2 %), ~6,6 MB RSS, ~43,6 KB gzip de bundle. **Trigger de re-evaluación:**
  (a) el catálogo crece significativamente (>2 MB raw / >150 KB gzip) o (b) se
  mide un arranque en la app empaquetada (disco frío/AV) que supera un presupuesto
  (p. ej. +50 ms / +30 MB RSS) o (c) se necesita sacar el catálogo del boot path.
  Si algún día se aborda: `import()` dinámico (chunk separado de esbuild) cargado
  en la primera resolución de capacidades, con fallback a catálogo vacío + warning
  si falta el archivo, y resolución de ruta coherente en `tsx`/bundle/app
  empaquetada. La compresión se descarta (descompresor en runtime sin eliminar el
  parseo).
- **Adoptar `workingWindow` en `send/continue/regenerate`** (más allá de la
  compactación) → slice posterior.
- **NIT-4 adicional (opcional):** estrechar el tipo `conversationOverride` en
  `providers.ts` a valores positivos no nulos (defensa en profundidad).
- **Tokenizer real por proveedor** → S133 (ya diferido en S130).

## Commits

1. `docs(slice): add S131 RFC`
2. `feat(backend): add working_window column and thread it through conversation`
3. `feat(backend): use effective window in compaction and prompt context`
4. `feat(frontend): apply raw window + workingWindow and clear on manual edit`
5. `fix(frontend): only send conversationOverride for a positive maxTokens`
6. `test(backend): cover migration round-trip, compaction math and preview parity`
7. `test(frontend): cover apply/detect and NIT-4 override`
8. `docs(slice): document S131`
