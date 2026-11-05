# S129 — Compilador de contexto, manifiesto e inspector

**Estado:** Completado (pendiente de release batched)
**Inicio:** 2026-11-05
**Fin:** 2026-11-05

> `Draft` → `Aprobado` → `En progreso` → `Completado`.
> Solo el usuario cambia `Draft` a `Aprobado`.

## Descripción

Extrae la construcción del contexto a un compilador único, produce un
manifiesto legible por máquina y añade un banco de evaluación determinista.
No cambia la redacción del prompt para la misma entrada: cambia la capacidad de
**ver, comparar y probar** por qué el contexto enviado es el que es. Además,
corrige la resolución de la versión del personaje para que envío y preview
coincidan.

Es la base de S130 (ventanas de modelo), S132 (lorebook) y S133 (memoria v2).

## RFC

### Problema

Hoy el contexto se ensambla en dos sitios que ya divergen:

- `ChatEngine.prepareContext` resuelve resumen, mensajes, memorias, personaje
  del jugador y compactación antes de llamar al builder.
- `GetPromptContextUseCase` repite la resolución, pero **no ejecuta
  compactación**; el preview puede diferir del envío real.

Además:

- `PromptContextBuilderImpl` devuelve un único `systemPrompt` sin secciones
  identificables, sin tokens por sección y sin motivo de inclusión.
- Las memorias se inyectan sin límite y ordenadas por `priority asc`; no hay
  forma de ver cuánto ocupan ni cuántas se descartaron.
- Solo se inyecta el último resumen; el manifiesto no expone su rango.
- El estimador de tokens es heurístico y sus números no se desglosan por fuente.
- No existe un banco de evaluación de ensamblado: los tests cubren formato,
  pero no paridad preview/envío ni selección de fuentes.
- `chat.tsx` está en 497 líneas; cualquier inspector nuevo debe ir en componentes
  separados.

### Restricciones

- Arquitectura hexagonal: el compilador vive en `application/services/` y solo
  usa puertos; nada de Drizzle/Express dentro.
- No cambiar el texto del prompt ni el orden actual de secciones. La refactorización
  debe producir el mismo `systemPrompt` para los mismos inputs.
- No añadir tablas ni migraciones. El manifiesto es efímero en S129.
- Mantener `PromptContextDTO.systemPrompt` y `messages` para no romper frontend,
  adapters ni tests existentes. El manifiesto es aditivo y opcional.
- No tocar la política de compactación, el estimador ni los umbrales.
- Respetar el límite de 500 líneas por archivo en frontend.
- Los eval no pueden llamar a proveedores reales ni a red.

### Opciones consideradas

| Opción                                                 | Ventajas                                              | Costes                                                 | ¿Elegida? |
| ------------------------------------------------------ | ----------------------------------------------------- | ------------------------------------------------------ | --------- |
| A. Ampliar solo el preview con más metadata            | Barato, bajo riesgo                                   | Mantiene la duplicación y la divergencia preview/envío | No        |
| B. Extraer loader + compilador + manifiesto + eval     | Una sola fuente de verdad, base para memoria/lorebook | Refactor del camino crítico de chat                    | Sí        |
| C. Endpoint de inspección separado, sin tocar el envío | Aísla el riesgo                                       | El preview sigue divergiendo; duplica lógica           | No        |

### Decisión

Se elige **B** con patrón strangler y alcance read-only:

1. **`ConversationContextLoader`** centraliza la carga de conversación, versión
   de personaje, último resumen, mensajes posteriores, pendientes/excluidos,
   memorias filtradas y personaje del jugador.
2. **`PromptContextBuilder`** gana una variante `buildWithSections` que compone
   secciones ordenadas y devuelve también el `PromptContext` final. `build`
   sigue existiendo y devuelve exactamente el mismo string.
3. **`ContextCompiler`** recibe las secciones y los metadatos de selección y
   produce `{ context, manifest }`. No persiste, no compacta, no llama a
   proveedores.
4. **`ChatEngine.prepareContext`** y **`GetPromptContextUseCase`** usan el mismo
   loader y compilador. El envío compacta antes de compilar; el preview solo
   marca `compaction.needed` y `compaction.applied: false`.
5. **Inspector**: el preview muestra el manifiesto por secciones, con tokens
   estimados, incluidas/omitidas y motivo.
6. **Eval**: `packages/backend/evals/` con fixtures deterministas, runner de
   Vitest y snapshots del manifiesto. Se ejecuta en CI.

### Fuera de alcance

- Memoria vectorial, RAG, embeddings, facts/episodios/hilos (S133).
- Catálogo de modelos y detección de ventanas (S130).
- Lorebooks y activación por keywords (S132).
- Cambios de redacción del prompt, orden de secciones o política de compactación.
- Persistencia de manifiestos o tablas nuevas.
- Evaluación de calidad con modelos reales; S129 evalúa **ensamblado**, no prosa.
- Rediseño visual del preview; solo se añade el desglose.

## Plan de eval

**Ubicación:** `packages/backend/evals/`.

**Fixtures deterministas** (sin red, con factories existentes):

1. **Summary boundary:** mensajes anteriores al resumen quedan fuera; los
   posteriores y el pendiente entran.
2. **Memory priority/decay:** memorias elegibles entran en orden estable; las
   decaídas se cuentan como excluidas.
3. **Pending + OOC:** el mensaje pendiente entra al final; el OOC se filtra del
   historial previo sin alterar el resto.
4. **Compaction needed:** con `contextWindow` y umbral bajos, el preview marca
   `needed: true` y no persiste resumen; el envío sí compacta.
5. **No window:** `contextWindow: null` produce `needed: false` y no rompe el
   manifiesto.

**Métricas:**

- Presencia y orden de secciones del manifiesto.
- Tokens estimados por sección y total.
- Conteos de mensajes/memorias incluidas y excluidas.
- Paridad exacta del `systemPrompt` con el builder actual.
- Paridad preview/envío cuando no hay compactación.
- `compaction.needed` correcto cuando el umbral se supera.

**Baseline:** comportamiento actual del builder y del preview, capturado antes
del refactor en snapshots.

**Umbral:** 100% de fixtures en verde; cero cambios de texto en el prompt;
cero regresiones en tests existentes.

**Runner:** `pnpm --filter @workspace/backend eval`, con
`vitest.eval.config.ts` propio. CI lo ejecuta además de `pnpm check`.

## Criterios de aceptación

- [x] `ConversationContextLoader` centraliza la carga y no importa
      infraestructura.
- [x] `ContextCompiler` produce `{ context, manifest }` y no tiene efectos
      secundarios.
- [x] `ChatEngine.prepareContext` y `GetPromptContextUseCase` usan el mismo
      loader/compilador; no queda duplicada la selección de resumen, mensajes,
      memorias ni personaje del jugador.
- [x] `PromptContextBuilder.build` devuelve exactamente el mismo string que
      antes para los fixtures de paridad.
- [x] `PromptContextDTO` incluye `manifest` aditivo; los consumidores actuales
      siguen funcionando sin cambios obligatorios.
- [x] `GET /api/conversations/:id/context` devuelve el manifiesto; `/context/stats`
      mantiene su contrato actual.
- [x] El preview muestra secciones, tokens, incluidas/omitidas y motivo.
- [x] El manifiesto distingue `compaction.needed` de `compaction.applied`.
- [x] Existe `packages/backend/evals/` con 5 fixtures y runner.
- [x] `pnpm --filter @workspace/backend eval` pasa y CI lo ejecuta.
- [x] Tests nuevos: compilador, loader, paridad preview/envío, ruta `/context`,
      componente de manifiesto.
- [x] `pnpm check`, tests, build y `pnpm audit --prod` en verde.
- [x] `CHANGELOG.md` actualizado bajo `[Unreleased]`.
- [x] Sin migraciones ni cambios de esquema.

## Red tests

- **Comando:** `pnpm --filter @workspace/backend test`
- **Fallo esperado:** módulos `conversation-context-loader.service` y
  `context-compiler.service` inexistentes; `buildWithSections` no existe;
  `manifest` no existe en el DTO; `ChatEngineDeps` sin `contextLoader`/
  `contextCompiler`.
- **Salida relevante:** `Test Files 4 failed | 119 passed (123)`,
  `Tests 5 failed | 709 passed (714)`. Los fallos son de contrato, no de
  aserciones débiles.
- **Eval:** `pnpm --filter @workspace/backend eval` falla con
  `Cannot find module '../src/application/services/conversation-context-loader.service'`.
- **Typecheck:** `TS2307` por módulos ausentes, `TS2339` por
  `buildWithSections`/`manifest` y `TS2554` por el constructor del use case.

## Decisiones

- **Loader y compilador como única fuente de verdad (read-only).** `send` y el
  preview comparten `ConversationContextLoader` y `ContextCompiler`; ninguno de
  los dos persiste, compacta ni llama a proveedores. El envío añade la
  compactación antes de compilar.
- **El builder particiona el `systemParts` existente.** `buildWithSections`
  reutiliza las mismas piezas y separadores que `build`, de modo que la salida
  de `build()` es byte a byte idéntica. La refactorización no cambia el prompt.
- **Manifiesto aditivo y efímero.** `PromptContextDTO.manifest` es opcional, no
  hay tablas nuevas ni migraciones y los consumidores actuales siguen
  funcionando sin cambios.
- **El preview marca `compaction.needed` con `applied: false`.** No compacta ni
  escribe resumen; el envío compacta primero y después compila, así que el
  manifiesto del envío puede diferir del preview cuando `needed` es `true`.
- **Las conversaciones quedan fijadas a `conversation.versionId`.** El envío
  anterior resolvía `currentVersion` y podía cambiar el prompt tras editar el
  personaje; el preview ya usaba la versión fijada. Es un arreglo intencional y
  se documenta en el CHANGELOG.
- **Eval determinista, sin red y con 5 fixtures.** Usa factories y fixtures
  propias, se ejecuta con Vitest en `packages/backend/evals/` y cubre frontera de
  resumen, prioridad/decaimiento de memorias, pendiente + OOC, compactación
  necesaria y ausencia de ventana.

## Verificación

- **Tests:** backend **731** tests (123 archivos); eval **33** tests; frontend
  **393** tests (69 archivos).
- **`pnpm check`:** en verde.
- **`pnpm build`:** en verde.
- **`pnpm audit --prod`:** en verde.
- **`pnpm check:arch`:** en verde.
- **Paridad de prompt:** el revisor comparó manualmente el builder plano antiguo
  con la salida seccionada nueva y es byte a byte idéntica. No se capturó un
  snapshot generado por la versión anterior (diferido).
- **Tests nuevos:** loader, compilador, paridad preview/envío, ruta `/context`,
  orden de secciones, manifiesto en frontend, conteos de excluidas y versión de
  personaje fijada.

## Review

- **Estado:** PASS WITH NOTES
- **Informe:** `docs/10-slices/S129-review.md`
- **Notas:** el snapshot pre-refactor no se materializó (deuda explícita); el eval
  de tokens reutiliza el estimador de producción; los fallbacks de
  `send-message`, `continue-conversation` y `regenerate-reply` construyen su
  propio loader/compilador cuando no reciben `ChatEngine`; el test de orden ya
  cubre todas las secciones.
- **Bloqueantes resueltos:** la versión de personaje fijada a la conversación se
  mantiene como cambio deliberado, con test de regresión y entrada en el
  CHANGELOG.

## Deferred

- Golden snapshot del builder anterior para fijar la paridad byte a byte.
- Tokenizer real por proveedor (hoy los tokens son estimaciones heurísticas) →
  S130/S133.
- Construcción duplicada de loader/compilador en los fallbacks de los use cases
  de respuesta.
- `summary.messagesAfter` es aproximado después de una compactación.
- Las aserciones de tokens del eval reutilizan el estimador de producción; el
  valor es informativo.
- Detección de ventanas por modelo → S130.
- Lorebook y activación → S132.
- Memoria estructurada/RAG → S133.
- Persistencia de manifiestos para auditoría histórica → evaluar después de S133.

## Commits

1. `docs(slice): add S129 RFC`
2. `chore(workflow): allow nested eval fixtures`
3. `test(backend): add S129 red tests and eval runner`
4. `feat(shared): add context manifest types`
5. `feat(backend): add context loader, compiler and manifest`
6. `test(backend): adapt context and chat tests to S129`
7. `feat(frontend): show context manifest in preview`
8. `test(frontend): cover context manifest view`
9. `test(backend): strengthen section order coverage`
10. `docs(slice): document S129`
