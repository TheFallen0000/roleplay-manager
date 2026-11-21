# S136 — Orquestación con subagentes

**Estado:** Listo para empezar
**Rama:** `feat/S136-structured-memory`
**Base:** `master` (`809bed7`)
**RFC:** `docs/10-slices/S136-progress.md` (**Aprobado**)

## Propósito

Este documento define cómo ejecutar S136 en una **sesión nueva** sin que el
orquestador acabe escribiendo tests, código, review, documentación o changelog.
El orquestador lee, verifica, lanza subagentes, revisa artefactos y commitea lo
que producen. Si un subagente falla, para y reporta; no lo sustituye.

La regla de oro:

> **El orquestador no implementa.** No escribe tests, código de producción,
> RFC, review, CHANGELOG ni documentación de contenido. Solo lee, ejecuta
> comandos de verificación, lanza subagentes y commitea sus artefactos.

## Estado de partida

- El RFC de S136 está aprobado y no requiere una nueva ronda de arquitectura.
- La rama solo contiene los dos commits del RFC; no hay código de S136.
- `master` incluye S135 y `v1.58.1`.
- El RFC propone una reordenación del roadmap: **S137 vector/RAG**, **S138
  políticas de contexto**, **S139 tokenizer**. `docs/15-card-first-ux-plan.md`
  todavía dice S137 contexto y S138 tokenizer; se corrige en la etapa de docs.
- Antes de empezar, sincroniza la rama con `master` sin reescribir historia
  publicada. Si hay commits nuevos en `master`, usa merge o rebase local y
  resuelve solo los conflictos de docs.

## Mapa de sesiones

| Sesión | Agente | Trabajo | Artefacto |
| ------ | ------ | ------- | --------- |
| 0 | Orquestador | Preflight, sincronización, estado limpio | Rama lista |
| 1 | `slice-test-architect` | Matriz de tests y plan de eval | `S136-test-plan.md` |
| 2 | `slice-test-author` | Tests rojos y fixtures de eval | Tests + fixtures |
| 3A | `slice-implementer` | Shared, dominio, migración, repositorio, retrieval, prompt, consolidación | Código backend/shared |
| 3B | `slice-implementer` | UI de tipos, filtros y preview | Código frontend |
| 3C | `slice-implementer` | Ajuste de scoring contra la eval (si hace falta) | Código backend |
| 4 | `slice-reviewer` | Review adversarial del diff | `S136-review.md` |
| 4F | `slice-test-author` / `slice-implementer` | Correcciones de la review | Tests/código |
| 5 | `slice-docs` | Slice doc, CHANGELOG y roadmap | Docs |
| 6 | `slice-release` | Auditoría de release readiness | `S136-release.md` |
| 7 | Orquestador | Push, PR, CI y merge (con aprobación) | PR |

No uses la misma sesión para dos etapas grandes. Si una etapa se alarga o el
contexto crece, empieza otra sesión con el RFC, el test plan y el diff actual.
Usa `sessionID` solo para continuaciones dentro de la misma etapa.

## Stage 0 — Preflight (orquestador)

```sh
git status --short --branch
git fetch origin
git log --oneline -5
git log --oneline master..HEAD
pnpm check:arch
```

- Confirma que el RFC sigue en `Estado: Aprobado`.
- Confirma que no hay cambios sin commitear ni archivos sueltos.
- Si `master` avanzó, integra los cambios en la rama y resuelve solo docs.
- No ejecutes todavía la suite completa; se hará en las etapas de verificación.

## Stage 1 — Test plan

Lanza `slice-test-architect` con este prompt:

```text
Eres slice-test-architect para S136. Lee el RFC aprobado en
docs/10-slices/S136-progress.md, el roadmap en docs/15-card-first-ux-plan.md y
el código actual de memoria/contexto:

- packages/backend/src/domain/entities/memory.entity.ts
- packages/backend/src/lib/memory-decay.ts
- packages/backend/src/application/services/conversation-context-loader.service.ts
- packages/backend/src/application/services/context-compiler.service.ts
- packages/backend/src/infrastructure/adapters/secondary/prompt-context-builder/prompt-context-builder.impl.ts
- packages/backend/src/application/use-cases/memory/
- packages/backend/src/infrastructure/adapters/secondary/drizzle/schema/memories.schema.ts
- packages/backend/src/infrastructure/database/migrations/
- packages/shared/src/types/memory.ts
- packages/shared/src/types/context.ts
- packages/frontend/src/components/conversation/memory-list.tsx
- packages/frontend/src/components/conversation/proposal-list.tsx
- packages/frontend/src/components/conversation/context-manifest-view.tsx
- packages/backend/evals/context-assembly.eval.test.ts
- packages/backend/evals/fixtures/

Escribe SOLO docs/10-slices/S136-test-plan.md. No escribas tests, código de
producción ni cambies el RFC.

El plan debe incluir:
1. Matriz por área: shared/domain, migración, repositorio, retrieval, manifiesto,
   consolidación, prompt/tool, export/import, UI y eval.
2. Archivos y nombres de test exactos, con el patrón del repo.
3. Fixtures necesarios y qué caso cubre cada uno.
4. Qué tests son runtime-red y cuáles type-red antes de implementar.
5. Casos límite: ventana desconocida, presupuesto mínimo/máximo, empate de score,
   memoria decaída, actor principal, keyword, thread, prioridad alta, duplicado
   exacto y migración con datos antiguos.
6. Plan de eval concreto: fixtures, escenarios, métricas, baseline y umbrales.
7. Comandos para ejecutar cada grupo de tests.

No inventes APIs que el RFC no pida. Si detectas una ambigüedad que cambia el
alcance, párate y repórtala en vez de decidirla.
```

El orquestador revisa que el plan cubra los criterios de aceptación y lo
commitea como `docs(slice): add S136 test plan`. Si el plan cambia el alcance,
para y pide aprobación.

## Stage 2 — Tests rojos

Lanza `slice-test-author` con este prompt:

```text
Eres slice-test-author para S136. Lee el RFC aprobado, S136-test-plan.md y el
código actual. Escribe SOLO tests que fallen y fixtures de test/eval. No edites
código de producción, docs, CHANGELOG ni el RFC.

Puedes crear/editar:
- packages/backend/src/**/*.test.ts
- packages/frontend/src/**/*.test.tsx
- packages/backend/evals/fixtures/**
- utilidades de test bajo packages/backend/src/test-utils/ o el equivalente
  frontend, si el plan las pide.

Sigue los patrones existentes (Vitest, Testing Library, fixtures de migración y
repositorio). Para APIs que todavía no existen, usa los casts o expectativas de
tipo que indique el test plan; no implementes la API. Ejecuta los comandos
dirigidos y registra el fallo rojo real. Si un test no puede expresarse sin una
decisión de producción, párate y repórtalo.

Entrega: archivos creados, comandos ejecutados, salida roja relevante y cualquier
hueco del test plan.
```

El orquestador verifica que los fallos son los esperados (no errores de sintaxis
ni imports rotos) y commitea como `test(backend): ...` / `test(frontend): ...`.
No corrige tests a mano.

## Stage 3A — Implementación backend/shared

Lanza `slice-implementer` con este prompt:

```text
Eres slice-implementer para S136 (backend/shared). Lee el RFC aprobado, el test
plan y los tests rojos. Implementa SOLO código de producción en
packages/shared/src/** y packages/backend/src/**, excluyendo *.test.ts y
packages/backend/evals/fixtures/**.

No edites tests, docs, CHANGELOG, frontend ni workflows. No añadas dependencias.
Trabaja en este orden:
1. Tipos shared (MemoryType, MemoryDTO, manifiesto, export/import).
2. Entidad Memory y validación de type.
3. Migración aditiva y schema/repositorio (índice por conversación+actor+título).
4. Retrieval léxico y presupuesto en application/domain.
5. Manifiesto y prompt (type visible, tool/fallback).
6. Consolidación por actor/título y resultado created/updated/discarded.
7. Export/import y rutas/DTOS.

Ejecuta los tests dirigidos después de cada área. No cambies un test para que
pase; si el test es incorrecto, párate y repórtalo. Si el RFC es ambiguo, no
inventes una decisión de producto: repórtala.

Entrega: archivos cambiados, tests que pasan/fallan, comandos y bloqueos.
```

## Stage 3B — Implementación frontend

Lanza `slice-implementer` con este prompt:

```text
Eres slice-implementer para S136 (frontend). Lee el RFC, el test plan y los
tests de UI. Implementa SOLO código de producción en packages/frontend/src/**,
excluyendo *.test.tsx, y consume las claves i18n que ya existan en shared.

No edites backend, tests, docs, CHANGELOG ni el RFC. No añadas dependencias.
Incluye: selector de tipo, badge, filtro, formularios de alta/edición y la
sección compacta de selección en el preview del manifiesto. Respeta 500 líneas,
aislamiento de features, accesibilidad y `prefers-reduced-motion`.

Ejecuta los tests dirigidos. Si un test de UI es incorrecto, párate y repórtalo.
Entrega: archivos cambiados, tests que pasan/fallan y bloqueos.
```

## Stage 3C — Ajuste de eval

Solo si `pnpm --filter @workspace/backend eval` falla después de 3A:

```text
Eres slice-implementer para S136 (eval). La eval de retrieval no cumple los
umbrales del RFC. Ajusta SOLO el scoring/entrada/presupuesto en código de
producción dentro de los límites del RFC. No edites fixtures, tests, umbrales ni
docs. Explica qué pesos cambiaste y por qué, y vuelve a ejecutar la eval.

Si después de dos ajustes razonables no se cumple el umbral, para y reporta la
discrepancia; no relajes la eval.
```

## Stage 4 — Review

Lanza `slice-reviewer` con este prompt:

```text
Eres slice-reviewer para S136. Revisa el diff de la rama
feat/S136-structured-memory contra master. Lee el RFC aprobado, el test plan,
la salida de la eval y el diff completo.

Comprueba:
- Contrato del RFC: tipos, migración, retrieval, presupuesto, manifiesto,
  consolidación, prompt/tool, UI y export/import.
- Calidad: capas hexagonales, pureza de shared, 500 líneas, aislamiento de
  features, i18n en/es y accesibilidad.
- Correctitud: orden estable, empates, decaimiento, ventana desconocida,
  presupuesto nunca superado, duplicados exactos y migración con datos antiguos.
- Tests: que cubran el comportamiento, no solo el camino feliz; que la eval no
  sea tautológica.
- Riesgos: prompt injection, fugas de datos, regresiones de contexto y de
  rendimiento.

Escribe docs/10-slices/S136-review.md si tienes permiso; si no, devuelve el
informe completo en tu respuesta. No edites código, tests, docs ni CHANGELOG.
Veredicto: PASS / PASS WITH NOTES / BLOCKED, con hallazgos por severidad y
archivo:línea.
```

El orquestador persiste el informe si el revisor no pudo escribirlo, sin
reescribir hallazgos. Si hay BLOCKER/MAJOR, envía correcciones al implementador
o al test author y pide una re-review del delta.

## Stage 5 — Docs y CHANGELOG

Lanza `slice-docs` con este prompt:

```text
Eres slice-docs para S136. Lee el RFC, el test plan, la review, la salida de la
eval y el diff implementado. Actualiza SOLO documentación:

- docs/10-slices/S136-progress.md: estado, decisiones, verificación, review,
  commits y deferred.
- CHANGELOG.md: entradas bajo [Unreleased], en inglés.
- docs/15-card-first-ux-plan.md: renumera S137 vector/RAG, S138 políticas de
  contexto y S139 tokenizer; ajusta referencias.
- docs/04-domain.md, docs/05-use-cases y PM-backlog solo si el RFC los cambia.

No edites código, tests, migraciones ni workflows. No inventes verificaciones:
usa los resultados reales que te pasen. No cierres el slice como Completado si
la review o la release audit no están verdes.
```

## Stage 6 — Release readiness

Lanza `slice-release` con este prompt:

```text
Eres slice-release para S136. Audita la rama feat/S136-structured-memory sin
push, merge, tag ni publish. Ejecuta:

pnpm check
pnpm --filter @workspace/backend test
pnpm --filter @workspace/frontend exec vitest run
pnpm build
pnpm audit --prod
pnpm --filter @workspace/backend eval
git diff --check

Escribe docs/10-slices/S136-release.md con veredicto READY/NOT READY, resultados
y riesgos. No edites código, tests, docs ni CHANGELOG. No publiques nada.
```

S136 no cambia packaging, lockfile ni módulos nativos, así que el packaging
dry-run de los cinco targets no es necesario en el slice. Se hará en el PR de
release (`/release`) si el guard-rail aplica.

## Stage 7 — PR

El orquestador, **después de aprobación explícita**:

```sh
git push -u origin feat/S136-structured-memory
gh pr create --base master --head feat/S136-structured-memory \
  --title "feat(memory): S136 structured memory and lexical retrieval" \
  --body-file /tmp/opencode/s136-pr.md
gh pr checks <number> --watch
```

El body del PR va en inglés y resume RFC, tests/eval, review y checks. El merge
se hace con squash y se pide aprobación antes. La release batcheada es un
`/release` posterior; no se publica desde este slice.

## Propiedad de archivos

| Agente | Puede editar | No puede editar |
| ------ | ------------ | --------------- |
| `slice-test-architect` | `docs/10-slices/S136-test-plan.md` | tests, código, RFC |
| `slice-test-author` | `*.test.ts`, `*.test.tsx`, `evals/fixtures/**`, test-utils | código de producción, docs, CHANGELOG |
| `slice-implementer` | `packages/{shared,backend,frontend}/src/**` (sin tests/fixtures) | tests, docs, CHANGELOG, workflows |
| `slice-reviewer` | `docs/10-slices/S136-review.md` (si puede) | código, tests, docs de contenido |
| `slice-docs` | `docs/**`, `CHANGELOG.md` | código, tests, workflows |
| `slice-release` | `docs/10-slices/S136-release.md` | código, tests, workflows |
| Orquestador | commits, PR, comandos de verificación | contenido de tests/código/docs |

## Gates

| Gate | Quién | Cuándo |
| ---- | ----- | ------ |
| RFC aprobado | Usuario | Ya hecho |
| Cambio de alcance o arquitectura | Usuario | Si el test plan o la eval lo detectan |
| Tests rojos correctos | Orquestador | Antes de implementar |
| Tests/eval verdes | Orquestador | Antes de review |
| Review sin blockers/majors | Orquestador | Antes de docs/release |
| Push y PR | Usuario | Stage 7 |
| Merge | Usuario | Tras CI verde |
| Release | Usuario | `/release` posterior |

## Verificación por etapa

```sh
# Tras los tests rojos
pnpm --filter @workspace/backend exec vitest run <archivos>
pnpm --filter @workspace/frontend exec vitest run <archivos>

# Tras la implementación
pnpm --filter @workspace/backend test
pnpm --filter @workspace/frontend exec vitest run
pnpm --filter @workspace/backend eval
pnpm check
pnpm build
pnpm audit --prod
```

No ejecutes `pnpm check` completo después de cada archivo; úsalo en los límites
de etapa. Durante la implementación, tests dirigidos.

## Paralelización

- **No** paralelices test-author e implementer: los tests son el contrato.
- **Sí** puedes separar 3A (backend/shared) y 3B (frontend) en sesiones
  distintas, pero 3B empieza cuando shared/types esté commiteado.
- Si ejecutas 3A y 3B en paralelo, usa worktrees distintos y una matriz de
  archivos disjunta; no compartas el mismo working tree.
- Review y docs no se paralelizan: docs necesita el veredicto de review.
- Release audit va después de docs.

## Nota de roadmap

El RFC mueve el roadmap a:

- **S136** memoria estructurada + retrieval léxico.
- **S137** retrieval vectorial/RAG y búsqueda híbrida.
- **S138** políticas de contexto fast/balanced/deep y UI de presupuesto.
- **S139** tokenizer real por proveedor.

`docs/15` todavía tiene S137 contexto y S138 tokenizer; la etapa 5 debe
corregirlo. No cambies la numeración en código ni en el CHANGELOG.

## Mensaje de arranque para la sesión nueva

Copia esto como primer mensaje de la sesión nueva:

```text
Vamos a ejecutar S136 en la rama feat/S136-structured-memory. El RFC está
aprobado en docs/10-slices/S136-progress.md y el plan de orquestación está en
docs/10-slices/S136-orchestration.md.

Regla estricta: tú eres el orquestador y NO implementas. No escribas tests,
código de producción, review, CHANGELOG ni documentación de contenido. Tu
trabajo es leer, verificar, lanzar los subagentes en el orden del documento,
revisar sus artefactos y commitear lo que produzcan. Si un subagente falla o
detecta una ambigüedad de alcance, para y repórtalo; no lo sustituyas.

Empieza por Stage 0 (preflight) y luego lanza slice-test-architect para el
S136-test-plan.md. No avances a tests rojos hasta que el plan esté commiteado.
```

## Definition of done de la orquestación

- [ ] `S136-test-plan.md` commiteado antes de los tests.
- [ ] Tests rojos commiteados con evidencia del fallo esperado.
- [ ] Implementación hecha por `slice-implementer`, no por el orquestador.
- [ ] Review independiente con veredicto y hallazgos resueltos.
- [ ] `pnpm check`, tests backend/frontend, build, audit y eval verdes.
- [ ] `S136-progress.md`, `CHANGELOG.md` y roadmap actualizados por `slice-docs`.
- [ ] `S136-release.md` con READY.
- [ ] PR abierto y mergeado solo con aprobación explícita.
- [ ] Sin bump de versión ni release en este slice.
