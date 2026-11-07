# S132 — Release checks

**Estado:** PASS WITH NOTES
**Fecha:** 2026-11-07
**Rama:** `feat/S132-sillytavern-cards`
**Base:** `master` (`0f4a821`)
**HEAD de rama:** `3913904 docs(slice): record S132 independent review`
**Slice:** character cards y lorebooks de SillyTavern (V1/V2/V3 JSON + PNG,
lorebooks embebidos y standalone, campos nativos y overrides de prompt).
**Auditor:** slice-release (read-only)

La auditoría no ha modificado código, tests, configuración ni git. Lo único
escrito es este informe. No se ha hecho push, merge, tag, bump de versión ni
publish.

---

## Checklist

- [x] `pnpm check` en verde (arch 7/7, typecheck 5/5, lint 5/5), repetido con
      `TURBO_FORCE=1` sin caché.
- [x] `pnpm --filter @workspace/backend test` en verde (149 archivos / 964 tests).
- [x] `pnpm --filter @workspace/frontend exec vitest run` en verde (80 archivos /
      435 tests).
- [x] `pnpm build` en verde (4/4 tareas).
- [x] `pnpm audit --prod` limpio (`No known vulnerabilities found`).
- [x] `git diff --check` limpio (árbol de trabajo y `master...HEAD`).
- [x] Sin bump de versión: `package.json` sigue en `1.57.2` en `master` y en el
      árbol de trabajo.
- [x] CHANGELOG sin cabecera de release nueva; las entradas S132 están solo bajo
      `[Unreleased]`.
- [x] Sin cambios de catálogo (committed ni worktree).
- [x] Sin cambios de `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`,
      `scripts/`, `.github/` ni dependencias.
- [x] Migración `0019_character_cards.sql` presente, con snapshot `0019` y
      entrada de journal `idx 19`; `scripts/package.mjs` copia la carpeta de
      migraciones.
- [x] Dry-run del workflow de release **no requerido** (sin packaging, módulos
      nativos ni dependencias).
- [x] Sin secretos, claves, tokens, `.env`, `.pem`, `.key` ni `.crt` añadidos.
- [x] Review independiente: **PASS WITH NOTES** (`docs/10-slices/S132-review.md`);
      R1–R9 listados abajo como notas no bloqueantes.
- [x] `docs/10-slices/S132-pr-body.md` existe, está en inglés y declara los
      límites de alcance (sin chats/JSONL, sin CHARX, sin bump de versión).
- [ ] Restaurar `packages/website/src/data/release.json` (lo hace el
      orquestador; no debe commitearse).
- [ ] Commitear/pushear el cierre documental que está en el árbol de trabajo
      (`CHANGELOG.md`, `README*`, docs de website, `S132-progress.md`,
      `S132-pr-body.md`).
- [ ] Actualizar el título del PR #136 (sigue con el título del RFC).
- [ ] Prueba manual de la app (import JSON/PNG, lorebook con presupuesto,
      overrides y modal `Crear`); no ejecutada en esta auditoría.

---

## Resultados

### 1. `pnpm check`

```text
$ pnpm check:arch && turbo typecheck && turbo lint
Summary: 7/7 checks passed, 0 failure(s), 0 warning(s)

Tasks:    5 successful, 5 total   (typecheck)
Tasks:    5 successful, 5 total   (lint)
```

Evidencia fresca (sin caché), porque la primera pasada replayó varios hits:

```text
$ TURBO_FORCE=1 pnpm check
@workspace/*:typecheck: cache bypass, force executing ...
Tasks:    5 successful, 5 total   Cached: 0 cached, 5 total   8.514s
@workspace/*:lint:     cache bypass, force executing ...
Tasks:    5 successful, 5 total   Cached: 0 cached, 5 total   7.789s
```

Los 7 checks de arquitectura pasan: tamaño de frontend, pureza hexagonal de
`domain`/`application`, `lib/` agnóstico, pureza de `shared/`, `lib/hooks`
agnóstico, archivos muertos e aislamiento de features. Único diagnóstico
preexistente: 1 hint en `packages/frontend/src/lib/clipboard.ts:26`
(`document.execCommand` deprecado), sin errores ni warnings.

### 2. `pnpm --filter @workspace/backend test`

```text
RUN  v5.0.5 .../packages/backend
Test Files  149 passed (149)
     Tests  964 passed (964)
  Duration  4.44s
```

Incluye `migration-0019.test.ts`, los tests de rutas de cards/lorebook, mapper,
PNG adapter, activación de lorebook, paridad send/preview y round-trips de
repositorio.

### 3. `pnpm --filter @workspace/frontend exec vitest run`

```text
RUN  v5.0.5 .../packages/frontend
Test Files  80 passed (80)
     Tests  435 passed (435)
  Duration  14.14s
```

### 4. `pnpm build`

```text
$ turbo build
Tasks:    4 successful, 4 total
Cached:   0 cached, 4 total
Time:     3.358s
```

Advertencias preexistentes, no bloqueantes: `no output files found` para
`@workspace/shared#build` (stub de tipos), Shiki/CSP en frontend y website,
`INEFFECTIVE_DYNAMIC_IMPORT` de `characters.ts`, y `collection "i18n" does not
exist or is empty` en website. El build del website refrescó
`packages/website/src/data/release.json` (ver Riesgos).

### 5. `pnpm audit --prod`

```text
No known vulnerabilities found
```

### 6. `git diff --check`

```text
$ git diff --check
(no output, exit 0)

$ git diff --check master...HEAD
(no output, exit 0)
```

### 7. Versionado, CHANGELOG y catálogo

- **Sin bump de versión.** `git show master:package.json` → `"version":
  "1.57.2"`; `package.json` del árbol de trabajo → `"version": "1.57.2"`.
- **Sin cambios de dependencias/paquete/lockfile.** Sin salida para:

  ```sh
  git diff --name-only master...HEAD -- scripts package.json pnpm-lock.yaml pnpm-workspace.yaml .github
  ```

- **CHANGELOG sin release nueva.** `git diff -- CHANGELOG.md` añade bullets
  (personajes, lorebooks, contexto, fixes B1/N2/I1) dentro de
  `## [Unreleased]`; no se crea ninguna cabecera `## [X.Y.Z]`. La entrada más
  reciente sigue siendo `## [1.57.2] - 2026-11-05`. Nota: `git diff
  master...HEAD -- CHANGELOG.md` está vacío porque el cierre documental aún no
  está commiteado (ver Riesgos).
- **Sin cambios de catálogo.** Sin salida para:

  ```sh
  git diff --name-only master...HEAD -- '*catalog*' '*catalogue*'
  git diff --name-only -- '*catalog*' '*catalogue*'
  ```

  El catálogo curado de modelos (`curated-model-catalog.ts`) y el catálogo de
  tutoriales no se tocan.

### 8. Migración `0019_character_cards.sql`

- **SQL** (`packages/backend/src/infrastructure/database/migrations/0019_character_cards.sql`,
  60 líneas): crea `lorebook_entries` (FK a `lorebooks` con `ON DELETE cascade`,
  índice `lorebook_entries_lorebook_idx (lorebook_id, order)`), crea `lorebooks`
  (FK a `characters` con cascade, `UNIQUE INDEX lorebooks_character_idx
  (character_id)`) y añade 16 columnas nullable a `character_versions`
  (`personality`, `scenario`, `mes_example`, `alternate_greetings`,
  `creator_notes`, `tags`, `creator`, `card_character_version`, `gender`,
  `pronouns`, `tagline`, `system_prompt`, `post_history_instructions`,
  `extensions`, `unknown_fields`, `unknown_root_fields`). Las columnas nuevas no
  llevan `NOT NULL` ni `DEFAULT`; no hay backfill.
- **Snapshot** (`meta/0019_snapshot.json`): `"version": "6"`,
  `"id": "6d289f2b-d81e-44a5-a4e8-c80f4d08f660"`,
  `"prevId": "45474005-f7a2-4c44-986a-221c227e4210"` (= `id` de
  `0018_snapshot.json`). Contiene `lorebooks`, `lorebook_entries`, sus índices,
  FKs y las columnas nuevas de `character_versions`.
- **Journal** (`meta/_journal.json`): entrada contigua a `0018_wet_absorbing_man`
  (`idx: 18`):

  ```json
  {
    "idx": 19,
    "version": "6",
    "when": 1794073028064,
    "tag": "0019_character_cards",
    "breakpoints": true
  }
  ```

  Sin duplicados de `idx` ni `tag`. La cabecera del journal pasa a
  `"version": "7"` (formato de Drizzle), con las entradas en `"version": "6"`.
- **Empaquetado:** `scripts/package.mjs:489-493` copia la carpeta completa de
  migraciones de forma recursiva (`cpSync(.../database/migrations,
  <app>/migrations, { recursive: true })`), así que `0019` entra sin tocar el
  script.

### 9. Empaquetado y dry-run de release

**El dry-run de release NO es necesario y no se ha lanzado.** El slice no cambia
`package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `scripts/`, `.github/`,
módulos nativos (`better-sqlite3`, `sharp`) ni la configuración del bundle. La
migración viaja por la carpeta que `package.mjs` ya copia.

Comando exacto que el orquestador lanzaría **solo si** decidiera verificar el
pipeline (no requerido):

```sh
gh workflow run release.yml --repo TheFallen0000/roleplay-manager --ref feat/S132-sillytavern-cards -f publish=false
```

### 10. Secretos y credenciales

Sin hallazgos:

```sh
git diff master...HEAD -G 'sk-[A-Za-z0-9_-]{20,}' -G 'ghp_[A-Za-z0-9]{20,}' \
  -G 'github_pat_' -G 'AKIA[0-9A-Z]{16}' -G 'xox[baprs]-' \
  -G '-----BEGIN [A-Z ]*PRIVATE KEY-----'
# (no output)

git diff master...HEAD --name-only -G 'sk-proj|sk-ant|AIza|glpat-|npm_[A-Za-z0-9]{36}|SG\.[A-Za-z0-9_-]{20,}|r2\.cloudflarestorage|CLOUDFLARE_API_TOKEN|CLOUDFLARE_ACCOUNT_ID'
# (no output)

git diff --name-only master...HEAD -- '*.pem' '*.key' '*.p12' '*.pfx' '*.env' '.env*' '*.crt'
# (no output)
```

Las coincidencias de `token` en el diff corresponden a `token_budget` /
`tokenBudget` del lorebook y a la documentación, no a credenciales. No se tocan
adaptadores de proveedores ni configuración de secretos; el contrato de export
sigue sin volcar settings/providers.

### 11. Review

**Estado: PASS WITH NOTES** (`docs/10-slices/S132-review.md`, revisado sobre
`88332d3`, `56b9496`, `c11b62a`, `5089592`). Sin bloqueantes ni importantes
pendientes. B1 (límite de 15 MB anulado por el parser global de 1 MB), I1
(metadatos de lorebook perdidos al editar), I2 (UI standalone), N1
(`lorebook.overBudget`), N2 (base64 estricto) y N5 (campos display-only) están
resueltos y cubiertos por tests.

Notas diferidas R1–R9 (no bloqueantes):

- **R1** — Falta el punto de entrada de lorebook standalone en el listado/menú
  contextual; solo está en la pestaña Lorebook del formulario.
- **R2** — La UI solo exporta lorebooks en CCv3; el endpoint `st-native` existe
  pero no se ofrece en el diálogo.
- **R3** — Los fallbacks de `description`/`first_mes` vacíos usan
  `translate("en", …)`, así que quedan en inglés para usuarios en español.
- **R4** — El formulario usa tres pestañas (Personaje/Tarjetas/Lorebook) frente
  a las dos del RFC.
- **R5** — Vaciar nombre y entradas del lorebook no persiste el borrado
  (`hasLorebookContent`).
- **R6** — `MAX_CARD_JSON_BYTES` solo se aserta en tests; producción usa
  `maxDecodedCardJsonBytes`.
- **R7** — `spec_version` de un lorebook CCv3 standalone se guarda en
  `unknownFields` del libro y se re-emite en `data`, no en la raíz.
- **R8** — `reorderEntries` no valida que los ids pertenezcan al lorebook del
  personaje.
- **R9** — `parseLorebookPayload` del frontend duplica `normalizeLorebook` del
  backend; el backend re-normaliza al guardar.

### 12. PR body

`docs/10-slices/S132-pr-body.md` existe, está en inglés y declara:

- **Sin chats/JSONL y sin CHARX** (línea 9 y §Scope boundaries).
- **Sin bump de versión** (líneas 9 y 143-145); la release se batchea en un PR
  `chore(release): vX.Y.Z` aparte.
- Overrides de card son compatibilidad, no port del prompt de ST; sin regex de
  usuario, timed effects, probabilidad, grupos ni `vectorized`; macros
  `{{char}}`/`{{user}}` verbatim (M1 no aprobado).
- Review final PASS WITH NOTES y notas R1–R9.

---

## Riesgos / notas

1. **`packages/website/src/data/release.json` sucio tras el build.** El build
   del website ejecutó `scripts/fetch-release.mjs` y subió el snapshot
   commiteado de `1.47.0` a `1.57.2` (48 líneas, solo versiones/URLs/tamaños de
   assets). No se ha restaurado (ni `git checkout` ni `git restore`, según el
   encargo): el orquestador debe restaurarlo y excluirlo del PR. Es un
   comportamiento preexistente y ajeno a S132 (ya visto en S130/S131).
2. **Cierre documental sin commitear.** `CHANGELOG.md`, `README.md`,
   `README.es.md`, las dos guías de `packages/website/.../characters-and-branches.md`
   y `docs/10-slices/S132-progress.md` están modificados en el árbol de trabajo,
   y `S132-pr-body.md` está sin trackear. El PR #136 (HEAD `3913904`) todavía no
   los incluye; hay que commitearlos/pushearlos antes del merge.
3. **Título del PR #136 desactualizado.** Sigue siendo
   `docs(slice): add S132 SillyTavern cards and lorebooks RFC`; el título del
   PR body es `feat(sillytavern): add character cards and lorebooks (S132)`.
   Conviene actualizarlo para que el squash commit refleje el slice.
4. **Prueba manual no ejecutada.** Recomendada antes del merge: importar card
   JSON y PNG, importar lorebook con claves/presupuesto, comprobar overrides de
   card y el modal `Crear` con pestaña Lorebook.
5. **Notas R1–R9** de la review: funcionalidad cubierta pero con bordes de UI,
   localización, integridad y mantenibilidad diferidos; ninguna bloquea el
   release.
6. **Warnings preexistentes** (shared build stub, Shiki/CSP, `i18n` de website,
   `INEFFECTIVE_DYNAMIC_IMPORT`, hint de `clipboard.ts`): ajenos a S132.
7. **`pnpm --filter @workspace/backend eval`** no forma parte de la checklist
   obligatoria y no se ha re-ejecutado; los contratos de prompt/contexto ya
   están cubiertos por los 964 tests de backend.

---

## PR

- **PR:** [#136](https://github.com/TheFallen0000/roleplay-manager/pull/136),
  `OPEN`, base `master`, head `feat/S132-sillytavern-cards`.
- **Mergeabilidad:** `MERGEABLE` / `CLEAN`.
- **CI (Checks):** `pass` (1m44s).
- **Body:** `docs/10-slices/S132-pr-body.md`, en inglés, con los límites de
  alcance indicados arriba.
- **Pendiente antes de mergear:** restaurar `release.json`, commitear/pushear el
  cierre documental, actualizar el título del PR y (recomendado) prueba manual.

**Veredicto: PASS WITH NOTES — sin bloqueantes.** Todos los checks obligatorios
están en verde y el slice no toca packaging, dependencias ni módulos nativos. Las
notas son los R1–R9 diferidos de la review, el snapshot generado del website que
debe restaurar el orquestador y el cierre documental pendiente de commit.
