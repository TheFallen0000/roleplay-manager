# S137 — Release readiness

**Veredicto:** **READY**
**Auditor:** slice-release
**Fecha:** 2026-11-21
**Rama:** `feat/S137-vector-retrieval`
**Base:** `master` (`1099fcc`)
**HEAD auditado:** `7a0230d` (`docs(slice): update S137 commit log`)
**Diff:** 60 archivos, +8717 / −48

> Alcance: S137 añade retrieval semántico opt-in sobre memoria dinámica
> (embeddings + fusión híbrida con el retrieval léxico de S136), con fallback
> léxico y vectores derivados. No hay bump de versión, no hay release publicada
> y no hay cambios de packaging/lockfile/workflows/módulos nativos.

---

## 1. Checklist de gates

| # | Check | Comando exacto | Resultado | Estado |
| - | ----- | -------------- | --------- | ------ |
| 1 | Arquitectura + typecheck + lint | `pnpm check` | `check:arch` 7/7; typecheck 5/5; lint 5/5; 0 errores | **PASS** |
| 2 | Tests backend | `pnpm --filter @workspace/backend test` | 181 archivos / 1213 tests, 0 fallos (5.83 s) | **PASS** |
| 3 | Tests frontend | `pnpm --filter @workspace/frontend exec vitest run` | 96 archivos / 513 tests, 0 fallos (15.79 s) | **PASS** |
| 4 | Eval de retrieval | `pnpm --filter @workspace/backend eval` | 3 archivos / 92 tests, 0 fallos (213 ms) | **PASS** |
| 5 | Build | `pnpm build` | 4 tareas successful / 4 (backend, frontend, shared, ui, website) | **PASS** |
| 6 | Auditoría de dependencias | `pnpm audit --prod` | `No known vulnerabilities found` | **PASS** |
| 7 | Whitespace | `git diff --check` (y `git diff master...HEAD --check`) | Sin salida | **PASS** |

### Salida relevante

```text
$ pnpm check
Architecture & code quality check
Frontend size (max 500 lines)  ✓ pass
Backend hexagonal (domain/application purity)  ✓ pass
Frontend lib/ agnostic of React/UI/zustand  ✓ pass
shared/ package purity  ✓ pass
Frontend lib/hooks agnostic of features  ✓ pass
Frontend dead files (no orphans)  ✓ pass
Frontend feature isolation (no cross-feature imports)  ✓ pass
Summary: 7/7 checks passed, 0 failure(s), 0 warning(s)

typecheck: Tasks: 5 successful, 5 total
lint:      Tasks: 5 successful, 5 total
```

```text
$ pnpm --filter @workspace/backend test
 Test Files  181 passed (181)
      Tests  1213 passed (1213)
```

```text
$ pnpm --filter @workspace/frontend exec vitest run
Not implemented: navigation to another Document
 Test Files  96 passed (96)
      Tests  513 passed (513)
```

```text
$ pnpm --filter @workspace/backend eval
 Test Files  3 passed (3)
      Tests  92 passed (92)
```

```text
$ pnpm build
 Tasks:    4 successful, 4 total
```

```text
$ pnpm audit --prod
No known vulnerabilities found
```

> **Nota de cache:** `turbo` reutilizó caché en typecheck, lint y build
> (`Cached: 5 cached`, `4 cached`). La caché es content-addressed sobre este
> mismo HEAD y `check:arch` sí se ejecutó fresco; aun así el CI del PR debe
> correr en frío y es el gate definitivo.

---

## 2. Comprobaciones de release

| Comprobación | Evidencia | Estado |
| ------------ | --------- | ------ |
| Sin bump de versión | `package.json` raíz en `1.58.1`; `git diff master...HEAD --name-only` no incluye `package.json` | **PASS** |
| Sin release publicada | `gh release list --limit 5` → última `v1.58.1` (2026-11-21T18:31:59Z); nada de S137 | **PASS** |
| Sin cambios de lockfile | `pnpm-lock.yaml` no aparece en el diff | **PASS** |
| Sin cambios de packaging / workflows / nativos | El diff no toca `.github/workflows/**`, scripts de packaging, `build.mjs` ni dependencias; no hay `sqlite-vec`/`onnx`/ANN | **PASS** |
| Dry-run de los cinco targets | **No aplica**: sin cambios de packaging, lockfile ni módulos nativos | **N/A** |
| Website | Único cambio: `packages/website/src/data/release.json` (snapshot `1.58.1`, solo metadatos de versión/assets) | **PASS** |
| CHANGELOG | Entradas S137 bajo `[Unreleased]` (Added/Changed/Fixed/Tests), en inglés; `1.58.1` intacto debajo | **PASS** |
| Slice doc actualizado | `S137-progress.md` `Estado: Completado`, con Verificación, Review, Deferred y Commits | **PASS** |
| Review | `S137-review.md` **PASS WITH NOTES**, sin bloqueantes ni mayores (6 menores: 1, 2, 3 y 5 resueltos en `dba2f5f` con tests; 4 y 6 aceptados) | **PASS** |
| Deferred documentados | O(2N) en `aggregateStatus`, race fire-and-forget, re-embedding automático, ANN nativo, RAG mensajes/lorebooks, `generate-summary`→S138, reranking, memoria entre conversaciones | **PASS** |
| Secretos | Sin claves reales en el diff; único match es el fixture `sk-secret-value` en `configure-embedding.use-case.test.ts` | **PASS** |
| Árbol de trabajo | `git status --porcelain` vacío tras ejecutar todos los gates; ningún generado sucio (`dist/` ignorado) | **PASS** |

### Contrato técnico del slice

| Punto | Evidencia | Estado |
| ----- | --------- | ------ |
| `ProviderPort.embed?` opcional | `domain/ports/provider.port.ts` líneas 19–22: `embed?`, `supportsEmbeddings?`; adaptadores existentes no lo implementan y compilan | **PASS** |
| Migración `0022` | `0022_memory_embeddings.sql`: PK `memory_id`, FK `ON DELETE cascade`, BLOB `vector`, `text_hash`, timestamps, índice único; `_journal.json` añade `idx: 22` (sin 0023) | **PASS** |
| Privacidad por defecto | `resolveEmbeddingConfig` devuelve `null` sin config → retrieval léxico puro (`enabled: false` en el DTO); remoto `openai-compatible` solo explícito, con aviso i18n «With a remote provider, memory text leaves the device.»; `hasApiKey` nunca expone la clave | **PASS** |
| Protección cross-origin | Las rutas nuevas `PUT/POST /api/settings/embeddings*` cuelgan detrás de `app.use("/api", buildApiOriginGuard(corsOrigin))` (`server.ts:93`) | **PASS** |
| Sin red en tests/eval | Fake determinista `test-utils/deterministic-embedding.ts` + `evals/fixtures/memory-vector-retrieval.ts` | **PASS** |
| No regresión S136 | `memory-retrieval.service.test.ts` y `memory-retrieval.eval.test.ts` verdes sin cambios de contrato; fallback bit-igual cubierto | **PASS** |

---

## 3. Riesgos y notas (no bloqueantes)

1. **Eval calibrada solo contra el fake determinista.** Los umbrales
   (`SEMANTIC_WEIGHT` 2.0, `SEMANTIC_THRESHOLD` 0.55) se validan con vectores
   sintéticos; con `nomic-embed-text`/`mxbai-embed-large` reales la separación
   puede diferir. Mitigado porque la feature es opt-in, degrada a léxico y no
   altera el presupuesto. Recomendado: observación manual tras el release.
2. **Caché de turbo en los gates.** `pnpm check` (typecheck/lint) y `pnpm build`
   se releyeron de caché. El CI del PR ejecutará en frío; no se considera
   bloqueante.
3. **`aggregateStatus` O(2N)** en `GET /api/settings/embeddings`: aceptado para
   el volumen actual, solo afecta a ajustes.
4. **Race fire-and-forget** al crear/editar memoria: el vector puede quedar una
   versión por detrás hasta que `textHash` o el reindex lo corrigen.
5. **Sin backfill de migración.** `0022` es aditiva y vacía: las instalaciones
   existentes solo obtienen vectores tras un reindexado manual (o el primer
   embed perezoso). La UI muestra `missing`, así que es visible.
6. **Cambio de modelo deja `dimension: null`** hasta el primer embed/reindex;
   durante esa ventana el híbrido se comporta como léxico. Documentado.
7. **Nit documental.** `S137-progress.md` lista 16 de los 17 commits del slice
   (falta el propio `7a0230d` «update S137 commit log»). No afecta al contenido
   ni al release; se puede corregir en el PR si se desea.
8. **`release.json`.** El snapshot commiteado ya apunta a `1.58.1`, la última
   release real. Si un build en frío lo reescribe, debe dejarse sucio y que el
   orquestador lo restaure.

---

## 4. Siguiente paso (PR)

READY para el Stage 7. El orquestador, con aprobación explícita:

1. `git push -u origin feat/S137-vector-retrieval`.
2. Abrir PR en inglés contra `master` con título conventional, por ejemplo
   `feat(memory): add opt-in semantic retrieval with hybrid lexical merge`, y
   cuerpo con alcance, privacidad, migración 0022, eval y notas del review.
3. Esperar el job **Checks** del workflow `CI` en verde (gate en frío de
   `pnpm check`, tests, eval, build y `pnpm audit --prod`).
4. Squash merge y borrado de rama.
5. **No** bump de versión ni publish aquí: S137 es una feature y entra en el
   próximo `/release` batcheado (minor → `1.59.0`), que moverá `[Unreleased]` y
   disparará `release.yml`. El dry-run de los cinco targets queda para el PR de
   release si ese release toca packaging/lockfile; S137 no lo requiere.

---

## 5. Comandos ejecutados (registro)

```sh
git status --porcelain=v1 -b
git log --oneline master..HEAD
git diff master...HEAD --stat
git diff master...HEAD --name-only
gh release list --repo TheFallen0000/roleplay-manager --limit 5
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
escrito únicamente en `docs/10-slices/S137-release.md`.
