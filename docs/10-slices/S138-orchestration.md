# S138 — Orquestación con subagentes

**Estado:** Listo para empezar
**Rama:** `feat/S138-context-policies`
**Base:** `master` (`0676d0a`)
**RFC:** `docs/10-slices/S138-progress.md` (**Aprobado**)

## Propósito

Ejecutar S138 con el mismo reparto que S136/S137: el orquestador lee, verifica,
lanza subagentes, revisa artefactos y commitea; **no implementa**.

> **Regla de oro:** el orquestador no escribe tests, código de producción,
> review, CHANGELOG ni documentación de contenido. Si un subagente falla, para
> y reporta; no lo sustituye.

## Decisiones cerradas

- Políticas `fast`/`balanced`/`deep` por conversación; reparten presupuesto de
  memoria, resumen y memoria-en-resumen, y fijan el umbral/target de
  compactación por defecto.
- `balanced` conserva los valores actuales de memoria/compactación; el resumen
  gana un cap acotado (12 %, 256–2048), documentado como cambio.
- `context_policy` en `conversations` (migración 0023, default `balanced`),
  export/import/rama/plantilla.
- `resolveContextBudget({ policy, window, workingWindow, maxTokens })` puro en
  `shared/lib/context-policy.ts`.
- Un `compactionThreshold` guardado/explícito gana a la política; cambiar de
  política no lo resetea.
- El prompt de resumen usa el mismo retrieval que el chat (léxico o híbrido de
  S137, con fallback) y `summaryMemoryBudget`.
- `deep` solo muestra un hint de embeddings; no los activa.
- Sin overrides manuales por sección en S138; sin tokenizer (S139).

## Mapa de sesiones

| Sesión | Agente | Trabajo | Artefacto |
| ------ | ------ | ------- | --------- |
| 0 | Orquestador | Preflight y rama limpia | Rama lista |
| 1 | `slice-test-architect` | Matriz de tests y eval de presupuesto | `S138-test-plan.md` |
| 2 | `slice-test-author` | Tests rojos y fixtures | Tests + fixtures |
| 3A | `slice-implementer` | Shared, migración, entidad/repo, presupuesto, compactación, resumen, API | Código backend/shared |
| 3B | `slice-implementer` | Selector y desglose de presupuesto | Código frontend |
| 3C | `slice-implementer` | Calibración fast/deep con la eval | Código shared/backend |
| 4 | `slice-reviewer` | Review adversarial | `S138-review.md` |
| 5 | `slice-docs` | Slice doc, CHANGELOG y roadmap | Docs |
| 6 | `slice-release` | Release readiness | `S138-release.md` |
| 7 | Orquestador | Push, PR y merge con aprobación | PR |

## Stage 0 — Preflight

```sh
git status --short --branch
git fetch origin
git log --oneline -5
git log --oneline master..HEAD
pnpm check:arch
```

Confirma RFC aprobado, árbol limpio y rama sincronizada.

## Stage 1 — Test plan

Lanza `slice-test-architect`:

```text
Eres slice-test-architect para S138. Lee el RFC aprobado, S136/S137 y el código
actual de ventana/compactación/compilador/loader/settings. Escribe SOLO
docs/10-slices/S138-test-plan.md.

Cubre:
1. Shared: ContextPolicyId, políticas, normalizeContextPolicy,
   resolveContextBudget (ratios/clamps, ventana desconocida, precedencia).
2. Migración 0023 context_policy y backfill; entidad/repo/DTO/export/import/
   branch/apply-settings-template.
3. Compactación: umbral/target de política para nuevas, guardado gana, cambio
   de política no resetea, target/threshold actuales.
4. Memoria: memoryBudget por política; S136/S137 sin regresión; fallback.
5. Resumen: mismo retrieval que chat, summaryOutput/summaryMemory, sin doble
   reserva, cap de balanced.
6. Manifiesto: contextPolicy y budget resueltos.
7. UI: selector de política, desglose por sección, warnings, i18n es/en,
   accesibilidad.
8. Eval: ventanas 4k/8k/32k, muchas/pocas memorias, lorebook, summary,
   paridad balanced con baseline, fast/deep, overflow y determinismo.
9. Casos límite: ventana nula, política inválida, export antiguo, conversación
   existente con umbral manual, caps mín/máx, resumen sin memorias.

No escribas tests/código. Si una decisión cambia el alcance, párate y repórtala.
```

## Stage 2 — Tests rojos

```text
Eres slice-test-author para S138. Lee el RFC y S138-test-plan.md. Escribe SOLO
tests y fixtures; no edites producción, docs, CHANGELOG ni el RFC.

Incluye:
- shared/context-policy (tabla de ratios, clamps, ventana desconocida,
  precedencia, paridad balanced con las constantes actuales).
- migración 0023 (default/backfill, export antiguo).
- compactación (threshold/target, override guardado, cambio de política).
- memoria/summary budgets y selectores; generate-summary con el mismo retrieval.
- manifiesto (contextPolicy/budget), rutas y DTO.
- UI (selector, desglose, warnings, i18n).
- eval de presupuesto con fixtures 4k/8k/32k, memorias, lorebook y summary.

Ejecuta los comandos dirigidos y registra el rojo real. No implementes APIs para
que los tests pasen. No commitees.
```

## Stage 3A — Backend/shared

```text
Eres slice-implementer para S138 (backend/shared). Implementa SOLO producción
en packages/shared/src/** y packages/backend/src/**, excluyendo tests/fixtures.

Orden:
1. shared/lib/context-policy.ts: tipos, políticas, normalizeContextPolicy,
   resolveContextBudget puro.
2. Migración 0023 + schema/entidad/repositorio/DTO/export/import/branch/
   apply-settings-template.
3. memory-retrieval usa plan.memoryBudget.
4. context-compaction usa plan.summaryOutputBudget y threshold/target con
   precedencia del guardado.
5. generate-summary usa el mismo retrieval que el chat y summaryMemoryBudget,
   sin doble reserva.
6. context-compiler/manifest: contextPolicy y budget.
7. Rutas/update settings: INVALID_CONTEXT_POLICY, DTO.
8. i18n shared de la UI.

No edites tests/docs/frontend. No añadas dependencias. Ejecuta tests dirigidos,
typecheck, eval y check:arch.
```

## Stage 3B — Frontend

```text
Eres slice-implementer para S138 (frontend). Implementa SOLO producción en
packages/frontend/src/**, excluyendo tests. Incluye:
- Selector de política en el diálogo de Historia (componente propio).
- Desglose de presupuesto por sección leyendo manifest.budget.
- Warnings de cap/ventana desconocida, i18n es/en, accesibilidad.
- Hint de deep hacia embeddings, sin activar nada.

No edites backend/shared/docs. Respeta 500 líneas y aislamiento de features.
```

## Stage 3C — Calibración

Solo si la eval no cumple:

```text
Eres slice-implementer para S138 (eval). Ajusta SOLO ratios/clamps de fast/deep
en shared dentro del RFC; no edites tests/fixtures/umbrales. Si tras dos ajustes
no cumple, para y reporta.
```

## Stage 4 — Review

```text
Eres slice-reviewer para S138. Revisa diff contra RFC/test plan:
presupuesto único, paridad balanced, migración/export, compactación/precedencia,
memoria/summary, manifiesto, UI, i18n, no regresión S136/S137, eval no
tautológica, capas/500 líneas. Veredicto PASS/PASS WITH NOTES/BLOCKED con
hallazgos por severidad y archivo:línea. No edites código/tests/docs.
```

## Stage 5 — Docs

`slice-docs` actualiza `S138-progress.md`, `CHANGELOG.md` y roadmap. CHANGELOG
bajo `[Unreleased]`, en inglés. No toca código/tests.

## Stage 6 — Release audit

`slice-release` ejecuta `pnpm check`, backend/frontend tests, eval, build,
audit y `git diff --check`; escribe `S138-release.md`. No push/merge/publish.
S138 no cambia packaging/lockfile/native; dry-run no aplica en el slice.

## Stage 7 — PR

Con aprobación explícita: push, PR en inglés, CI verde y squash merge. La
release batcheada queda para `/release`.

## Propiedad de archivos

| Agente | Puede editar | No puede editar |
| ------ | ------------ | --------------- |
| `slice-test-architect` | `S138-test-plan.md` | tests, código, RFC |
| `slice-test-author` | tests, fixtures, test-utils | producción, docs, CHANGELOG |
| `slice-implementer` | `packages/{shared,backend,frontend}/src/**` sin tests | tests, docs, CHANGELOG |
| `slice-reviewer` | `S138-review.md` si puede | código, tests, docs |
| `slice-docs` | `docs/**`, `CHANGELOG.md` | código, tests |
| `slice-release` | `S138-release.md` | código, tests, docs |
| Orquestador | commits, PR, comandos | contenido de código/tests/docs |

## Gates

| Gate | Quién | Cuándo |
| ---- | ----- | ------ |
| RFC aprobado | Usuario | Hecho |
| Cambio de alcance | Usuario | Si el test plan/eval lo detecta |
| Tests rojos correctos | Orquestador | Antes de implementar |
| Tests/eval verdes | Orquestador | Antes de review |
| Review sin blockers/majors | Orquestador | Antes de docs/release |
| Push/PR/merge | Usuario | Stage 7 |
| Release | Usuario | `/release` posterior |

## Riesgos específicos

- **Paridad balanced:** memoria/compactación deben coincidir con las constantes
  actuales; el resumen cambia por el cap documentado.
- **Doble reserva:** el resumen no debe restar dos veces la reserva de salida.
- **Migración/export:** default/backfill y export antiguo → balanced.
- **Umbral manual:** cambiar de política no lo pisa.
- **Sin tokenizer:** los tokens siguen siendo estimados; no prometer precisión.
- **Sin dependencias nuevas.**

## Mensaje de arranque

```text
Vamos a ejecutar S138 en la rama feat/S138-context-policies. El RFC está aprobado
en docs/10-slices/S138-progress.md y el plan de orquestación en
docs/10-slices/S138-orchestration.md.

Regla estricta: eres el orquestador y NO implementas. No escribas tests,
código, review, CHANGELOG ni documentación de contenido. Lee, verifica, lanza
subagentes en orden, revisa artefactos y commitea lo que produzcan. Si un
subagente falla o detecta una ambigüedad, para y repórtalo.

Empieza por Stage 0 y lanza slice-test-architect para S138-test-plan.md.
```
