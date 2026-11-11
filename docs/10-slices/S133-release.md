# S133 — Release checks

**Estado:** PASS
**Fecha:** 2026-11-11
**Rama:** `feat/S133-card-first-character`
**Base:** `master` (`a309d03 docs(product): add card-first audit, UX plan and prototypes (#139)`)
**HEAD de rama:** `0892bf5 fix(backend): link imported lorebooks to a v1`
**Slice:** superficie card-first de personaje + fundación de lorebooks versionados
(migración `0020` + backfill, versiones inmutables de lorebook, contrato de card
`GET/PUT /api/characters/:id/card` con `extensions.rm`, prompt desde la versión
enlazada y páginas básicas de lorebook).
**Auditor:** slice-release (read-only)

La auditoría no ha modificado código, tests, configuración ni git. Lo único
escrito es este informe. No se ha hecho push, PR, merge, tag, bump de versión ni
publish.

---

## Checklist

- [x] `pnpm check` en verde (`check:arch` 7/7, typecheck 5/5, lint 5/5),
      repetido con `TURBO_FORCE=1` sin caché.
- [x] `pnpm --filter @workspace/backend test` en verde (158 archivos / 1023 tests).
- [x] `pnpm --filter @workspace/frontend exec vitest run` en verde (84 archivos /
      451 tests).
- [x] `pnpm --filter @workspace/backend eval` en verde (1 archivo / 33 tests;
      snapshots S129 intactos).
- [x] `pnpm build` en verde (4/4 tareas); backend y frontend reconstruidos sin
      caché para tener evidencia fresca.
- [x] `pnpm audit --prod` limpio (`No known vulnerabilities found`).
- [x] `git diff --check` limpio (árbol de trabajo y `master...HEAD`).
- [x] Sin bump de versión: `package.json` sigue en `1.57.2`
      (`git diff master...HEAD -- package.json` vacío).
- [x] CHANGELOG sin cabecera de release nueva; las entradas S133 están solo bajo
      `## [Unreleased]`; la última release sigue siendo `## [1.57.2] - 2026-11-05`.
- [x] Sin cambios de `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`,
      `scripts/`, `.github/` ni dependencias (diff vacío).
- [x] Sin cambios de empaquetado ni módulos nativos; dry-run del workflow de
      release **no requerido**.
- [x] Sin secretos, claves, tokens, `.env`, `.pem`, `.key`, `.crt` añadidos.
- [x] Review independiente: **PASS WITH NOTES** (`docs/10-slices/S133-review.md`);
      B1 (bloqueante) cerrado con `0892bf5` + `5d804dd`; I1/N1–N5 son notas no
      bloqueantes.
- [x] `docs/10-slices/S133-pr-body.md` existe, está en inglés, con título
      conventional-commit y declara alcance, tests, review, diferidos y límites.
- [x] Slice doc con `Estado: Completado`, `Fin: 2026-11-11`, verificación,
      review, diferidos y commits reales.
- [ ] Prueba manual de la app (biblioteca, un guardado = una versión, selector de
      lorebook, round-trip de card); no ejecutada en esta auditoría.
- [ ] Commitear/pushear el cierre documental pendiente en el árbol de trabajo
      (`CHANGELOG.md`, `S133-progress.md`, `S133-review.md`, `S133-pr-body.md`,
      este informe). Lo hace el orquestador.

---

## Resultados

### 1. `pnpm check`

```text
$ pnpm check:arch && turbo typecheck && turbo lint
Summary: 7/7 checks passed, 0 failure(s), 0 warning(s)

Tasks:    5 successful, 5 total   (typecheck)
Tasks:    5 successful, 5 total   (lint)
```

Los 7 checks de arquitectura pasan: tamaño de frontend (≤ 500 líneas), pureza
hexagonal de `domain`/`application`, `lib/` agnóstico, pureza de `shared/`,
`lib/hooks` agnóstico, archivos muertos y aislamiento de features. Sin warnings
de arquitectura.

La primera pasada replayó caché, así que se repitió sin caché:

```text
$ TURBO_FORCE=1 pnpm check
@workspace/*:typecheck: cache bypass, force executing ...
Tasks:    5 successful, 5 total
Cached:    0 cached, 5 total
  Time:    9.249s

@workspace/*:lint: cache bypass, force executing ...
Tasks:    5 successful, 5 total
Cached:    0 cached, 5 total
  Time:    8.481s
```

Único diagnóstico preexistente: 1 hint en
`packages/frontend/src/lib/clipboard.ts:26` (`document.execCommand` deprecado),
sin errores ni warnings. Website: 41 archivos, 0 errores / 0 warnings / 0 hints.
Frontend: 183 archivos, 0 errores / 0 warnings / 1 hint.

### 2. `pnpm --filter @workspace/backend test`

```text
RUN  v5.0.5 .../packages/backend
Test Files  158 passed (158)
     Tests  1023 passed (1023)
  Duration  4.93s
```

Incluye `migration-0020.test.ts`, `lorebook-versions.backfill.test.ts`,
`source-key.test.ts`, `lorebooks.routes.test.ts`, `get-character-card` /
`update-character-card`, paridad prompt/preview y los round-trips de card con
`extensions.rm`.

### 3. `pnpm --filter @workspace/frontend exec vitest run`

```text
RUN  v5.0.5 .../packages/frontend
Test Files  84 passed (84)
     Tests  451 passed (451)
  Duration  16.19s
```

Mensaje `Not implemented: navigation to another Document` de jsdom al navegar en
un test: ruido conocido del entorno, no un fallo (todo en verde).

### 4. `pnpm --filter @workspace/backend eval`

```text
$ vitest run --config vitest.eval.config.ts
Test Files  1 passed (1)
     Tests  33 passed (33)
```

Ancla S129: los snapshots de ensamblado/contexto siguen intactos (cero
regresiones S129–S132).

### 5. `pnpm build`

```text
$ turbo build
Tasks:    4 successful, 4 total
Cached:    4 cached, 4 total
```

La pasada completa replayó caché, así que se reconstruyeron backend y frontend
sin caché (se evita a propósito el build del website para no refrescar
`packages/website/src/data/release.json`):

```text
$ pnpm --filter @workspace/backend build
$ node build.mjs

$ pnpm --filter @workspace/frontend build
astro build ... Server built in 1.39s ... Complete!
```

Advertencias preexistentes, no bloqueantes: Shiki/CSP (frontend y website) y
`collection "i18n" does not exist or is empty` (website).

**`release.json` no se ha modificado:** el build del website fue cache hit en
`pnpm build` y no se ha forzado, así que no hay archivo generado sucio en el
árbol de trabajo.

### 6. `pnpm audit --prod`

```text
No known vulnerabilities found
```

### 7. `git diff --check`

```text
$ git diff --check
(no output, exit 0)

$ git diff --check master...HEAD
(no output, exit 0)
```

### 8. Árbol de trabajo

```text
$ git status --short
 M CHANGELOG.md
 M docs/10-slices/S133-progress.md
?? docs/10-slices/S133-pr-body.md
?? docs/10-slices/S133-review.md
```

Es el cierre documental esperado (sin commitear); no hay archivos generados
sucios ni cambios de código fuera de rama. `git status -sb` no muestra upstream
ni `[ahead …]`: la rama no se ha pusheado.

### 9. Versionado, CHANGELOG y packaging

- **Sin bump de versión.** `package.json` raíz → `"version": "1.57.2"`;
  `git diff master...HEAD -- package.json` sin salida (idéntico a `master`).
- **Sin commit de release ni tag.** `git log --oneline master..HEAD` solo tiene
  commits `docs(slice)`, `test(s133)`, `feat(shared|backend|frontend)` y el
  `fix(backend)` de B1; no hay `release:` ni `chore(release)`. `git tag
  --points-at HEAD` sin salida.
- **CHANGELOG.** `## [Unreleased]` sigue siendo la primera sección; las entradas
  S133 están dentro de `Added` / `Changed` / `Fixed` (Biblioteca, página
  seccionada, versiones inmutables, contrato de card, páginas de lorebook,
  «Tarjetas»→«Fichas», prompt desde la versión enlazada y el fix de
  conversaciones existentes). Entradas en español y user-facing.
- **Sin cambios de packaging/lockfile/nativos.** Sin salida para:

  ```sh
  git diff --stat master...HEAD -- package.json pnpm-lock.yaml pnpm-workspace.yaml \
    packages/backend/package.json packages/frontend/package.json \
    packages/shared/package.json packages/ui/package.json packages/website/package.json
  git diff --stat master...HEAD -- scripts .github \
    packages/backend/build.mjs packages/backend/scripts
  git diff --stat master...HEAD -- packages/website
  ```

  No hay dependencias nuevas: `node:crypto` (built-in) cubre el SHA-256.

### 10. Dry-run del workflow de release

**No requerido y no lanzado.** El slice no toca `package.json`,
`pnpm-lock.yaml`, `pnpm-workspace.yaml`, `scripts/`, `.github/`, módulos nativos
(`better-sqlite3`, `sharp`) ni la configuración del bundle. La migración `0020`
viaja en la carpeta que `scripts/package.mjs` ya copia de forma recursiva.

Comando exacto que el orquestador lanzaría **solo si** decidiera verificar el
pipeline (no necesario para este slice):

```sh
gh workflow run release.yml --repo TheFallen0000/roleplay-manager --ref feat/S133-card-first-character -f publish=false
```

### 11. Secretos y credenciales

Sin hallazgos:

```sh
git diff master...HEAD -G 'sk-[A-Za-z0-9_-]{20,}' -G 'ghp_[A-Za-z0-9]{20,}' \
  -G 'github_pat_' -G 'AKIA[0-9A-Z]{16}' \
  -G '-----BEGIN [A-Z ]*PRIVATE KEY-----' --stat
# (no output)

git diff master...HEAD --name-only -- '*.pem' '*.key' '*.p12' '*.pfx' '*.env' '.env*' '*.crt'
# (no output)
```

Las apariciones de `token` en el diff son `token_budget` / `tokenBudget` del
lorebook, no credenciales.

### 12. PR body

`docs/10-slices/S133-pr-body.md`:

- Título conventional-commit: `feat(s133): add card-first character and
  versioned lorebook foundation`.
- En inglés (solo cita literales de UI: «Biblioteca», «Crear», «Fichas»).
- Secciones: Summary, What ships (Shared/Backend/Frontend), Migration and data
  safety, Verification, Review, Deferred notes, Out of scope, Release.
- Declara explícitamente «No version bump» y que la release se batchea en un PR
  `chore(release): vX.Y.Z` aparte.
- Declara los límites: sin reconstrucción por `origin_id`/`source_key`, sin
  historial/restore/uso, sin soft-delete UI, sin drop físico de `character_id`,
  sin saludo alternativo, `nickname` fuera de `extensions.rm`, sin chats/JSONL,
  CHARX, V3 assets, group chats ni lorebook avanzado.
- Cierra con «The docs agent did not push, open a pull request or merge anything
  for this slice.»

### 13. Slice doc

`docs/10-slices/S133-progress.md` cumple:

- `**Estado:** Completado`, `**Inicio:** 2026-11-11`, `**Fin:** 2026-11-11`.
- RFC completo con `Estado: Aprobado` (aprobación del usuario) y secciones de
  problema, restricciones, opciones, decisión, migración, tests y eval.
- `## Verificación` con los mismos números que esta auditoría (158/1023,
  84/451, 1/33, check 7/7 + 5/5 + 5/5, build y audit verdes, diff limpio).
- `## Review`: **PASS WITH NOTES**, B1 resuelto, notas no bloqueantes.
- `## Deferred`: S134 y limpieza, con I1/N1–N5 y la recomendación de prueba
  manual.
- `## Commits`: los 13 commits reales de la rama más el cierre documental
  pendiente de commitear.

---

## Review — notas no bloqueantes (I1, N1–N5)

Ninguna bloquea el release; todas quedan registradas para S134/limpieza:

- **I1 — N+1 en `GET /characters/:id`.** `get-character` +
  `lorebook-version-summary` hacen `findVersionById` + `findById` por versión.
  Impacto acotado; batch `IN (...)` en S134/limpieza.
- **N1 — `toLorebookVersionDTO` sin `id` de entrada.** `entries_json` no guarda
  `id` y el DTO lo declara obligatorio; el frontend lo tolera (`entry.id ?? …`).
  Sintetizar `id` en limpieza.
- **N2 — i18n muerta `characters.tabCards`.** «Tarjetas»/«Cards» ya no se
  referencia; eliminar en limpieza.
- **N3 — `extensions.rm` emite `subtitle`/`instructions` en `null`.** Una card
  sin `extensions` gana el namespace `rm`; cosmético, `field loss = 0`.
- **N4 — paginación y `usageCount` en memoria en `listLorebooks`.** Trae todo y
  hace `slice`, con `usageCount: 0` fijo; inocuo con pocos libros.
- **N5 — `canonicalizeLorebookContent` en `shared/lib`.** Re-exportado desde
  `source-key.ts`; benigno (`shared/` puro, hash en backend). Solo nota.

### Prueba manual recomendada (no ejecutada)

Antes del merge, probar en la app real:

1. **Biblioteca:** el panel lateral muestra Personajes, Lorebooks y Personajes
   jugados; `aria-current` correcto y diálogo «Crear» con dos placas.
2. **Un guardado = una versión:** guardar desde la página de personaje crea una
   sola versión (no dos) y la barra de guardado refleja los cambios.
3. **Selector de lorebook:** vincular/cambiar/quitar el libro desde el personaje
   crea versión nueva y muestra el estado `current` / `outdated` / `deleted`.
4. **Round-trip de card:** exportar e importar una card con `character_book` y
   `extensions.rm` sin perder subtítulo, instrucciones, fichas, versión ni
   referencia del lorebook.
5. **Conversaciones existentes:** editar el libro vivo a v2 no cambia el prompt
   de una conversación fijada a v1; preview y envío coinciden.

---

## Riesgos / notas

1. **Cierre documental sin commitear (esperado).** `CHANGELOG.md` y
   `S133-progress.md` están modificados y `S133-review.md`, `S133-pr-body.md` y
   este informe están sin trackear. El orquestador debe commitear/pushear antes
   del merge; no se ha commiteado nada en esta auditoría.
2. **Sin archivo generado sucio.** A diferencia de S132, el build del website no
   se ejecutó sin caché, así que `packages/website/src/data/release.json` no se
   ha reescrito y no requiere restauración. Si el orquestador fuerza el build
   del website, ese archivo puede volver a quedar sucio y habrá que restaurarlo.
3. **Sin PR abierto.** `gh pr list --head feat/S133-card-first-character --state
   all` devuelve `[]`; la rama no tiene upstream. El PR body está listo para
   usarse tal cual.
4. **Advertencias preexistentes** (Shiki/CSP, `i18n` de website, hint de
   `clipboard.ts`): ajenas a S133.
5. **Notas I1/N1–N5:** bordes de rendimiento, tipado en runtime, i18n muerta,
   cosmética del namespace `rm` y ubicación de un helper; ninguna bloquea el
   release.

---

## Confirmación

- **Sin push:** la rama no tiene upstream (`git status -sb` sin `[ahead …]`).
- **Sin PR, merge ni tag:** `gh pr list` vacío; `git tag --points-at HEAD` vacío;
  sin commit `release:`/`chore(release)` en `master..HEAD`.
- **Sin bump de versión:** `package.json` en `1.57.2`, idéntico a `master`.
- **Sin publish ni dry-run de release:** no se ha lanzado `gh workflow run`.
- **Sin cambios de código, tests ni configuración por esta auditoría:** lo único
  escrito es `docs/10-slices/S133-release.md`.

**Veredicto: PASS — sin bloqueantes.** Todos los checks obligatorios están en
verde con evidencia fresca, el slice no toca packaging, dependencias ni módulos
nativos, y la review está en PASS WITH NOTES sin bloqueantes pendientes. Solo
queda el cierre documental (commit/push del orquestador) y la prueba manual
recomendada.
