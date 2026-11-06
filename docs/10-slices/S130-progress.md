# S130 — Resolución de capacidades de modelo y ventana de trabajo segura

**Estado:** Draft
**Inicio:** 2026-11-05
**Fin:** —

> `Draft` → `Aprobado` → `En progreso` → `Completado`.
> Solo el usuario cambia `Draft` a `Aprobado`.

## Descripción

Introduce un **resolvedor de capacidades de modelo** que, para un modelo de chat
conocido (local u online), devuelve la ventana de contexto, el límite de salida
(`maxOutputTokens`), la identidad normalizada del modelo y la **procedencia +
confianza** de cada dato, y a partir de ahí calcula una **ventana de trabajo
segura** (`workingWindow`) que deja margen para la reserva de salida y un margen
de seguridad. Sustituye la detección puntual de S121 (solo Ollama, solo ventana)
por un sistema con precedencia determinista, caché local y override manual, y
muestra la sugerencia con su procedencia en el diálogo Modelo.

Es la continuación directa de S129: aquel dejó anotado «Detección de ventanas por
modelo → S130» y «Tokenizer real por proveedor → S130/S133». No cambia el prompt,
no toca el ensamblado del contexto y no reescribe la política de compactación.

## RFC

### Problema

Hoy la app solo conoce la **ventana de contexto** de un modelo y solo para
**Ollama**, con una detección de mejor esfuerzo (`S121`):

- `OllamaAdapter.getModelContextWindow` llama a `/api/show` y lee `num_ctx` o
  `*.context_length`. Es la **única** fuente en todo el sistema
  (`packages/backend/src/infrastructure/adapters/secondary/providers/ollama.adapter.ts:140-177`).
- `OpenAICompatibleAdapter` **no implementa** `getModelContextWindow`; para
  OpenAI-compatible la UI cae siempre a presets manuales
  (`openai-compatible.adapter.ts` no declara el método; el caso de uso devuelve
  `null` cuando el adaptador no lo expone —
  `get-provider-model-context.use-case.ts:29-31`).
- El contrato es pobre: `ModelContextResult` es `{ id, model, contextWindow }`
  (`packages/shared/src/types/provider.ts:16-21`) — no hay **límite de salida**,
  ni **procedencia**, ni **confianza**, ni identidad normalizada.
- `ProviderPort.getModelContextWindow?` devuelve solo `number | null`
  (`domain/ports/provider.port.ts:14`); no puede expresar «lo he deducido de una
  tabla con confianza media».
- El estimador es una heurística `chars/3` con margen 10 %
  (`packages/shared/src/lib/token-estimate.ts:7-14`); no hay tokenizer real.
- No existe el concepto de **ventana de trabajo segura**: la compactación y el
  indicador usan `contextWindow` como denominador y restan `maxTokens ?? 2048`
  como reserva (`context-compaction.service.ts:112`, `get-prompt-context.use-case.ts:66`),
  sin margen de seguridad determinista ni límite de salida del modelo.

Consecuencias observables:

1. Con un proveedor OpenAI-compatible (LM Studio, vLLM, OpenRouter, Groq) la
   ventana queda siempre «desconocida» y el usuario teclea un preset a ojo.
2. No hay forma de saber si un valor vino de una medición real o de una
   conjetura; dos fuentes en conflicto no se resuelven de forma predecible.
3. `maxTokens` puede superar el límite real de salida del modelo (no se conoce),
   y la ventana «útil» (entrada disponible) no se calcula con margen, así que
   un prompt puede quedar justo en el borde y romperse.
4. Cada apertura del diálogo Modelo re-detenta contra Ollama sin caché.

### Restricciones

- **Arquitectura hexagonal.** El resolvedor puro y la aritmética de la ventana de
  trabajo viven en código sin I/O (shared lib puro); los sondeos HTTP viven en
  adaptadores de infraestructura; el caso de uso orquesta. Nada de Drizzle/Express
  en dominio/aplicación, salvo la excepción `error-handler` ya documentada.
- **El resolvedor debe ser puro y testeable sin red.** Recibe los claims por
  inyección; nunca hace `fetch` ni lee disco/DB. La tabla curada se inyecta como
  dato. Ningún test puede llamar a un proveedor real.
- **No romper S121.** La ventana por conversación (`conversations.context_window`,
  migración `0016`) y `maxTokens` siguen siendo la fuente de verdad de cada
  conversación y el override de mayor precedencia. No se fuerza detección en la
  creación de una conversación.
- **No cambiar el prompt ni el ensamblado.** Ni `PromptContextBuilder`, ni el
  compilador/manifiesto de S129, ni la política de compactación se tocan en este
  slice; el compilador sigue consumiendo `conversation.contextWindow`.
- **`shared/` puro.** La tabla curada y el resolvedor no pueden importar
  `react`, `@astrojs/*`, `express`, `drizzle-orm`, etc. (`pnpm check:arch`). Si la
  tabla curada es grande y vive en backend, el resolvedor puro se reutiliza desde
  backend sin violar la regla.
- **Privacidad.** Nada de API keys, URLs de instancia con secretos ni contenido de
  conversación en el caché, la tabla curada, los DTO ni los logs. Solo nombres de
  modelo, números de capacidades, procedencia y timestamps.
- **Límite de 500 líneas** por archivo en frontend; el diálogo Modelo ya es grande
  (`model-selector.tsx` 436 líneas) → la sugerencia se extrae a componentes/hooks
  propios.
- **Compatibilidad de datos.** Export/import/ramas/plantillas ya llevan
  `contextWindow`; este slice no añade migraciones obligatorias ni cambia el
  esquema de export.
- **Sin dependencias pesadas ni descargas en runtime** de catálogos remotos
  (deferido).

### Opciones consideradas

| Opción | Ventajas | Costes | ¿Elegida? |
| ------ | -------- | ------ | --------- |
| A. Solo introspección del proveedor (ampliar S121 con `maxOutputTokens`) | Barato; usa lo que ya hay (`/api/show`) | Sigue sin cubrir OpenAI-compatible/OpenRouter; sin procedencia/confianza; sin tabla para modelos conocidos; sin ventana de trabajo | No |
| B. Tabla curada *vendida* (LiteLLM JSON) + sondeos runtime opcionales + precedencia | Offline, determinista, cubre online y local, sin red para modelos conocidos, precedencia explícita | Hay que vendorizar y refrescar un JSON (~miles de entradas); decisión de licencia; hay que documentar el refresco | **Sí** |
| C. Fetch remoto en runtime (models.dev / OpenRouter en cada resolución) | Datos siempre frescos | Red en el camino de configuración, depende de un tercero, latencia, sin offline, rate limits y cambios de esquema ajenos | No (deferido el fetch remoto automático) |
| D. Ampliar la tabla de BD con catálogo por modelo (migración) | Persistente y consultable | Migración + esquema + sincronización de datos; sobredimensionado para datos derivados y estáticos | No |

**Descarte explícito de C como mecanismo por defecto:** descargar catálogos en
runtime convierte una resolución determinista en una llamada de red frágil y
opaca; se conserva solo como **sondeo `provider-api` opcional** (OpenRouter) para
los casos en que la instancia lo expone, y el *auto-refresco* remoto queda
diferido.

### Decisión

Se elige **B**, con un resolvedor puro de precedencia y una capa fina de sondeo en
infraestructura:

1. **Tipos en shared** (`packages/shared/src/types/model-capabilities.ts`):
   `CapabilitySource`, `Confidence`, `ModelIdentity`, `ModelCapabilities`,
   `CapabilityClaim`, `WorkingWindow`. Son aditivos; no se modifica
   `ModelContextResult` (S121) salvo para que `GetProviderModelContextUseCase`
   delegue internamente en el resolvedor y siga devolviendo su contrato.

2. **Resolvedor puro en shared lib** (`packages/shared/src/lib/model-capabilities.ts`),
   sin I/O y sin dependencias:
   - `normalizeModelIdentity(provider, model, instanceId?)` → identidad
     normalizada (minúsculas, trim, alias/prefix matching: `qwen2.5:14b`,
     `gpt-4o-mini`, OpenRouter `vendor/model`, nombres locales).
   - `resolveModelCapabilities({ target, claims, curatedTable, heuristic, defaults, override })`
     → `ModelCapabilities` determinista.
   - `computeWorkingWindow({ contextWindow, outputReserve, modelMaxOutputTokens, requestedMaxTokens })`
     → `WorkingWindow` (ver fórmulas abajo).

3. **Fuentes y precedencia** (mayor gana):

   | Orden | `CapabilitySource` | Qué significa | Confianza por defecto |
   | ----- | ------------------ | ------------- | --------------------- |
   | 0 | `manual-override` | valor que el usuario guardó explícitamente (conversación/modelo/app) | `high` |
   | 1 | `runtime-introspection` | medición del servidor de modelo en ejecución (Ollama `/api/show`, vLLM `/v1/models` con `context_length`) | `high` |
   | 2 | `provider-api` | catálogo API del proveedor alojado (OpenRouter `/api/v1/models`: `context_length`, `top_provider.max_completion_tokens`) | `medium` |
   | 3 | `curated-table` | tabla vendida fuera de línea (LiteLLM `model_prices_and_context_window.json`) | `medium` |
   | 4 | `heuristic` | deducción por nombre (familia/tamaño: `qwen2.5:14b` → 32k) | `low` |
   | 5 | `default` | constante segura de último recurso | `low` |

   - **Por campo.** `contextWindow` y `maxOutputTokens` se resuelven
     **independientemente** a través de la cadena; el resultado registra
     `source` y `confidence` por campo. `confidence` global = la del campo
     `contextWindow` (campo primario).
   - **Empates/conflictos.** Dentro de la misma fuente se prefiere el match más
     específico (modelo exacto > prefijo de familia > alias); a igual
     especificidad, gana la entrada declarada antes (orden estable del array de
     claims / de la tabla). Entre fuentes no se promedia ni se confía en «el
     número mayor»: gana la fuente de mayor precedencia, siempre.

4. **Sondeos (infraestructura)** que producen `CapabilityClaim[]` y se inyectan al
   resolvedor:
   - **Ollama `/api/show`** (`runtime-introspection`): `num_ctx` (parámetro
     efectivo) > `*.context_length`; ya existe, se reutiliza y se convierte a
     claim con confianza `high`.
   - **OpenAI-compatible `/v1/models`** (`runtime-introspection`, oportunista):
     cuando el cuerpo expone `context_length`/`max_model_len` por modelo (vLLM,
     algunos servidores), se emite un claim; si no lo expone, no se emite nada y
     se sigue a la tabla.
   - **OpenRouter `/api/v1/models`** (`provider-api`): solo cuando la instancia
     `openai-compatible` apunta a `openrouter.ai`; se lee `context_length` y
     `top_provider.max_completion_tokens`, sin API key para el listado público.
   - **llama.cpp `/props`** y **models.dev**: **deferidos** (ver Deferred).
   - Se mantiene `ProviderPort.getModelContextWindow?` para no romper S121; se
     añade un método opcional `resolveCapabilities?(model)` que devuelve claims
     ricos. `GetProviderModelContextUseCase` se convierte en un caso de uso
     `GetModelCapabilitiesUseCase` que orquesta resolvedor + caché y que sigue
     pudiendo devolver el shape `ModelContextResult` para la UI antigua.

5. **Tabla curada vendida.** Snapshot de LiteLLM
   `model_prices_and_context_window.json` (MIT, salvo `enterprise/`; el JSON está
   en la raíz) bajo
   `packages/backend/src/infrastructure/adapters/secondary/model-catalog/`,
   cargado como dato e inyectado al resolvedor. Se documenta el comando de
   refresco (`pnpm --filter @workspace/backend catalog:refresh`, ver Deferred si
   se pospone la automatización) y la licencia. Se prefiere LiteLLM sobre
   models.dev por **forma de los datos**: ya trae `max_input_tokens` y
   `max_output_tokens` por entrada y `litellm_provider`, mientras que
   `models.json` de models.dev está orientado a catálogo/UX y requeriría más
   normalización. Ambos repos son MIT; la verificación final de licencia y del
   origen de los datos sigue siendo decisión abierta (no asumir licencias: los
   catálogos agregan datos de terceros).

6. **Ventana de trabajo segura** (shared lib, aritmética entera determinista):

   ```
   outputReserve = min(requestedMaxTokens, modelMaxOutputTokens ?? requestedMaxTokens)
   safetyMargin  = max(SAFETY_MARGIN_FLOOR, floor(contextWindow * SAFETY_MARGIN_NUM / SAFETY_MARGIN_DEN))
   workingWindow = contextWindow - outputReserve - safetyMargin
   ```

   Constantes: `SAFETY_MARGIN_NUM = 5`, `SAFETY_MARGIN_DEN = 100` (5 %),
   `SAFETY_MARGIN_FLOOR = 128`, `MIN_WORKING_WINDOW = 256`,
   `DEFAULT_OUTPUT_RESERVE = 2048` (reutiliza el valor ya presente en
   `get-prompt-context.use-case.ts` y `context-compaction.service.ts`).

   - `requestedMaxTokens` = `conversation.maxTokens` (clamped 1..200 000) o
     `DEFAULT_OUTPUT_RESERVE` si es `null`.
   - Si `modelMaxOutputTokens < requestedMaxTokens` → se recorta a
     `modelMaxOutputTokens` y se añade warning `OUTPUT_RESERVE_CLAMPED`.
   - Estado del resultado (`status`): `unknown` (sin `contextWindow`),
     `ok`, `degraded` (0 ≤ `workingWindow` < `MIN_WORKING_WINDOW`), o
     `infeasible` (`workingWindow` ≤ 0). **Nunca** se devuelve negativo: en
     `infeasible` se fija `workingWindow = 0` con warnings explícitos
     (`WORKING_WINDOW_NEGATIVE`, `OUTPUT_RESERVE_TOO_LARGE`). El llamador
     (UI/caso de uso) decide cómo actuar; no se envía un prompt con ventana
     `infeasible`.
   - El estimador/heurística actual sigue siendo la **base de conteo**; el
     tokenizer real por proveedor queda **deferido** (S133 o slice propio).

7. **Caché local** (clase `ModelCapabilitiesCache`, servicio de aplicación, sin
   I/O):
   - **Clave:** `string` = `<provider>:<instanceId?>:<normalizedModel>`.
   - **Valor:** `{ claim: CapabilityClaim, cachedAt }` (solo los claims de sondeo
     vivo: `runtime-introspection` y `provider-api`; la tabla/heurística/default
     son deterministas y no se cachean).
   - **TTL:** 15 min para claims de sondeo. `manual-override` nunca se cachea
     (se lee fresco de settings). La tabla curada se refresca con release
     (bump de versión), no por TTL.
   - **Invalidaciones:** refresco manual («Detectar»/«Aplicar detectado» hace
     bypass del caché y re-sondea); cambio de lista de modelos (entradas
     eliminadas se purgan); edición de una instancia (URL/name/API key) purga las
     entradas de ese `instanceId`; bump de versión del catálogo.
   - **Almacenamiento:** **en memoria** (`Map`), perdido al reiniciar (se
     re-sondea en el siguiente uso). Persistencia on-disk bajo `data/` y tabla de
     BD **deferidas**.
   - **Stale/no disponible:** si el claim cacheado expira y el sondeo falla, se
     sirve el claim expirado marcado `stale: true` con warning, o se cae a la
     fuente inferior; nunca se bloquea la resolución por red caída.
   - **Privacidad:** nunca API keys, URLs ni contenido; solo identidad de modelo,
     números, procedencia y timestamps.

8. **Override manual** (precedencia 0):
   - **Conversación:** `conversations.context_window` + `max_tokens` (ya existe,
     S121). Es el override de mayor precedencia y no se toca.
   - **Modelo y app:** tabla `settings` (KV ya existente), claves con namespace:
     `model_capabilities.override.default` (app) y
     `model_capabilities.override.model.<provider>[:<instanceId>]:<normalizedModel>`.
     El alcance por *provider instance* se pliega en la identidad de modelo (la
     clave openai-compatible incluye `instanceId`); un override por instancia
     dedicado queda deferido.
   - **Coexistencia con S121:** la sugerencia del resolvedor es el **valor por
     defecto para conversaciones nuevas**, mostrada en la UI pero **no
     persistida** hasta que el usuario la aplica. Un valor de conversación
     guardado **siempre gana** sobre la sugerencia. Cambiar de modelo **no pisa
     un valor manual**: el diálogo distingue «valor tecleado» (manual) de
     «valor detectado» (auto); solo los detectados se reemplazan al cambiar de
     modelo (estado del componente, sin migración de BD).

9. **UI/settings.** En el diálogo Modelo (`ModelSelector`) se muestra, junto al
   campo de ventana: la ventana resuelta, `maxOutputTokens`, la **procedencia**
   (`source`) y la **confianza**, y la **ventana de trabajo segura** sugerida, con
   un botón «Aplicar/usar detectado» que escribe en la conversación. Extraído a
   componentes/hooks propios para no agrandar `model-selector.tsx`. No cambia el
   texto del prompt ni el renderizado de mensajes.

### Fuera de alcance

- Memoria/RAG, lorebook y ensamblado del prompt (S133 / S132).
- **Tokenizer real por proveedor** — **deferido** con razón: hoy el conteo es una
  heurística portable sin dependencias; un tokenizer exacto exige embeker
  tokenizers por familia (tiktoken, SentencePiece, HF) y cambia el presupuesto de
  entrada. Queda anotado en Deferred → S133 o slice propio.
- Pricing/cost tracking y descargas automáticas de catálogos remotos en runtime —
  **deferidos**.
- Reconexión de la compactación para usar `workingWindow` en lugar de
  `contextWindow` como denominador: se entrega la aritmética y su exposición en
  la UI; adoptarlo en el camino de envío es un paso posterior (ver Deferred) para
  no tocar `send/continue/regenerate` en el mismo slice.
- Persistencia on-disk/BD del caché y auto-refresco del catálogo.

## Plan de eval

Obligatorio: la resolución de capacidades es determinista pero su precedencia,
caché y aritmética de presupuesto son el comportamiento que hay que fijar.

**Ubicación:** el resolvedor puro vive en shared, pero **shared no tiene runner
de tests** (`package.json` solo expone build/lint/format/typecheck). Para no
añadir un toolchain nuevo en este slice, sus tests se escriben en backend
(`packages/backend/src/application/...`) importando `@workspace/shared`, que ya
usa vitest; los tests de sondeos viven junto a los adaptadores
(`packages/backend/src/infrastructure/adapters/secondary/providers/`) y los de UI
en frontend (`packages/frontend/src/components/conversation/`). Sin red:
fixtures de sondeo HTTP con `fetch` mockeado; prohibido el `fetch` real. Añadir
vitest a shared queda como opción posterior, no como requisito de S130.

**Fixtures deterministas** (todas sin red):

1. **Precedencia por campo:** claims de `runtime-introspection`, `provider-api`,
   `curated-table`, `heuristic` y `default` para el mismo modelo; se comprueba
   que gana la fuente de mayor precedencia por campo y que `source`/`confidence`
   reflejan al ganador.
2. **Empate/conflicto en la misma fuente:** dos entradas curadas que matchean el
   mismo modelo; gana la más específica y, a igual especificidad, la primera en
   orden estable.
3. **Identidad/alias:** `qwen2.5:14b`, `gpt-4o-mini`, `openrouter/anthropic/claude-3.5-sonnet`,
   nombre local con espacios/uppercase → misma identidad normalizada que la tabla.
4. **Fallo de sondeo:** el sondeo HTTP lanza/timeout → se cae a la fuente
   inferior sin bloquear, con warning.
5. **Presupuesto/ventana de trabajo:** ventana normal (8192, reserve 2048) →
   `workingWindow = 8192 - 2048 - max(128, floor(8192*5/100))`; ventana pequeña;
   `maxTokens > modelMaxOutputTokens` → clamp + warning; `contextWindow` nulo →
   `unknown`; configuración donde la reserva no cabe → `infeasible` con
   `workingWindow = 0` y **sin negativos**.
6. **Redondeo determinista:** el margen 5 % usa `floor` de aritmética entera;
   se fija con casos borde (p. ej. 30 chars → 11 tokens en el estimador, y el 5 %
   no «baila»).
7. **Caché:** hit (no re-sondea), miss, expirado (re-sondea), invalidation por
   cambio de instancia/modelo, y `stale` servido cuando el re-sondeo falla.
8. **Override manual:** override de conversación gana al resolvedor; override de
   modelo gana al resolvedor pero pierde frente a conversación; «Aplicar
   detectado» escribe en la conversación sin pisar un valor tecleado.

**Métricas:**

- Ganador de precedencia correcto por campo (contextWindow y maxOutputTokens
  independientes).
- `source` y `confidence` correctos.
- `workingWindow` exacto (aritmética entera) para cada fixture.
- Nº de hits/misses de caché sin sondeo redundante.
- Cero llamadas de red en tests (aserto de que `fetch` no se invoca o se mockea).

**Baseline:** comportamiento actual (S121) — detección solo Ollama, `null` para
OpenAI-compatible, sin procedencia ni ventana de trabajo, sin caché. Capturado
con los tests existentes de `get-provider-model-context` y
`ollama.adapter.test.ts`.

**Umbral:** 100 % de fixtures nuevos en verde; cero regresiones en los tests
existentes; el contrato `GET /api/providers/:id/model-context` sigue respondiendo
`{ id, model, contextWindow }` para los consumidores actuales; cero cambios en el
prompt (snapshots de S129 intactos).

**Runner:** `pnpm --filter @workspace/backend test`,
`pnpm --filter @workspace/frontend exec vitest run` y `pnpm check` (incluye
`check:arch`). No existe `@workspace/shared test`; no se usa.

## Criterios de aceptación

- [ ] `ModelCapabilities`/`CapabilityClaim`/`WorkingWindow` tipados en shared y
      re-exportados.
- [ ] `normalizeModelIdentity` normaliza alias/prefix (`qwen2.5:14b`,
      `gpt-4o-mini`, OpenRouter `vendor/model`, nombres locales).
- [ ] `resolveModelCapabilities` es puro, determinista y resuelve cada campo con
      la precedencia `manual > runtime > provider-api > curated > heuristic > default`.
- [ ] Empates/conflictos en la misma fuente se resuelven por especificidad y
      orden estable.
- [ ] `computeWorkingWindow` produce `workingWindow` con aritmética entera, nunca
      negativo, con estados `ok/degraded/infeasible/unknown` y warnings.
- [ ] Ollama y OpenAI-compatible (vLLM) emiten claims de introspección; OpenRouter
      emite claim `provider-api` cuando la instancia lo es.
- [ ] La tabla curada (LiteLLM) está vendida y se inyecta como dato; licencia
      documentada.
- [ ] `ModelCapabilitiesCache` cubre hit/miss/stale/invalidation y nunca guarda
      secretos.
- [ ] El override manual (conversación/modelo/app) tiene precedencia y no rompe el
      `contextWindow` por conversación de S121.
- [ ] La sugerencia es el valor por defecto de conversaciones nuevas y un valor
      guardado siempre gana; cambiar de modelo no pisa un valor tecleado.
- [ ] La UI muestra ventana resuelta, `maxOutputTokens`, procedencia/confianza y
      ventana de trabajo con un botón «Aplicar/usar detectado».
- [ ] Sin migraciones de esquema ni cambios en export/import/ramas/plantillas.
- [ ] `GET /api/providers/:id/model-context` mantiene su contrato; el nuevo
      endpoint/caso de uso devuelve `ModelCapabilities`.
- [ ] Tests nuevos del resolvedor (ejecutados desde backend), de los sondeos y de
      la UI, todos sin red; `pnpm check`, build y `pnpm audit --prod` en verde.

## Red tests

> Pendiente: los tests aún no existen; el test-author los escribe en la fase de
> red tests. Comandos y fallos esperados previstos:

- **Comando:** `pnpm --filter @workspace/backend test` (incluye los tests del
  resolvedor compartido) y `pnpm --filter @workspace/frontend exec vitest run`
- **Fallo esperado:** módulos `model-capabilities` (shared lib y types) y
  `get-model-capabilities.use-case` inexistentes; `resolveCapabilities` no existe
  en `ProviderPort`; `computeWorkingWindow` no existe; `ModelCapabilitiesCache`
  inexistente; `ModelCapabilities` no está en el DTO del endpoint.
- **Salida relevante:** fallos de contrato (`Cannot find module ...`,
  `TS2307`/`TS2339`) y aserciones de precedencia/presupuesto aún sin implementar.

## Decisiones

(Pendiente — se rellena durante la implementación. Si cambia el RFC, aquí se
explica por qué.)

## Verificación

- Tests: ...
- `pnpm check`: ...
- `pnpm build`: ...
- `pnpm audit --prod`: ...
- Release dry-run: ...
- Prueba manual: ...

## Review

- **Estado:** pendiente
- **Informe:** `docs/10-slices/S130-review.md`
- **Bloqueantes resueltos:** ...

## Deferred

- **Tokenizer real por proveedor** (tiktoken/SentencePiece/HF) → S133 o slice
  propio; hoy el conteo sigue siendo la heurística `chars/3` de S121.
- **Adoptar `workingWindow` en la compactación y el camino de envío** como
  denominador (hoy usa `contextWindow`) → paso posterior, para no tocar
  `send/continue/regenerate` en el mismo slice.
- **models.dev** como fuente curada alternativa → se usa LiteLLM por forma de
  datos (input/output por entrada); ambos repos son MIT, pero queda pendiente
  revisar el origen/licencia de los datos agregados antes de vendorizar.
- **llama.cpp `/props`** como sondeo dedicado → se cubre oportunistamente vía
  `context_length` de `/v1/models` si el servidor lo expone.
- **Auto-refresco del catálogo remoto en runtime** y persistencia del caché
  on-disk/BD → evaluar tras S130 si el re-sondeo es un coste real.
- **Override manual por provider-instance dedicado** (hoy plegado en la identidad
  de modelo).

## Commits

1. `docs(slice): add S130 RFC`
2. `feat(shared): add model capabilities types and resolver`
3. `feat(shared): add safe working window math`
4. `feat(backend): vendor curated model catalog`
5. `feat(backend): add model capabilities resolver use case and cache`
6. `feat(backend): probe capabilities from ollama, vllm and openrouter`
7. `feat(frontend): show resolved capabilities and working window in model settings`
8. `test(shared): cover resolver precedence and budget math`
9. `test(backend): cover use case, cache and probes`
10. `test(frontend): cover capabilities suggestion UI`
11. `docs(slice): document S130`
