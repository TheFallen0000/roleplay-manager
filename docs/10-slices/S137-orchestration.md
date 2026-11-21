# S137 — Orquestación con subagentes

**Estado:** Listo para empezar
**Rama:** `feat/S137-vector-retrieval`
**Base:** `master` (`1099fcc`)
**RFC:** `docs/10-slices/S137-progress.md` (**Aprobado**)

## Propósito

Ejecutar S137 con el mismo reparto que S136: el orquestador lee, verifica,
lanza subagentes, revisa artefactos y commitea; **no implementa**.

> **Regla de oro:** el orquestador no escribe tests, código de producción,
> review, CHANGELOG ni documentación de contenido. Si un subagente falla, para
> y reporta; no lo sustituye.

## Decisiones ya cerradas

- Embeddings **desactivados por defecto**; sin configuración, S137 = S136
  (léxico puro).
- Default local **Ollama**; OpenAI-compatible es opt-in y muestra aviso de
  privacidad.
- Modelo de embedding **elegido por el usuario**; sin auto-detección.
- Configuración en **«Embeddings»** dentro del gestor de proveedores.
- Texto embebido: **`title + description`**; el actor se resuelve léxicamente.
- `text_hash` cubre el texto; provider/model/dimension se comparan aparte.
- Alcance: retrieval semántico de **memoria**; no RAG de mensajes/lorebooks.
- Sin dependencias nuevas ni extensiones nativas; coseno en JS.

## Mapa de sesiones

| Sesión | Agente | Trabajo | Artefacto |
| ------ | ------ | ------- | --------- |
| 0 | Orquestador | Preflight y rama limpia | Rama lista |
| 1 | `slice-test-architect` | Matriz de tests, fake de embeddings y plan de eval | `S137-test-plan.md` |
| 2 | `slice-test-author` | Tests rojos y fixtures de eval | Tests + fixtures |
| 3A | `slice-implementer` | Shared, puerto/adaptadores, migración, repositorio, servicio, híbrido, config/reindex | Código backend/shared |
| 3B | `slice-implementer` | Sección de embeddings, estado y reindexado | Código frontend |
| 3C | `slice-implementer` | Calibración de pesos/umbral contra la eval | Código backend |
| 4 | `slice-reviewer` | Review adversarial | `S137-review.md` |
| 5 | `slice-docs` | Slice doc, CHANGELOG y roadmap | Docs |
| 6 | `slice-release` | Release readiness | `S137-release.md` |
| 7 | Orquestador | Push, PR y merge con aprobación | PR |

## Stage 0 — Preflight

```sh
git status --short --branch
git fetch origin
git log --oneline -5
git log --oneline master..HEAD
pnpm check:arch
```

Confirma RFC aprobado, árbol limpio y rama sincronizada. No ejecutes la suite
completa todavía.

## Stage 1 — Test plan

Lanza `slice-test-architect`:

```text
Eres slice-test-architect para S137. Lee el RFC aprobado, el código de S136 y
los adaptadores de proveedor. Escribe SOLO docs/10-slices/S137-test-plan.md.

Cubre:
1. ProviderPort.embed? y EmbedRequest/EmbedResult; adaptadores Ollama
   (/api/embed) y OpenAI-compatible (/v1/embeddings) con fetch mockeado;
   adaptador sin embed no se rompe.
2. Migración 0022 memory_embeddings (PK memory_id, FK cascade, BLOB
   Float32Array, provider/model/dimension/text_hash, upsert/find/batch/
   listMissing/countStatus).
3. Servicio de embedding: L2 normalizado, hash de texto, invalidación por
   provider/model/dimension, timeout/fallo sin excepción al caller.
4. Híbrido: paráfrasis sin keywords → semantic; sinonimia parcial → hybrid;
   falsa proximidad no entra; sin embeddings = S136 bit-igual; orden estable y
   presupuesto intacto.
5. Config/reindex: settings sin secretos, reindex por lotes, estados
   indexed/missing/failed, no exportar vectores.
6. UI: sección Embeddings en proveedores, aviso remoto, estado y reindexar.
7. Eval: fake determinista sin red, sinónimos/paráfrasis, baseline S136,
   recall ≥ 0.8, irrelevantes ≤ 0.2, presupuesto y determinismo.
8. Casos límite: proveedor ausente, timeout, vector de dimensión distinta,
   memoria editada, cambio de modelo, borrado de memoria, conversación sin
   memorias, ventana desconocida.

No escribas tests ni código. Si una decisión cambia el alcance, párate y
repórtala.
```

## Stage 2 — Tests rojos

Lanza `slice-test-author`:

```text
Eres slice-test-author para S137. Lee el RFC y S137-test-plan.md. Escribe SOLO
tests y fixtures; no edites producción, docs, CHANGELOG ni el RFC.

Incluye un fake de embeddings determinista sin red (mapa de sinónimos) y tests
de:
- puerto/adaptadores (fetch mockeado),
- migración/repositorio (BLOB Float32Array),
- servicio de embedding (normalización, hash, fallo/timeout),
- retrieval híbrido (semantic/hybrid/falsa proximidad/fallback S136),
- manifiesto (embedding status),
- config/reindex (sin secretos, estados),
- UI (sección, aviso, reindexado),
- eval (paráfrasis, baseline, umbrales).

Ejecuta los comandos dirigidos y registra el rojo real (runtime/type/import).
No implementes APIs para que los tests pasen.
```

## Stage 3A — Backend/shared

```text
Eres slice-implementer para S137 (backend/shared). Implementa SOLO producción
en packages/shared/src/** y packages/backend/src/**, excluyendo tests y
fixtures.

Orden:
1. Tipos shared: embedding.ts, EmbedRequest/EmbedResult, MemorySelectionReason
   semantic/hybrid, embedding status del manifiesto.
2. ProviderPort.embed? opcional; adaptadores Ollama y OpenAI-compatible;
   errores de dominio; sin romper adaptadores existentes.
3. Migración 0022 y schema/repositorio memory_embeddings; serialización
   Float32Array; cascade.
4. Servicio de embedding (config, provider instance, L2, hash, timeout,
   best-effort) y reindexado por lotes.
5. Híbrido en selectMemoriesForPrompt: semanticScores opcional, pesos/umbral,
   motivos, orden/presupuesto S136.
6. Config settings + rutas/API de estado y reindex; manifiesto.
7. Export/import sin vectores.

No edites tests/docs/frontend. No añadas dependencias. Ejecuta tests dirigidos,
typecheck y eval; si un test es incorrecto, párate y repórtalo.
```

## Stage 3B — Frontend

```text
Eres slice-implementer para S137 (frontend). Implementa SOLO producción en
packages/frontend/src/**, excluyendo tests. No edites backend/shared/docs.

Incluye la sección «Embeddings» en el gestor de proveedores: proveedor,
modelo, aviso de privacidad para remoto, estado indexed/missing/failed y botón
de reindexado con progreso. Usa las claves i18n existentes o reporta las que
falten. Respeta 500 líneas, accesibilidad y aislamiento de features.
```

## Stage 3C — Eval

Solo si la eval no cumple:

```text
Eres slice-implementer para S137 (eval). Ajusta SOLO pesos/umbral/coseno en
producción dentro del RFC. No edites fixtures, tests, umbrales ni docs. Si tras
dos ajustes no se cumple, para y reporta; no relajes la eval.
```

## Stage 4 — Review

```text
Eres slice-reviewer para S137. Revisa el diff contra el RFC y el test plan:
puerto/adaptadores, migración, BLOB/normalización, lifecycle, híbrido,
manifiesto, config/reindex, UI, privacidad (texto de memoria a remoto), no
regresión de S136, eval no tautológica, capas/500 líneas/i18n.

Veredicto PASS/PASS WITH NOTES/BLOCKED con hallazgos por severidad y
archivo:línea. No edites código/tests/docs.
```

## Stage 5 — Docs

`slice-docs` actualiza `S137-progress.md`, `CHANGELOG.md` y el roadmap.
No debe tocar código/tests. El CHANGELOG va bajo `[Unreleased]`, en inglés.

## Stage 6 — Release audit

`slice-release` ejecuta `pnpm check`, backend/frontend tests, eval, build,
audit y `git diff --check`, y escribe `S137-release.md`. No push/merge/publish.
S137 no cambia packaging/lockfile/native, así que el dry-run de los cinco
targets no aplica en el slice; se hará en el PR de release si corresponde.

## Stage 7 — PR

Solo con aprobación explícita: push, PR en inglés, CI verde y squash merge.
La release batcheada es un `/release` posterior.

## Propiedad de archivos

| Agente | Puede editar | No puede editar |
| ------ | ------------ | --------------- |
| `slice-test-architect` | `S137-test-plan.md` | tests, código, RFC |
| `slice-test-author` | tests, fixtures, test-utils | producción, docs, CHANGELOG |
| `slice-implementer` | `packages/{shared,backend,frontend}/src/**` sin tests | tests, docs, CHANGELOG |
| `slice-reviewer` | `S137-review.md` si puede | código, tests, docs |
| `slice-docs` | `docs/**`, `CHANGELOG.md` | código, tests |
| `slice-release` | `S137-release.md` | código, tests, docs |
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

- **Red en tests:** prohibida; fake determinista de embeddings.
- **Bloqueo del envío:** el embedding es best-effort/lazy; timeout y fallback
  léxico siempre.
- **Privacidad:** remoto opt-in; aviso claro; sin texto/vectores en logs.
- **Invalidación:** texto + provider/model/dimension; un cambio de modelo no
  reutiliza vectores viejos.
- **BLOB:** endianness `Float32Array` y dimensiones; tests de round-trip.
- **Dependencias:** ninguna nueva; si aparece una, parar y pedir aprobación.
- **No regresión S136:** con embeddings desactivados, selección y orden
  bit-iguales.

## Mensaje de arranque

```text
Vamos a ejecutar S137 en la rama feat/S137-vector-retrieval. El RFC está
aprobado en docs/10-slices/S137-progress.md y el plan de orquestación en
docs/10-slices/S137-orchestration.md.

Regla estricta: tú eres el orquestador y NO implementas. No escribas tests,
código, review, CHANGELOG ni documentación de contenido. Lee, verifica, lanza
los subagentes en orden, revisa artefactos y commitea lo que produzcan. Si un
subagente falla o detecta una ambigüedad, para y repórtalo.

Empieza por Stage 0 y lanza slice-test-architect para S137-test-plan.md.
```
