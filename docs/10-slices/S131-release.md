# S131 — Release audit

**Estado:** READY (PASS)
**Auditor:** slice-release (read-only)
**Fecha:** 2026-11-06
**Rama:** `docs/S131-cleanup`
**Base:** `master` (`1ef6572`); HEAD de rama `f38646c docs(slice): document S131`
**Slice:** compactación alineada con la ventana de trabajo aplicada + NIT-4 +
catálogo diferido con baseline medido.

La auditoría no ha modificado código, tests, docs ni configuración. Lo único
escrito es este informe. No se ha hecho push, merge, tag, bump de versión ni
publish.

---

## 1. Checklist de release

| Comando                                             | Resultado | Evidencia                                                                                       |
| --------------------------------------------------- | --------- | ----------------------------------------------------------------------------------------------- |
| `pnpm check`                                        | **PASS**  | `check:arch` 7/7 (0 fallos, 0 warnings); typecheck 5/5; lint 5/5                                 |
| `pnpm --filter @workspace/backend test`             | **PASS**  | `Test Files 129 passed (129)` · `Tests 798 passed (798)` · 4.43 s                                |
| `pnpm --filter @workspace/frontend exec vitest run` | **PASS**  | `Test Files 70 passed (70)` · `Tests 409 passed (409)` · 12.70 s                                |
| `pnpm build`                                        | **PASS**  | `Tasks: 4 successful, 4 total`, exit 0                                                          |
| `pnpm audit --prod`                                 | **PASS**  | `No known vulnerabilities found`, exit 0                                                        |
| `git diff --check`                                  | **PASS**  | sin salida, exit 0 (también `git diff --check master...HEAD`)                                    |

Sin bloqueantes. Ningún check en rojo.

### Evidencia fresca (cache de turbo invalidada)

La primera pasada de `pnpm check` y `pnpm build` replayó caché
(`FULL TURBO` / `cache hit`), así que se repitieron con `TURBO_FORCE=1` para
tener evidencia independiente del árbol actual:

- `TURBO_FORCE=1 pnpm check` → arch 7/7; typecheck `Cached: 0 cached, 5 total`
  → `Tasks: 5 successful, 5 total` (8.79 s); lint `Cached: 0 cached, 5 total`
  → `Tasks: 5 successful, 5 total` (7.59 s).
- `TURBO_FORCE=1 pnpm build` → `Cached: 0 cached, 4 total`,
  `Tasks: 4 successful, 4 total` (3.38 s).

Salida relevante de `pnpm check`:

```
Frontend size (max 500 lines)                   ✓ pass
Backend hexagonal (domain/application purity)   ✓ pass
Frontend lib/ agnostic of React/UI/zustand      ✓ pass
shared/ package purity                          ✓ pass
Frontend lib/hooks agnostic of features         ✓ pass
Frontend dead files (no orphans)                ✓ pass
Frontend feature isolation (no cross-feature)   ✓ pass

Summary: 7/7 checks passed, 0 failure(s), 0 warning(s)
```

Los conteos coinciden con `S131-progress.md` y `S131-pr-body.md`
(129/798 backend, 70/409 frontend, 7/7, 5/5, 4/4).

---

## 2. Migración 0018 — SQL, snapshot y journal

Presentes y consistentes:

- **SQL** — `packages/backend/src/infrastructure/database/migrations/0018_wet_absorbing_man.sql`:

  ```sql
  ALTER TABLE `conversations` ADD `working_window` integer;
  ```

  Columna nullable, **sin `NOT NULL`**, **sin `DEFAULT`** y **sin backfill**.

- **Snapshot** — `meta/0018_snapshot.json` (`"version": "6"`, 1 253 líneas),
  entrada de `conversations`:

  ```json
  "working_window": {
    "name": "working_window",
    "type": "integer",
    "primaryKey": false,
    "notNull": false,
    "autoincrement": false
  }
  ```

  `notNull: false` y sin clave `default` (a diferencia, por ejemplo, de
  `summary_frequency`, que sí lleva `"default": 20`).

- **Cadena de snapshots** — `0018_snapshot.json` `prevId` =
  `3443d9e1-fadd-4815-bd69-53c353f146e8` = `id` de `0017_snapshot.json`;
  `id` propio `45474005-f7a2-4c44-986a-221c227e4210`.

- **Journal** — `meta/_journal.json` (+7 líneas, una sola entrada nueva):

  ```json
  {
    "idx": 18,
    "version": "6",
    "when": 1793998945217,
    "tag": "0018_wet_absorbing_man",
    "breakpoints": true
  }
  ```

  Contigua a `0017_compaction_threshold` (`idx: 17`), sin duplicados de `idx`
  ni de `tag`.

- **Esquema Drizzle** — `conversations.schema.ts`:
  `workingWindow: integer("working_window"),` (nullable, sin `.default()`).

- **Empaquetado de migraciones** — `scripts/package.mjs:490-491` sigue copiando
  la carpeta completa (`packages/backend/src/infrastructure/database/migrations`
  → `<app>/migrations`), por lo que la migración nueva entra sin cambios y
  `package.mjs` no se ha tocado.

---

## 3. Empaquetado y dry-run de release

**El dry-run de release NO es necesario y no se ha lanzado.**

- `git diff master...HEAD -- package.json packages/*/package.json pnpm-lock.yaml pnpm-workspace.yaml`
  → sin salida.
- `git diff master...HEAD --stat -- scripts packages/website pnpm-lock.yaml`
  → sin salida (ni `scripts/package.mjs`, ni `build.mjs`, ni workflows, ni
  configuración de distribución).
- Sin cambios de módulos nativos (`better-sqlite3`, `sharp`) ni de `external`
  del bundle.
- La migración viaja por la carpeta ya copiada, así que no introduce un cambio
  de empaquetado.

Comando exacto que el orquestador lanzaría **solo si** decidiera verificar el
pipeline; no requerido para este slice:

```sh
gh workflow run release.yml --repo TheFallen0000/roleplay-manager --ref docs/S131-cleanup -f publish=false
```

---

## 4. Versionado y CHANGELOG

- **Sin bump de versión:** `package.json` raíz no aparece en el diff;
  `version` es `1.57.2` tanto en `master` (`git show master:package.json`) como
  en el árbol de trabajo.
- **Sin tag ni assets de release** en el diff (no hay `dist/`, `.zip`, `.exe`,
  `.dmg` ni `.AppImage`).
- **CHANGELOG:** `git diff master...HEAD -- CHANGELOG.md` = `14 +/-`, todo dentro
  de `[Unreleased]` (Added / Changed / Fixed), por encima de
  `## [1.57.2] - 2026-11-05`. No se crea sección de versión nueva.

---

## 5. Sin cambios de prompt ni de i18n

- `git diff master...HEAD --name-only -- packages/shared/src/i18n packages/backend/src/application/prompts packages/backend/src/infrastructure/adapters/secondary/prompts`
  → sin salida.
- El ensamblado de prompt (`prompt-context-builder.impl.ts`) y sus snapshots de
  S129 no están en el diff.
- El único cambio aparentemente «de texto» en el diff es una clave de refresco
  en `chat.tsx` (incluye `workingWindow` para invalidar `useContextUsage`), no
  copy de UI:

  ```diff
  -  } = useContextUsage(conv.id, `${conv.contextWindow}:${conv.maxTokens}:${conv.updatedAt}`)
  +  } = useContextUsage(conv.id, `${conv.contextWindow}:${conv.workingWindow ?? ""}:${conv.maxTokens}:${conv.updatedAt}`)
  ```

---

## 6. Higiene del árbol (`git status --porcelain`)

- **Antes de los checks:** sin salida (árbol limpio).
- **Después de `pnpm check`, tests, `pnpm audit --prod` y del build cacheado:**
  sin salida.
- **Después del build forzado (`TURBO_FORCE=1 pnpm build`):** una sola ruta
  modificada, un fichero **generado y versionado**:

  ```
   M packages/website/src/data/release.json
  ```

  `scripts/fetch-release.mjs` refresca el snapshot desde la API de GitHub
  (`Release 1.57.2 guardada en .../packages/website/src/data/release.json`).
  El fichero commiteado estaba en `1.47.0`; el build lo sube a `1.57.2` con
  URLs y tamaños de assets nuevos. **No se ha restaurado** (ni `git checkout`
  ni `git restore`, según el encargo): el orquestador debe restaurarlo y
  excluirlo del PR. El build cacheado no lo tocó; solo lo reescribe la
  ejecución real.

  Este comportamiento es preexistente y ajeno a S131 (ya documentado en
  `S130-release.md`), pero conviene arreglarlo en un slice de website.

`git diff --check` sigue limpio incluso con ese fichero modificado.

---

## 7. Alcance del diff (`git diff --stat master...HEAD`)

42 ficheros, `3 300 insertions(+), 94 deletions(-)`:

- `docs/10-slices/*` (progress, review, test-plan, pr-body).
- Backend: `context-compaction.service.ts` (+79/-), `context-compiler.service.ts`,
  `get-prompt-context.use-case.ts`, `update-conversation-settings.use-case.ts`,
  `generate-summary` (solo test), export/import/rama/plantilla, entidad
  `conversation.entity.ts`, repo Drizzle, esquema, rutas y migración 0018.
- Shared: `src/lib/context-window.ts` (nuevo, 45 líneas), `types/conversation.ts`,
  `types/export.ts`.
- Frontend: `model-selector.tsx`, `settings-panel.tsx`,
  `use-model-capabilities.ts`, `chat.tsx`.

Sin cambios en `package.json`, lockfile, `pnpm-workspace.yaml`, `scripts/`,
workflows ni `packages/website/`.

---

## 8. Observaciones (no bloquean)

1. **`release.json` sucio tras el build forzado** — lo restaura el orquestador;
   no debe entrar en el commit del slice.
2. **Warnings preexistentes**, ajenos a S131:
   - `@workspace/shared#build` → `WARNING  no output files found for task`
     (paquete solo de tipos; el `build` es un stub `echo`).
   - `packages/website` → `WARN [content] The collection "i18n" does not exist or
     is empty` y warning de Shiki/CSP.
   - `packages/frontend` typecheck → 1 hint preexistente en
     `src/lib/clipboard.ts:26` (`document.execCommand` deprecado).
3. **Cifras de la doc** — `S131-progress.md` marca `pnpm audit --prod` como no
   re-ejecutado (`[ ]`); esta auditoría lo cubre: **limpio**. Conviene actualizar
   esa casilla al mergear.
4. **`pnpm --filter @workspace/backend eval`** (33 tests según la doc) no forma
   parte de la checklist obligatoria de release y no se ha re-ejecutado aquí;
   los tests de compactación/preview que cubren el contrato ya están en
   `backend test` (798 en verde).
5. **Prueba manual de la app** no ejecutada en esta auditoría (la doc la marca
   como no ejecutada); recomendable abrir una conversación con ventana aplicada
   y comprobar el badge antes de mergear.

---

## 9. Checklist final del PR

- [x] `pnpm check` en verde (arch 7/7, typecheck 5/5, lint 5/5), repetido con
      `TURBO_FORCE=1`
- [x] `pnpm --filter @workspace/backend test` en verde (129 archivos / 798 tests)
- [x] `pnpm --filter @workspace/frontend exec vitest run` en verde (70 / 409)
- [x] `pnpm build` en verde (4/4), repetido con `TURBO_FORCE=1`
- [x] `pnpm audit --prod` sin vulnerabilidades
- [x] `git diff --check` limpio (árbol y `master...HEAD`)
- [x] Migración `0018_wet_absorbing_man.sql` + snapshot + journal presentes y
      consistentes (`working_window` integer nullable, sin default, sin backfill)
- [x] Sin cambios de `package.json`, lockfile, módulos nativos ni empaquetado →
      **dry-run de release no requerido**
- [x] Sin cambios de prompt ni de i18n
- [x] Ningún bump de versión, tag ni assets de release
- [x] CHANGELOG bajo `[Unreleased]`, sin crear sección de versión
- [x] Árbol limpio antes de los checks
- [x] Review independiente: **PASS** (`docs/10-slices/S131-review.md`)
- [ ] Restaurar `packages/website/src/data/release.json` (lo hace el
      orquestador; no debe commitearse)
- [ ] `CI` / **Checks** en verde en el PR #135
- [ ] Prueba manual de badge/compactación con ventana aplicada (recomendada)
- [ ] Aprobación humana para push/merge del PR

**Veredicto: READY — sin bloqueantes.** El único efecto secundario detectado es
el fichero generado `packages/website/src/data/release.json`, que queda sucio a
propósito y debe restaurar el orquestador.
