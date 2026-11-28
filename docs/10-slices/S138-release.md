# S138 — Release readiness

**Veredicto:** **READY**
**Auditor:** slice-release
**Fecha:** 2026-11-28
**Rama:** `feat/S138-context-policies`
**Base:** `master` (`0676d0a`)
**HEAD auditado:** `c411ca2` (`docs(slice): close S138 and update changelog`)
**Diff:** 61 archivos, +6487 / −126 (17 commits, sin merges)

> **Alcance:** S138 introduce políticas de contexto por conversación
> (`fast`/`balanced`/`deep`) que reparten de forma determinista la ventana
> efectiva entre resumen, memoria, memoria-en-resumen y reserva de salida, con
> migración aditiva `0023_context_policy` (default `balanced`), un único
> `resolveContextBudget` como fuente de verdad consumido por
> `memory-retrieval`, `context-compaction` y `generate-summary`, el manifiesto
> con `contextPolicy` + `budget`, la UI (selector en Historia, desglose por
> sección y warnings) y una eval de políticas. `balanced` reproduce el
> comportamiento actual salvo el cap de memoria del resumen (cambio confirmado).
>
> **Sin release:** no hay bump de versión, ni tag, ni release publicada, y no hay
> cambios de `package.json`, `pnpm-lock.yaml`, workflows, packaging ni módulos
> nativos.

---

## 1. Checklist de gates

| # | Check | Comando exacto | Resultado | Estado |
| - | ----- | -------------- | --------- | ------ |
| 1 | Arquitectura + typecheck + lint | `pnpm check` | `check:arch` 7/7 (0 warnings); typecheck 5/5; lint 5/5; 0 errores | **PASS** |
| 2 | Tests backend | `pnpm --filter @workspace/backend test` | 184 archivos / 1284 tests, 0 fallos (6.60 s) | **PASS** |
| 3 | Tests frontend | `pnpm --filter @workspace/frontend exec vitest run` | 97 archivos / 524 tests, 0 fallos (17.73 s) | **PASS** |
| 4 | Evals backend | `pnpm --filter @workspace/backend eval` | 4 archivos / 113 tests, 0 fallos (228 ms) | **PASS** |
| 5 | Build | `pnpm build` | 4 tareas successful / 4 (shared, backend, frontend, website; 4/4 cacheadas) | **PASS** |
| 6 | Auditoría de dependencias | `pnpm audit --prod` | `No known vulnerabilities found` | **PASS** |
| 7 | Whitespace | `git diff --check` | Sin salida | **PASS** |
| 8 | Whitespace del diff | `git diff master...HEAD --check` | Sin salida | **PASS** |

### Salida relevante

```text
$ pnpm check
Architecture & code quality check
──────────────────────────────────

Frontend size (max 500 lines)  ✓ pass
Backend hexagonal (domain/application purity)  ✓ pass
Frontend lib/ agnostic of React/UI/zustand  ✓ pass
shared/ package purity  ✓ pass
Frontend lib/hooks agnostic of features  ✓ pass
Frontend dead files (no orphans)  ✓ pass
Frontend feature isolation (no cross-feature imports)  ✓ pass

Summary: 7/7 checks passed, 0 failure(s), 0 warning(s)

typecheck: Tasks: 5 successful, 5 total   (4 cached)
lint:      Tasks: 5 successful, 5 total   (4 cached)
```

```text
$ pnpm --filter @workspace/backend test
 Test Files  184 passed (184)
      Tests  1284 passed (1284)
   Duration  6.60s
```

```text
$ pnpm --filter @workspace/frontend exec vitest run
Not implemented: navigation to another Document

 Test Files  97 passed (97)
      Tests  524 passed (524)
   Duration  17.73s
```

```text
$ pnpm --filter @workspace/backend eval
 Test Files  4 passed (4)
      Tests  113 passed (113)
   Duration  228ms
```

```text
$ pnpm build
 Tasks:    4 successful, 4 total
Cached:    4 cached, 4 total
```

```text
$ pnpm audit --prod
No known vulnerabilities found
```

---

## 2. Comprobaciones de release

| Comprobación | Evidencia | Estado |
| ------------ | --------- | ------ |
| Sin bump de versión | `package.json` raíz sigue en `"version": "1.58.1"`; `package.json` no aparece en `git diff master...HEAD --name-only` | **PASS** |
| Sin cambios de lockfile/workspace | `git diff master...HEAD --stat -- package.json pnpm-lock.yaml pnpm-workspace.yaml` → sin salida | **PASS** |
| Sin cambios de workflows | `git diff master...HEAD --stat -- .github` → sin salida | **PASS** |
| Sin cambios de packaging / nativos / build | `git diff master...HEAD --stat -- packages/backend/build.mjs` → sin salida; no hay `binding.gyp`, `.node`, `sqlite-vec`, `onnx` ni deps nuevas en el diff | **PASS** |
| Dry-run de los cinco targets | **No aplica**: sin cambios de `package.json`, lockfile, módulos nativos ni packaging; no se lanzó `gh workflow run release.yml` | **N/A** |
| CHANGELOG bajo `[Unreleased]` | `CHANGELOG.md` añade 23 líneas en `[Unreleased]` (Added: políticas fast/balanced/deep + migración 0023 + selector/desglose); `1.58.1` intacto por debajo | **PASS** |
| Sin release ni tag | No se ejecutó bump, tag, push, merge ni publish; HEAD sigue en la rama del slice | **PASS** |
| Generated limpio | `git status --short` vacío antes y después de todos los gates; `packages/website/src/data/release.json` sigue en `1.58.1` y sin modificar. Único cambio posterior: este informe sin trackear | **PASS** |
| Secretos | Sin `.env`, tokens ni claves en el diff; grep de patrones (`BEGIN … PRIVATE KEY`, `ghp_`, `AKIA`, `sk-`, `api_key = "…"`) solo devuelve fixtures preexistentes fuera del diff | **PASS** |
| Slice doc | `S138-progress.md` `Estado: Completado`, con Verificación, Review, Deferred y Commits; su tabla de verificación coincide con esta auditoría | **PASS** |
| Review | `S138-review.md` **PASS WITH NOTES**, sin bloqueantes ni mayores; 3 menores + 3 nits resueltos en `7496d4f`, `885fc83` y `54488f7` | **PASS** |

### Contrato técnico del slice (verificado en el diff)

| Punto | Evidencia | Estado |
| ----- | --------- | ------ |
| Migración `0023` aditiva | `0023_context_policy.sql`: `ALTER TABLE \`conversations\` ADD \`context_policy\` text DEFAULT 'balanced' NOT NULL;` — sin `DROP`/`UPDATE` destructivo; backfill por `DEFAULT`. `meta/0023_snapshot.json` y `_journal.json` (`idx: 23`) añadidos | **PASS** |
| Test de migración | `migration-0023.test.ts` (131 líneas) verifica filas antiguas → `balanced`; `migration-0020.test.ts` ajustado (8 líneas) | **PASS** |
| Fuente única del presupuesto | `packages/shared/src/lib/context-policy.ts` (+182) con `ContextPolicyId`, `normalizeContextPolicy` y `resolveContextBudget`; consumido por `memory-retrieval`, `context-compaction` y `generate-summary` (constantes sueltas eliminadas) | **PASS** |
| Propagación | Entidad, Drizzle repo/schema, DTO (`ConversationDetail`), export/import, rama y plantilla de settings (+ diffs pequeños en cada use case) | **PASS** |
| API con enum | `conversation.routes.ts` +1 (`z.enum(["fast","balanced","deep"]).optional()`); `update-conversation-settings` normaliza y devuelve `INVALID_CONTEXT_POLICY` | **PASS** |
| Manifiesto / UI | `context.ts` (+14) con `budget`; `context-manifest-view.tsx` (+177/−126) pinta el desglose; nuevo `context-policy-card.tsx` (+91) y `use-historia-settings.ts` (+70); i18n `en.ts`/`es.ts` (+27 cada uno) | **PASS** |
| Eval de políticas | `context-policy.eval.test.ts` (+478) y `evals/fixtures/context-policy.ts` (+287); 4 archivos / 113 tests en verde | **PASS** |
| Límites de arquitectura | `check:arch` 7/7: sin archivos >500 líneas, sin imports cruzados entre features, `shared/` puro (sin React/Express/Drizzle/zod) | **PASS** |

---

## 3. Riesgos y notas (no bloqueantes)

1. **Caché de turbo.** `typecheck` (4/5), `lint` (4/5) y `build` (4/4) se
   releyeron de caché content-addressed sobre este mismo HEAD; `check:arch` sí
   se ejecutó fresco. El job **Checks** del PR correrá en frío y es el gate
   definitivo.
2. **`release.json` y build en frío.** Con `pnpm build` totalmente cacheado
   `fetch-release.mjs` no se ejecutó, así que `packages/website/src/data/release.json`
   no se reescribió y sigue commiteado en `1.58.1`. Si el CI en frío lo
   reescribe, debe **dejarse sucio** y lo restaura el orquestador (no se
   ejecutó `git checkout`/`git restore`).
3. **Hints preexistentes en el frontend.** `astro check` reporta 2 hints
   (`keyCode` deprecated en `message-input.tsx` y `document.execCommand` en
   `clipboard.ts`), ambos fuera de este diff y sin errores. El log
   `Not implemented: navigation to another Document` de la suite frontend es un
   aviso de jsdom, no un fallo.
4. **Warnings de build del website.** `Shiki … CSP` y `The collection "i18n"
   does not exist or is empty` son avisos de la config actual, no del slice.
5. **Paridad de `balanced`.** La únicidad del cap de memoria del resumen
   (12 %, 256–2048) frente al comportamiento previo está documentada y medida en
   la eval; es el único cambio esperado para conversaciones existentes.
6. **Limitaciones diferidas** (documentadas en `S138-progress.md`): overrides
   manuales por sección, calibración fina de `fast`/`deep`, el 80 explícito no
   distinguible del default legado y el tokenizer real (S139). Ninguna bloquea
   el release.

---

## 4. Siguiente paso

READY para que el orquestador, con aprobación explícita:

1. `git push -u origin feat/S138-context-policies`.
2. Abrir PR en inglés contra `master` (`feat(context): add fast/balanced/deep
   context policies with per-section budget` o similar) con alcance, migración
   0023, contratos de presupuesto, eval y notas del review.
3. Esperar el job **Checks** del workflow `CI` en verde (gate en frío).
4. Squash merge y borrado de rama.

**S138 no crea release ni tag.** Las entradas viven bajo `[Unreleased]` y la
publicación queda para el `/release` batcheado (minor → `1.59.0`), que moverá el
CHANGELOG y disparará `release.yml`. El dry-run de los cinco targets solo hará
falta si ese release batcheado toca packaging/lockfile/módulos nativos.

---

## 5. Comandos ejecutados (registro)

```sh
git status --short
git branch --show-current
git rev-parse HEAD
git rev-parse master
git log --oneline master..HEAD
git log --oneline master..HEAD --merges
git diff --stat master...HEAD
git diff --name-only master...HEAD
git diff master...HEAD --stat -- package.json pnpm-lock.yaml pnpm-workspace.yaml .github packages/backend/build.mjs
git diff master...HEAD -- packages/backend/src/infrastructure/database/migrations/meta/_journal.json
pnpm check
pnpm --filter @workspace/backend test
pnpm --filter @workspace/frontend exec vitest run
pnpm --filter @workspace/backend eval
pnpm build
pnpm audit --prod
git diff --check
git diff master...HEAD --check
```

Sin push, merge, tag, publicación, bump ni restauración de archivos. Informe
escrito únicamente en `docs/10-slices/S138-release.md`.
