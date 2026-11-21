# S136 — Release readiness

**Fecha:** 2026-11-21
**Rama:** `feat/S136-structured-memory`
**Base:** `master` (`809bed7`)
**HEAD auditado:** `e15723b` (`docs(slice): close S136 and update roadmap`)
**Veredicto:** **READY para PR**. **No** es una release: no hay bump de versión ni
publicación.

## Alcance

S136 entrega memoria estructurada (`fact`/`episode`/`thread`), retrieval léxico
determinista con presupuesto de tokens, consolidación por `(actor, title)`,
detalle de selección en el manifiesto, UI de tipos y una eval propia. El diff
`master...HEAD` son 21 commits y 80 archivos (`6786` inserciones, `149`
borrados), incluidos los cuatro documentos del slice y la migración `0021`.

## Checks

| Check | Comando | Resultado |
| ----- | ------- | --------- |
| Arquitectura | `pnpm check` (`check:arch`) | 7/7, 0 warnings |
| Typecheck + lint | `pnpm check` (turbo) | 5/5 + 5/5 tareas |
| Tests backend | `pnpm --filter @workspace/backend test` | 171 archivos / 1139 tests |
| Tests frontend | `pnpm --filter @workspace/frontend exec vitest run` | 94 archivos / 506 tests |
| Eval | `pnpm --filter @workspace/backend eval` | 2 archivos / 52 tests |
| Build | `pnpm build` | 4/4 tareas (`FULL TURBO`, todo cacheado) |
| Auditoría | `pnpm audit --prod` | `No known vulnerabilities found` |
| Espacios/conflictos | `git diff --check` | Limpio (sin salida) |
| Árbol de trabajo | `git status --short` | Limpio |

Salida relevante:

- `pnpm check`: `Summary: 7/7 checks passed, 0 failure(s), 0 warning(s)`.
- Backend: `Test Files 171 passed (171)` · `Tests 1139 passed (1139)`.
- Frontend: `Test Files 94 passed (94)` · `Tests 506 passed (506)`.
- Eval: `Test Files 2 passed (2)` · `Tests 52 passed (52)`.
- Build: `Tasks: 4 successful, 4 total` (cache hit en los cuatro paquetes).
- Audit: sin vulnerabilidades de producción.

Los hints de typecheck del frontend (`keyCode` y `document.execCommand`
deprecados) son preexistentes, no errores ni warnings, y no afectan al slice.

## Empaquetado

- `git diff master...HEAD --name-only -- package.json pnpm-lock.yaml
  pnpm-workspace.yaml .github packages/*/package.json`: **sin salida**.
- Sin cambios en `package.json`, `pnpm-lock.yaml`, dependencias, workflows,
  módulos nativos ni `scripts/package.mjs`.
- Release dry-run de los cinco targets: **no aplica**. Si el guard-rail se
  activara por otra razón, el comando sería:

  ```sh
  gh workflow run release.yml --repo TheFallen0000/roleplay-manager \
    --ref feat/S136-structured-memory -f publish=false
  ```

  No se ha lanzado ni hace falta en este slice.

## Versión y release

- `package.json` sigue en **1.58.1**; sin bump en la rama.
- `CHANGELOG.md`: entradas de S136 bajo `## [Unreleased]` (Added, Changed,
  Fixed, Tests), en inglés.
- `git tag --points-at HEAD`: sin etiquetas. La release más reciente de GitHub
  sigue siendo **v1.58.1** (previa al slice); S136 no ha publicado nada.

## Documentación del slice

- `S136-progress.md`: `Estado: Completado`, con Verificación, Review, Deferred
  y Commits.
- `S136-review.md`: **PASS WITH NOTES**, sin bloqueantes ni mayores; el mayor de
  regenerate/continue se cerró con `5e881d8` + `d6858ff` + test `c19a7d9`; los
  menores y nits quedan resueltos o documentados.
- `S136-test-plan.md`: `Estado: Aprobado`, decisiones de §0 y umbrales de eval.
- `S136-orchestration.md`: plan de etapas; esta auditoría corresponde al Stage 6.
- `docs/15-card-first-ux-plan.md` y `docs/16-lorebook-versioning.md`
  actualizados con la renumeración S137/S138/S139.

## Riesgos y notas

1. **Lista de commits incompleta (menor, no bloqueante).** La sección `Commits`
   de `S136-progress.md` termina en `d6858ff` (19 entradas) y no incluye
   `590a756 docs(slice): add S136 review report` ni `e15723b docs(slice): close
   S136 and update roadmap`. Los dos existen en la rama; conviene añadirlos al
   cerrar el PR.
2. **Migración 0021.** Elimina `memories_title_unique` y crea
   `memories_conversation_actor_title_unique (conversation_id, actor, title)`,
   además de añadir `type` con `DEFAULT 'fact'` a `memories` y
   `memory_change_proposals`. Es segura porque el índice antiguo era más
   restrictivo (no puede haber duplicados que rompan el nuevo). El backfill
   sobre una base pre-0021 real no se prueba; se acepta el `DEFAULT` como nota
   (ver `Deferred`).
3. **Build cacheado.** `pnpm build` terminó con `FULL TURBO`: los cuatro
   paquetes venían de caché y no se re-ejecutó `fetch-release.mjs`. Si el build
   se ejecuta en frío, ese script puede reescribir
   `packages/website/src/data/release.json` (en el log cacheado consta
   `Saved release 1.58.0`); en ese caso hay que dejar el archivo sucio y el
   orquestador lo restaura, nunca `git checkout`/`git restore` desde este
   agente.
4. **Deferred documentados en `S136-progress.md`:** `generate-summary` con el
   filtro antiguo (→ S138), cobertura de backfill de la migración, complejidad de
   `selection`, retrieval vectorial/RAG (→ S137), políticas de contexto y UI del
   presupuesto (→ S138), tokenizer real (→ S139), contradicciones semánticas,
   memoria entre conversaciones y FTS5.
5. **Secretos.** Búsqueda de patrones de alto riesgo (`sk-*`, `ghp_*`, claves
   privadas PEM) sobre `packages/`: sin coincidencias. Sin `.env` ni archivos
   ignorados nuevos en el diff.
6. **Sin archivos generados sucios:** `git status --short` vacío tras ejecutar
   todos los checks.

## Siguiente paso

Stage 7 del plan: push de `feat/S136-structured-memory` y `gh pr create --base
master --head feat/S136-structured-memory` con título
`feat(memory): S136 structured memory and lexical retrieval`, body en inglés y
CI (`Checks`) verde antes del squash-merge. Requiere aprobación explícita; esta
auditoría no ha hecho push, merge, tag ni publish. La release batcheada queda
para un `/release` posterior.
