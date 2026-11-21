# S134 — Release checks (post-publicación)

**Estado:** PASS
**Fecha:** 2026-11-21
**Rama:** `docs/s134-final-status` (nueva, sin publicar)
**Base:** `master` (`3ed16c2 docs(slice): record the published v1.58.0 release (#149)`)
**HEAD:** `3ed16c2` (idéntico a la base; el cierre documental aún no está commiteado)
**Slice mergeado:** `62a9dd1 feat(lorebooks): complete the versioned lorebook library (S134) (#144)`
**Release publicada:** `v1.58.0` — `7ba77d6 chore(release): v1.58.0 (#146)`
**Auditor:** slice-release (read-only)

> **Nota importante — `v1.58.0` ya estaba publicada.** Esta auditoría se ejecuta
> después del release y **no lo ha creado**. La release, el tag, el PR #146 y los
> assets ya existían cuando empezó esta sesión; aquí solo se verifica el estado
> publicado. No se ha hecho push, PR, merge, tag, bump de versión ni publish. Lo
> único escrito es este informe.

---

## Checklist

- [x] `pnpm check` en verde: `check:arch` 7/7 (0 failures, 0 warnings),
      typecheck 5/5, lint 5/5; repetido con `TURBO_FORCE=1` para tener evidencia
      sin caché.
- [x] `pnpm --filter @workspace/backend test` en verde: 166 archivos / 1078
      tests.
- [x] `pnpm --filter @workspace/frontend exec vitest run` en verde: 93 archivos
      / 488 tests.
- [x] `pnpm --filter @workspace/backend eval` en verde: 1 archivo / 33 tests
      (ancla S129).
- [x] `pnpm build` en verde: 4/4 tareas. La pasada fue cache hit y **no** dejó
      `packages/website/src/data/release.json` sucio.
- [x] `pnpm audit --prod` limpio: `No known vulnerabilities found`.
- [x] `git diff --check` limpio: sin salida.
- [x] Versión: `package.json` raíz en `"version": "1.58.0"`.
- [x] Tag: `git tag --points-at 7ba77d6` → `v1.58.0`;
      `git rev-parse 'v1.58.0^{commit}'` →
      `7ba77d6a2822bb1223ae703bf30ac2a50624b72c`.
- [x] Release en GitHub: `v1.58.0` publicada el `2026-11-21T16:04:40Z` en
      https://github.com/TheFallen0000/roleplay-manager/releases/tag/v1.58.0.
- [x] Assets: los cinco paquetes (`win-x64`, `linux-x64`, `linux-arm64`,
      `mac-arm64`, `mac-x64`) más `SHA256SUMS` y `SHA256SUMS.sig` (7 assets en
      total, todos en estado `uploaded`).
- [x] Workflow de release: run
      [44921978018](https://github.com/TheFallen0000/roleplay-manager/actions/runs/44921978018)
      `completed` / `success` sobre `master`, título
      `chore(release): v1.58.0 (#146)`.
- [x] Release notes: `1.58.0` extrae secciones no vacías y en inglés; `1.50.1`
      también en inglés y no vacío; `Unreleased` vacío (mensaje y exit 1
      esperados tras la release).
- [x] Sin placeholders de S134 en producción: `linkDeferred`,
      `versionsDeferred`, `characters.tabCards` y textos `S134` solo aparecen en
      tests que asertan su ausencia.
- [x] Migraciones: `_journal.json` termina en `idx: 20` (`0020_lorebook_versions`);
      no existe `0021_*.sql` ni `meta/0021_snapshot.json`.
- [x] Review independiente: **PASS WITH NOTES** (`docs/10-slices/S134-review.md`),
      sin BLOCKER ni MAJOR; NIT 4 y NIT 5 quedan aceptados y diferidos.
- [x] Slice doc: `S134-progress.md` con `Estado: Completado`,
      `Inicio: 2026-11-14`, `Fin: 2026-11-21`. Su modificación actual es la
      corrección intencional de las notas pre-release; no se ha tocado.
- [x] PR body: `docs/10-slices/S134-pr-body.md` existe, está en inglés y usa
      título conventional-commit. El body real del PR #144 (mergeado) coincide y
      también está en inglés.
- [x] Historial reciente: `git log --oneline -6` incluye `3ed16c2`, `7ba77d6` y
      `62a9dd1`.
- [x] Dry-run de release — **N/A**: la release real ya se publicó. S134 no cambió
      `package.json`, `pnpm-lock.yaml`, módulos nativos ni empaquetado; el único
      cambio de versión es el commit de release `7ba77d6`, que disparó el
      workflow real.
- [ ] Commit/push del cierre documental y PR de esta rama: lo hace el
      orquestador tras la revisión humana. Esta auditoría no ha commiteado nada.

---

## Resultados

### 1. `pnpm check`

Primera pasada (turbo replayó caché):

```text
Summary: 7/7 checks passed, 0 failure(s), 0 warning(s)
Tasks:    5 successful, 5 total   (typecheck)
Tasks:    5 successful, 5 total   (lint)
```

Repetición sin caché para evidencia fresca:

```text
$ TURBO_FORCE=1 pnpm check
Tasks:    5 successful, 5 total   (typecheck)
Cached:    0 cached, 5 total
  Time:    10.192s

Tasks:    5 successful, 5 total   (lint)
Cached:    0 cached, 5 total
  Time:    9.635s
```

Los 7 checks de arquitectura pasan (tamaño de frontend, pureza hexagonal,
`lib/` agnóstico, pureza de `shared/`, `lib/hooks`, archivos muertos y
aislamiento de features), sin warnings. Único diagnóstico: 1 hint preexistente
en `packages/frontend/src/lib/clipboard.ts:26` (`document.execCommand`
deprecado). Website: 41 archivos, 0 errores / 0 warnings / 0 hints. Frontend: 195
archivos, 0 errores / 0 warnings / 1 hint.

### 2. `pnpm --filter @workspace/backend test`

```text
Test Files  166 passed (166)
     Tests  1078 passed (1078)
  Duration  5.69s
```

### 3. `pnpm --filter @workspace/frontend exec vitest run`

```text
Test Files  93 passed (93)
     Tests  488 passed (488)
  Duration  19.02s
```

El mensaje `Not implemented: navigation to another Document` de jsdom es ruido
conocido del entorno; los 488 tests pasan.

### 4. `pnpm --filter @workspace/backend eval`

```text
Test Files  1 passed (1)
     Tests  33 passed (33)
  Duration  145ms
```

Ancla S129 intacta: sin regresiones en el ensamblado de contexto ni en la
paridad preview/send.

### 5. `pnpm build`

```text
Tasks:    4 successful, 4 total
Cached:    4 cached, 4 total
  Time:    23ms >>> FULL TURBO
```

La pasada fue cache hit (no reejecutó `fetch-release.mjs`). Los logs replayados
del website mencionan una release `1.57.2`, pero el archivo trackeado
`packages/website/src/data/release.json` sigue siendo el snapshot commiteado
`1.47.0` y **no quedó sucio**: `git status --short` solo muestra
`M docs/10-slices/S134-progress.md`. Si el orquestador fuerza el build del
website, `fetch-release.mjs` lo reescribirá a `1.58.0` y habrá que restaurarlo
(no se ha restaurado ni commiteado aquí).

Advertencias preexistentes, no bloqueantes: Shiki/CSP (frontend y website) y
`collection "i18n" does not exist or is empty` (website).

### 6. `pnpm audit --prod`

```text
No known vulnerabilities found
```

### 7. `git diff --check`

```text
$ git diff --check
(no output, exit 0)
```

El árbol de trabajo solo tiene la modificación intencional de
`docs/10-slices/S134-progress.md`; no hay archivos generados sucios ni cambios de
código.

### 8. Versión, tag y release publicada

```text
$ grep -n '"version"' package.json | head -1
3:  "version": "1.58.0",

$ git tag --points-at 7ba77d6
v1.58.0

$ git rev-parse 'v1.58.0^{commit}'
7ba77d6a2822bb1223ae703bf30ac2a50624b72c
```

`git show --stat 7ba77d6`:

```text
 CHANGELOG.md | 2 ++
 package.json | 2 +-
 2 files changed, 3 insertions(+), 1 deletion(-)
```

`gh release view v1.58.0 --json tagName,name,publishedAt,url,assets`:

```text
tagName:     v1.58.0
name:        v1.58.0
publishedAt: 2026-11-21T16:04:40Z
url:         https://github.com/TheFallen0000/roleplay-manager/releases/tag/v1.58.0
```

Assets publicados:

| Asset | Bytes | Estado |
| --- | ---: | --- |
| `roleplay-manager-1.58.0-linux-arm64.tar.gz` | 73 846 578 | `uploaded` |
| `roleplay-manager-1.58.0-linux-x64.tar.gz` | 74 111 144 | `uploaded` |
| `roleplay-manager-1.58.0-mac-arm64.tar.gz` | 69 215 567 | `uploaded` |
| `roleplay-manager-1.58.0-mac-x64.tar.gz` | 71 316 381 | `uploaded` |
| `roleplay-manager-1.58.0-win-x64.zip` | 71 745 887 | `uploaded` |
| `SHA256SUMS` | 530 | `uploaded` |
| `SHA256SUMS.sig` | 140 | `uploaded` |

Los cinco paquetes de plataforma están presentes, junto con `SHA256SUMS` y su
firma. GitHub reporta un digest SHA-256 por asset; esta auditoría no ha
descargado los paquetes ni re-verificado la firma Ed25519, solo la presencia y el
estado de los assets publicados.

### 9. Workflow de release

```text
$ gh run view 44921978018 --json displayTitle,status,conclusion,headBranch,event,createdAt,url
{
  "conclusion": "success",
  "createdAt": "2026-11-21T15:58:18Z",
  "displayTitle": "chore(release): v1.58.0 (#146)",
  "event": "push",
  "headBranch": "master",
  "status": "completed",
  "url": "https://github.com/TheFallen0000/roleplay-manager/actions/runs/44921978018"
}
```

### 10. Release notes

```text
$ pnpm exec node scripts/release-notes.mjs 1.58.0
### Added
...
### Changed
...
### Fixed
...
```

Salida no vacía, íntegramente en inglés, con las entradas de lorebooks,
personajes, modelos, contexto y settings.

```text
$ pnpm exec node scripts/release-notes.mjs 1.50.1
### Changed
...
### Fixed
...
```

Salida no vacía y en inglés.

```text
$ pnpm exec node scripts/release-notes.mjs Unreleased
The CHANGELOG section for Unreleased is empty

Exit code: 1
```

Es el resultado esperado después de mover `[Unreleased]` a `[1.58.0]`; no es un
fallo. `CHANGELOG.md` tiene `## [Unreleased]` vacío y
`## [1.58.0] - 2026-11-21` como primera sección con contenido.

### 11. Sin placeholders de S134 en producción

No hay coincidencias de `linkDeferred`, `versionsDeferred`, `characters.tabCards`
ni `S134` en `packages/shared/src` (i18n incluida). En `packages/frontend/src`
solo aparecen en tests que comprueban su ausencia:

- `src/lib/i18n-s134.test.ts` (lista de claves eliminadas)
- `src/components/lorebook/lorebook-versions-section.test.tsx`
- `src/components/lorebook/lorebook-page.test.tsx`
- `src/components/lorebook/lorebook-link-section.test.tsx`

### 12. Migraciones

```text
idx: 20  tag: 0020_lorebook_versions
```

No existe `0021_*.sql` ni `meta/0021_snapshot.json`. El slice reutiliza el schema
de `0020`; la única pieza nueva en migraciones es el test de regresión
`migration-0020.test.ts`.

### 13. Review, slice doc y PR

- `S134-review.md`: **PASS WITH NOTES**, sin BLOCKER ni MAJOR. MINOR 1
  (`8196a9e`), MINOR 2 (`eeb05e4`) y NIT 3 (`455680c`) corregidos; NIT 4
  (`IMPORT_STALE_MATCH` acotado) y NIT 5 (`origin_id = null` en libros frescos)
  aceptados y diferidos.
- `S134-progress.md`: `Estado: Completado`, `Inicio: 2026-11-14`,
  `Fin: 2026-11-21`, con la release `v1.58.0` y el run documentados.
- PR #144: `MERGED` el `2026-11-21T15:38:43Z`, merge commit
  `62a9dd126da32f8b9fa323698719243cee9f12f2`, título
  `feat(lorebooks): complete the versioned lorebook library (S134)` y body en
  inglés. `S134-pr-body.md` existe y coincide con ese body.

### 14. Historial

```text
$ git log --oneline -6
3ed16c2 docs(slice): record the published v1.58.0 release (#149)
7ba77d6 chore(release): v1.58.0 (#146)
3633689 chore(agents): align release operator with English changelog (#145)
62a9dd1 feat(lorebooks): complete the versioned lorebook library (S134) (#144)
bb16c56 feat(s133): add card-first character and versioned lorebook foundation (#140)
a309d03 docs(product): add card-first audit, UX plan and prototypes (#139)
```

### 15. Dry-run de release

**No aplica y no se ha lanzado.** La release real ya está publicada. S134 no
introdujo cambios en `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`,
`.github/`, `scripts/` ni módulos nativos:

```sh
git diff --stat bb16c56 62a9dd1 -- package.json pnpm-lock.yaml pnpm-workspace.yaml \
  packages/backend/package.json packages/frontend/package.json \
  packages/shared/package.json packages/ui/package.json packages/website/package.json \
  .github scripts
# (no output)
```

El comando de dry-run, solo como referencia para futuras ramas:

```sh
gh workflow run release.yml --repo TheFallen0000/roleplay-manager --ref <branch> -f publish=false
```

### 16. Secretos

El diff S134 no añade credenciales ni archivos sensibles:

```sh
git diff --name-only bb16c56 62a9dd1 -- '*.env' '.env*' '*.pem' '*.key' '*.p12' '*.pfx' '*.crt'
# (no output)
```

---

## Nits y observaciones (ninguna bloqueante)

1. **`release.json` de fallback desactualizado (preexistente).**
   `packages/website/src/data/release.json` sigue en `1.47.0` porque el build fue
   cache hit y no ejecutó `fetch-release.mjs`. No lo introdujo S134 (último commit
   del archivo: #25) y el árbol quedó limpio. Si se fuerza el build del website,
   se refrescará a `1.58.0` y quedará sucio; el orquestador debe restaurarlo.
2. **Aviso de jsdom** (`Not implemented: navigation to another Document`): ruido
   del entorno en Vitest; los 488 tests frontend pasan.
3. **Hint preexistente** de `document.execCommand` en
   `packages/frontend/src/lib/clipboard.ts:26`: ajeno a S134.
4. **NIT 4 y NIT 5** del review: aceptados y diferidos, sin impacto en release.
5. **Advertencias de build** Shiki/CSP y colección `i18n` del website:
   preexistentes y no bloqueantes.

## Riesgos

1. **Cierre documental sin commitear (esperado).** `S134-progress.md` está
   modificado y este informe sin trackear. El orquestador debe commitear/pushear
   la rama `docs/s134-final-status` y abrir el PR; esta auditoría no lo ha hecho.
2. **La rama no tiene upstream** (`git status -sb` sin `[ahead …]`).
3. **Nada que restaurar por el build:** no hay archivos generados sucios en este
   momento.

---

## Confirmación

- **La release `v1.58.0` ya estaba publicada antes de esta auditoría.** El tag
  apunta a `7ba77d6`, el workflow 44921978018 terminó en `success` y los siete
  assets están subidos.
- **Sin push:** la rama `docs/s134-final-status` no tiene upstream.
- **Sin PR, merge, tag, bump ni publish por esta auditoría:** solo se ha escrito
  `docs/10-slices/S134-release.md`.
- **Sin cambios de código, tests ni configuración.**

**Veredicto: PASS — sin bloqueantes.** Todos los gates están en verde con
evidencia fresca, la versión `1.58.0` y el tag `v1.58.0` son consistentes, los
cinco paquetes más `SHA256SUMS`/`SHA256SUMS.sig` están publicados, no hay
placeholders de S134 en producción, no hay migración nueva y la review está en
PASS WITH NOTES. Queda únicamente el commit/push del cierre documental y su PR
para revisión humana.
