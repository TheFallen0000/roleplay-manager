# S133 — Test plan (handoff para `slice-test-author`)

Contrato: `docs/10-slices/S133-progress.md` (RFC, Aprobado, commit `312da5a`). Este
plan fija nombres/firmas y la matriz de tests. No re-decide la API ni reabre las
decisiones de gate. Formato: `S132-test-plan.md`.

## 1. Scope y principio de red-test

Un test debe fallar en rojo **por la razón esperada**: falta módulo/tipo, falta
tabla/columna, falta endpoint/ruta, falta componente, o comportamiento no
implementado. **No** debe fallar por fixtures ausentes, red, timers flaky,
setup de test ni config.

Dado que los tests S133 importan símbolos que hoy **no existen**, la mayoría de
los rojos serán "Cannot find module …", "… is not a function" (método nuevo del
puerto no implementado), o `PRAGMA`/query que devuelve vacío (tabla/columna
ausente). Es la razón aceptable para un rojo en esta etapa.

## 2. Contrato a fijar (símbolos nuevos que los tests importan)

**Backend** (todos inexistentes hoy, salvo indicación):

- `src/infrastructure/database/migrations/0020_lorebook_versions.sql` + `meta/0020_snapshot.json` + entrada de journal `idx:20, version:"6", breakpoints:true`.
- `src/infrastructure/database/backfill/lorebook-versions.backfill.ts` → `runLorebookVersionsBackfill(db: Database): void`.
- `src/application/use-cases/character/lorebook/source-key.ts` → `canonicalizeLorebookContent(normalized) → string` y `computeLorebookSourceKey(canonical) → string`.
- `src/domain/entities/lorebook-version.entity.ts` → `LorebookVersion` (`create`/`reconstruct`, invariantes `version_number ≥ 1`, `scan_depth ≥ 0`, `token_budget ≥ 0`, `entries_json` no vacío).
- `src/infrastructure/adapters/secondary/drizzle/schema/lorebook-versions.schema.ts`.
- `src/application/use-cases/character/lorebook/` → `list-lorebooks`, `get-lorebook-by-id`, `create-lorebook`, `update-lorebook`, `list-lorebook-versions`, `get-lorebook-version`.
- `src/application/use-cases/character/get-character-card.use-case.ts` y `update-character-card.use-case.ts`.
- `src/application/use-cases/character/sillytavern-card.mapper.ts` → `readRmExtensions(extensions)`, `withRmExtensions(extensions, rm)`, `lorebookVersionToCardData(version)`.
- `src/infrastructure/adapters/primary/routes/lorebooks.routes.ts` (nuevo, **plural**, recurso `/api/lorebooks`; distinto del compat `lorebook.routes.ts` singular de S132).
- Puerto `LorebookRepository` gana `findById`, `list`, `findVersions`, `findVersionById`, `createContainerWithVersion`, `saveLiveHeadAndVersion`; `CharacterRepository.saveVersion`/`findVersionById` mapean `lorebookVersionId`.

**Shared**: `src/types/lorebook.ts` (`LorebookSummaryDTO`, `LorebookVersionDTO`,
`LorebookVersionSummary`, `CreateLorebookInput`, `UpdateLorebookInput`,
`CreateLorebookEntryInput`); `sillytavern-card.ts` gana `RmExtensions`; `character.ts`
gana `CharacterVersionDTO.lorebookVersion?` y `lorebookVersionId?` en inputs.

**Frontend**: `src/lib/api/lorebooks.ts`; `components/shared/create-dialog.tsx`;
`components/layout/app-shell.tsx` (modificado); `components/character/character-page.tsx`
+ `character-section-nav.tsx` + `character-save-bar.tsx` +
`sections/{identity,card,fichas,lorebook,versions}-section.tsx` + `use-character-page.ts`;
`components/lorebook/{lorebook-list,lorebook-card,lorebook-page,lorebook-section-nav,lorebook-identity-section,lorebook-settings-section,lorebook-entries-section,lorebook-entry-form,lorebook-editor}.tsx` + `use-lorebook-page.ts`.

## 3. Matriz de tests

Columna AC = criterio de aceptación del RFC. "Rojo esperado" describe la razón
exacta del fallo en la etapa red.

| # | Área / AC | Fichero (runner) | Fixture / acción | Aserciones clave | Rojo esperado |
| --- | --- | --- | --- | --- | --- |
| 1 | Migración 0020 (AC 814) | `infrastructure/database/migrations/migration-0020.test.ts` (nuevo; backend) | leer journal + listar archivos | entrada `idx:20, version:"6", breakpoints:true`, `0020_*.sql` + `meta/0020_snapshot.json` presentes; `runMigrations` no lanza | `entry` undefined (no hay idx 20) → `toMatchObject` falla |
| 2 | Migración 0020 — tabla versiones | mismo | `PRAGMA table_info(lorebook_versions)` | columnas `id, lorebook_id, version_number, name, description, scan_depth, token_budget, recursive_scanning, entries_json, source_key, created_at`; índice único `(lorebook_id, version_number)`; índice por `source_key` | `columnsOf("lorebook_versions")` lanza (tabla no existe) |
| 3 | Migración 0020 — lorebooks rebuild | mismo | `PRAGMA table_info/foreign_key_list/index_list(lorebooks)` | `character_id` `notnull:0`; `lorebooks_character_idx` **ausente**; sin FK en `character_id`; columnas `origin_id, current_version_id, deleted_at`; FK `current_version_id → lorebook_versions ON DELETE SET NULL` | `character_id` sigue `notnull:1` / índice aún presente → `toMatchObject`/`toBeDefined` falla |
| 4 | Migración 0020 — character_versions | mismo | `PRAGMA foreign_key_list(character_versions)` | `lorebook_version_id` FK → `lorebook_versions.id` `ON DELETE RESTRICT`, nullable, con índice | columna/FK ausente → find devuelve undefined |
| 5 | Backfill v1 + enlace (AC 815) | `infrastructure/database/backfill/lorebook-versions.backfill.test.ts` (nuevo; backend) | sembrar personaje + 2 `character_versions` + 1 `lorebooks` (`character_id` seteado, `current_version_id` NULL) + 2 `lorebook_entries`; `runLorebookVersionsBackfill(db)` | v1 insertada; `current_version_id` apuntada; **ambas** `character_versions.lorebook_version_id` = v1; `source_key` = `computeLorebookSourceKey(canonicalizeLorebookContent(cabeza))`; `character_id = NULL` | import "Cannot find module …/lorebook-versions.backfill" |
| 6 | Backfill idempotente (AC 815) | mismo | re-ejecutar el backfill | nº de filas `lorebook_versions` para el libro sigue = 1 (sin segunda v1) | igual que #5 (rojo de import, previo al assert) |
| 7 | Backfill reparación parcial (AC 815) | mismo | segundo libro con v1 insertada a mano y `current_version_id` NULL | reutiliza la v1 existente (no inserta otra), apunta `current_version_id`, enlaza sus versiones y anula `character_id` | igual que #5 |
| 8 | `source_key` canónico (AC 815/832) | `application/use-cases/character/lorebook/source-key.test.ts` (nuevo; backend) | misma entrada con (a) claves JSON reordenadas, (b) `id/source_id/lorebook_id`/timestamps distintos, (c) `order` numérico distinto sin reorden relativo | mismo `source_key` en (a)(b)(c); distinto en (d) reorden relativo de entradas y (e) cambio de contenido/`scan_depth`/`token_budget`/`recursive_scanning`/nombre/descripción | import "Cannot find module …/source-key" |
| 9 | Repo versionado — createContainerWithVersion (AC 728) | `infrastructure/adapters/secondary/drizzle/repositories/drizzle-lorebook.repository.test.ts` (extender) | `Lorebook.create` **sin** `characterId` (standalone) → `createContainerWithVersion` | contenedor + v1 persisten; `current_version_id` = v1; `findById` devuelve el contenedor | `repository.createContainerWithVersion is not a function` |
| 10 | Repo versionado — saveLiveHeadAndVersion | mismo (extender) | editar contenido → v2; idéntico → sin versión; reorden relativo → v2 | `saveLiveHeadAndVersion` crea v2 solo si cambió (devuelve `createdNewVersion` o equivalente); reorden cambia `source_key` y crea v2 | `repository.saveLiveHeadAndVersion is not a function` |
| 11 | Repo versionado — lectura inmutable | mismo (extender) | `findVersionById` de la v1 tras editar cabeza a v2 | `findVersionById(v1).entries_json` intacto (entradas v1); `list` filtra `deleted_at IS NOT NULL` | `repository.findVersionById is not a function` |
| 12 | Use case standalone create (AC 834) | `application/use-cases/character/lorebook/create-lorebook.use-case.test.ts` (nuevo) | `CreateLorebookUseCase.execute` sin `characterId` | crea contenedor + v1; DTO sin `characterId` (null); `createContainerWithVersion` llamado una vez | import "Cannot find module create-lorebook.use-case" |
| 13 | Use case update + no-op (AC 835) | `application/use-cases/character/lorebook/update-lorebook.use-case.test.ts` (nuevo) | `PUT` idéntico → no-op; cambiar nombre/descripción/ajustes/entradas → v2; reorden → v2 | no-op devuelve `createdNewVersion:false` (no lanza `NoChangesDetectedError`); cambio devuelve `createdNewVersion:true` | import "Cannot find module update-lorebook.use-case" |
| 14 | Versiones read-only (AC 835) | `application/use-cases/character/lorebook/get-lorebook-version.use-case.test.ts` (nuevo) | `GET /versions/:versionId` | devuelve `LorebookVersionDTO` deserializando `entries_json`; versión inexistente → `LOREBOOK_VERSION_NOT_FOUND`; no existe `PUT` sobre una versión (ruta ausente) | import "Cannot find module get-lorebook-version.use-case" |
| 15 | Card GET — versión enlazada (AC 825) | `application/use-cases/character/get-character-card.use-case.test.ts` (nuevo) | `GET /card?spec=v3&versionId=` | `character_book` sale de la **versión enlazada** (spy `findVersionById` no `findByCharacterId`); sin vínculo → sin `character_book` | import "Cannot find module get-character-card.use-case" |
| 16 | Card PUT — libro nuevo (AC 826) | `application/use-cases/character/update-character-card.use-case.test.ts` (nuevo) | envelope con `character_book` + `originId`/`lorebookId`/`lorebookVersionId` importados | crea **una** versión de personaje (`saveVersion` ×1); libro nuevo + v1 con **IDs locales nuevos ≠ importados**; `originId` preservado como `origin_id`; `sourceKey` recalculado; respuesta emite IDs nuevos en `extensions.rm.lorebook` | import "Cannot find module update-character-card.use-case" |
| 17 | `withRmExtensions` merge (AC 828) | `application/use-cases/character/sillytavern-card.mapper.test.ts` (extender) | `extensions` con `{rm:{tagline}, other:{x}}` y `extensions.rm` con clave desconocida | `withRmExtensions` setea claves RM conocidas (`version, subtitle, instructions, knowledgeCards, versionNumber, tagline, lorebook`), preserva `other.x` y la clave desconocida de `rm`; `readRmExtensions` extrae solo conocidas; `extensions.rm.version === 1` | `withRmExtensions`/`readRmExtensions` undefined (import del mapper existente falla) |
| 18 | Card round-trip field loss = 0 (AC 828) | `application/use-cases/character/sillytavern-card.mapper.test.ts` (extender) | card V3 con `character_book` + `extensions.rm` completo + `assets/nickname` + raíz desconocida + clave desconocida en `extensions.rm` → export → import → export | raíz, `data`, libro, entrada y `extensions.rm` reaparecen verbatim; **field loss = 0**; `unknownFields`/`unknownRootFields` verbatim | assertion del mapper nuevo falla (o import) |
| 19 | `extensions.rm.lorebook` sin `character_book` (AC 826) | `update-character-card.use-case.test.ts` (nuevo) | envelope con `extensions.rm.lorebook` pero sin `character_book` | huella ignorada: no se crea libro, no se enlaza; la versión queda sin lorebook | import "Cannot find module update-character-card.use-case" |
| 20 | Card PUT validación (AC 826) | mismo | name vacío; `system_prompt` 20 001 chars; > `MAX_LOREBOOK_ENTRIES` entradas | `INVALID_CARD_NAME`; `INVALID_CARD_FIELD_TOO_LARGE`; rechazo por límite de entradas; `description`/`first_mes` con fallback; `saveVersion` llamado exactamente una vez | import del use case |
| 21 | Prompt — versión enlazada (AC 822/823) | `application/services/conversation-context-loader.service.test.ts` (extender) | conversación fijada a v1 con `lorebookVersionId`; libro vivo editado a v2 | loader llama `findVersionById` (no `findByCharacterId`) y usa entradas/ajustes de v1; el `lorebook` resultante refleja v1 | `findVersionById` no definido en el mock → "is not a function" |
| 22 | Prompt — eliminado / sin vínculo (AC 823) | mismo (extender) | contenedor con `deleted_at`; versión enlazada presente; y caso sin `lorebookVersionId` | eliminado → la versión sigue leyéndose y el prompt funciona; sin vínculo → `lorebook` null (sección ausente, paridad con hoy) | assertion del nuevo camino falla (loader aún usa `findByCharacterId`) |
| 23 | Paridad preview/send (AC 822) | `application/use-cases/conversation/get-prompt-context.parity.test.ts` (extender) o nuevo `get-prompt-context.s133-parity.test.ts` | misma conversación con lorebook versionado; `buildRepos` gana `lorebookRepository.findVersionById` | `preview.systemPrompt === send.context.systemPrompt` y `manifest` igual; manifiesto expone `lorebook.versionNumber`/`sourceKey` opcionales | `findVersionById` no existe en el repo mock → parity se rompe o lanza |
| 24 | UI diálogo Crear (AC 841) | `components/shared/create-dialog.test.tsx` (nuevo, RTL) | render del diálogo | dos placas (Personaje / Lorebook), **sin** `role="tab"`; enlaces a `/characters/new` y `/lorebooks/new`; `Esc` cierra y devuelve foco | import "Cannot find module create-dialog" (o `getByRole("tab")` falla si usan tabs) |
| 25 | UI shell Biblioteca (AC 841) | `components/layout/app-shell.test.tsx` (nuevo, RTL) | render `AppShell` con `pathname` | grupo «Biblioteca»/«Library»; ítems Personajes (`/`), Lorebooks (`/lorebooks`), Personajes jugados (`/player-characters`); `aria-current="page"` correcto en los tres (no `startsWith("/")` a secas) | import falla o `getByLabelText` de Lorebooks no existe |
| 26 | UI página personaje + secciones (AC 843–848) | `components/character/character-page.test.tsx` + `sections/*` (nuevo, RTL) | crear (vacío) y detalle | nav sticky con Identidad/Card/Fichas/Lorebook/Versiones; placeholders en creación; «Fichas» (ES) / «Knowledge cards» (EN); selector lorebook con estados `current/outdated/deleted`; cambiar/quitar → **una** llamada a `PUT /characters/:id` (spy ×1, sin doble versión) | import "Cannot find module character-page" |
| 27 | UI páginas lorebook (AC 854) | `components/lorebook/lorebook-list.test.tsx` + `lorebook-page.test.tsx` (nuevo, RTL) | directorio; `/lorebooks/new`; `/lorebooks/:id` | directorio lista libros; crear crea v1 **sin vínculo**; detalle con selector de versión y versión antigua read-only (banner «solo lectura») | import "Cannot find module lorebook-list/lorebook-page" |
| 28 | UI estados vacíos (AC 843) | `character-page` / `lorebook-list` tests (nuevo, RTL) | sin personajes, sin lorebooks, personaje sin fichas, sin lorebook, libro sin entradas | cada estado vacío muestra su mensaje/CTA correspondiente | import del componente |
| 29 | Compat S132 (AC 839) | `infrastructure/adapters/primary/routes/lorebook.routes.test.ts` + `sillytavern-card.routes.test.ts` (extender) + nuevo `lorebooks.routes.test.ts` | `GET /characters/:id/lorebook`, `POST /characters/cards/*`, `POST /lorebooks/preview` | siguen respondiendo; `LorebookDTO.characterId` derivado del personaje de la ruta en rutas compat; montaje de `/api/lorebooks` **antes** de `/characters/:id` | nuevo router `lorebooks.routes.ts` ausente → import falla / 404 |
| 30 | Regresiones S129–S132 (AC 856) | suite existente + `pnpm --filter @workspace/backend eval` | snapshots S129 (sin campos nuevos) | snapshots intactos (byte-idénticos para versiones sin campos nuevos); suites S129–S132 verdes | no es rojo de autoría; gate de implementación |

## 4. Inventario de ficheros de test

**Nuevos (backend):** `migration-0020.test.ts`, `lorebook-versions.backfill.test.ts`,
`source-key.test.ts`, `create-lorebook.use-case.test.ts`, `update-lorebook.use-case.test.ts`,
`get-lorebook-version.use-case.test.ts` (+ `list-lorebooks`/`list-lorebook-versions` si se
agrupan), `get-character-card.use-case.test.ts`, `update-character-card.use-case.test.ts`,
`lorebooks.routes.test.ts`.

**Extender (backend):** `drizzle-lorebook.repository.test.ts` (versionado),
`sillytavern-card.mapper.test.ts` (`withRmExtensions`/round-trip),
`conversation-context-loader.service.test.ts` (fuente = versión enlazada),
`get-prompt-context.parity.test.ts` (o nuevo `.s133-parity`), `lorebook.routes.test.ts`
y `sillytavern-card.routes.test.ts` (compat), `update-character.use-case.test.ts` y
`create-character.use-case.test.ts` (`lorebookVersionId` link/change/remove/undefined/null).

**Nuevos (frontend):** `create-dialog.test.tsx`, `app-shell.test.tsx`,
`character-page.test.tsx` + tests de secciones, `lorebook-list.test.tsx`,
`lorebook-page.test.tsx`.

**Mover / reescribir / retirar (frontera crítica):**

- `character-form.test.tsx` — **retirar**: aserta pestañas que S133 elimina; lo
  sustituyen `create-dialog.test.tsx` (placas) y `character-page.test.tsx`.
- `character-form-fields.test.ts` — **mover** a `components/lorebook/` (el módulo
  `character-form-fields` que prueba migra a `components/lorebook/`); conservar el
  round-trip puro, ajustar import.
- `character-form-utils.test.ts` — **conservar** si el helper sobrevive; si muere con
  `character-form.tsx`, retirar con él.
- `lorebook-editor.test.tsx` — **mover** a `components/lorebook/` (el componente se
  mueve); conservar aserciones, ajustar import.
- `app-menubar.test.tsx` — **conservar** (el menubar no cambia); el shell se cubre con
  `app-shell.test.tsx` nuevo.

**Existing tests that WILL break after 0020 (los actualiza el `slice-test-author`):**

1. `migration-0019.test.ts` — `runMigrations` ahora aplica **toda** la cadena, así que
   los asserts "enforces one lorebook per character with a unique index" (líneas ~179)
   y "cascades lorebooks with the character" (~203, FK `character_id` CASCADE) quedan
   **falsos** tras 0020. El `slice-test-author` debe relajarlos/eliminarlos en el commit
   de red tests (son invariantes que el slice retira a propósito). El `entryFk`
   (entradas cascade) sí se conserva. El implementador no edita tests.
2. `drizzle-lorebook.repository.test.ts` — "enforces UNIQUE(character_id)" (~114) y
   "cascades the book and its entries when the character is deleted" (~131) contradicen
   el modelo nuevo (sin índice único, borrar personaje **no** borra el libro). Reescritura
   requerida por el `slice-test-author` hacia las invariantes nuevas.
3. `lorebook.use-case.test.ts` / `character-create-lorebook.routes.test.ts` — la resolución
   compat cambia de `findByCharacterId` a "libro de la versión actual del personaje"; los
   mocks de `findByCharacterId` pueden dejar de ser ejercitados. El `slice-test-author`
   los revisa y ajusta; no se rompen.

## 5. Fixtures

Deterministas, sin red, en memoria. Reutilizar `sillytavern-fixtures.ts` y
`message-history.ts`; añadir builders en `test-utils/`:

- `buildS132CharacterWithVersions(db)` (o inserts directos en `beforeAll`): personaje +
  2 `character_versions` + 1 `lorebooks` (`character_id` seteado, `current_version_id` NULL)
  + 2 `lorebook_entries` ordenadas por `order`. Para backfill y migración.
- `buildVersionedLorebookFixture(overrides)`: contenedor + `LorebookVersion` (v1/v2) con
  `entries_json` serializado; para repo/use-case/card/prompt.
- `buildCardWithRmExtensions()`: card V3 con `character_book`, `extensions.rm` completo
  (`subtitle, instructions, knowledgeCards, versionNumber, tagline, lorebook`), una clave
  desconocida dentro de `extensions.rm`, `assets`/`nickname` en `data` y raíz desconocida;
  para round-trip field loss = 0. (Basado en `buildCardWithUnknownFields` de S132 + RM.)
- `buildCardWithImportedLorebookIds()`: card con `extensions.rm.lorebook = { lorebookId,
  lorebookVersionId, versionNumber, sourceKey, originId }` importados (distintos de los
  locales) para probar que `PUT /card` no los reutiliza.
- Reutilizar `buildRepos`/`buildConversation`/`buildMessage` de `get-prompt-context.parity.test.ts`
  y añadir `lorebookRepository.findVersionById` al mock (`conversation-context-loader.service.test.ts`
  y parity).

Sin `vi.useFakeTimers`, sin `fetch` real, sin dependencias nuevas. Mocks de puertos vía
objetos `as never` (patrón existente).

## 6. Comandos (etapa red)

```sh
pnpm --filter @workspace/backend test
pnpm --filter @workspace/frontend exec vitest run
# target para iterar (opcional):
pnpm --filter @workspace/backend test migration-0020
pnpm --filter @workspace/backend test backfill
pnpm --filter @workspace/frontend exec vitest run src/components/layout/app-shell.test.tsx
```

`pnpm --filter @workspace/backend eval` es el ancla S129 de la **etapa eval**, no se
exige en la etapa red. `pnpm check` / `pnpm build` / `pnpm audit --prod` son el gate
final, no del rojo.

## 7. Checklist de rojo válido

- **Rojo válido:** "Cannot find module `<nuevo>`", "`X` is not a function", tabla/columna
  ausente (`PRAGMA` vacío o throw), 404 de ruta nueva, componente ausente (render throw),
  o assert de comportamiento no implementado.
- **Infra (no es rojo válido):** no encuentra vitest, puerto ocupado en supertest,
  permiso de `mkdtempSync`, alias `@workspace/shared` roto, `fetch`/red, timers flaky,
  error de setup/jsdom. Corregir el entorno, no el contrato.
- **Test pasa inesperadamente:** o el comportamiento ya existe (S132 ya lo hacía, p.ej.
  un assert que no toca lo nuevo), o la aserción es débil. Verificar con `git grep` que el
  símbolo/símbolo realmente falta y endurecer la aserción (p.ej. asertar `findVersionById`
  llamado y `findByCharacterId` **no** llamado, no solo el resultado final).
- Si un test es imposible de dejar en rojo sin producción (p.ej. un `PRAGMA` que ya devuelve
  algo), documentar el rojo esperado en la columna y mantenerlo; el rojo se materializará
  en la primera ejecución tras la implementación parcial.

## 8. Formato de registro para `## Red tests` (lo rellena el orquestador)

- **Comando** (uno por línea, con filtro si se usó).
- **Fallo esperado** por bloque (migración/backfill/source-key/repo/use-case/card/prompt/UI).
- **Salida relevante**: resumen de `vitest` (p.ej. `27 failed, 3 passed`), y las 3–5
  razones de fallo representativas (mensajes de import/`not a function`/`PRAGMA`).
- **Counts** finales por suite.
- Nota si algún rojo fue infra (y se corrigió) o si algún test pasó de más (y por qué).

## 9. Fuera de alcance (no escribir tests)

Historial completo de versiones, restore, listas de uso/vínculo, soft-delete/restore UI,
reconstrucción por `origin_id`/`source_key` al reimportar, import/export por libro,
picker de saludo alternativo, promoción de `nickname`, múltiples lorebooks por versión de
personaje, lorebook avanzado ST (timed/probability/grupos/decoradores/`vectorized`),
chats/JSONL/CHARX/group chats/assets V3.

## 10. Open questions (no inventar comportamiento, no ensanchar el slice)

1. **Tests existentes que 0020 rompe.** `migration-0019.test.ts` (índice único + cascade)
   y `drizzle-lorebook.repository.test.ts` (UNIQUE + cascade) asertan invariantes que el
   slice retira. No están en el inventario del RFC. Resuelto: los actualiza el
   `slice-test-author` en el commit de red tests (son tests, no producción nueva) y el
   reviewer lo verifica. El implementador no edita tests.
2. **Retorno de `saveLiveHeadAndVersion`.** El puerto nuevo no fija su retorno exacto
   (el contrato público es `PUT /lorebooks/:id → { lorebook, createdNewVersion }`).
   Recomendación: asertar `createdNewVersion` en el límite de use-case/ruta, no congelar
   la firma interna del repo (patrón "contract a confirmar" de S132).
3. **`toCharacterVersionDTO` ya no es puro.** Rellenar `lorebookVersion` (resumen con
   `entryCount`, `status`) exige el contenedor/versión, que hoy el mapper no recibe.
   Recomendación: probar el resumen a nivel de `get-character.use-case` (mock del repo),
   no del mapper puro; ajustar `update-character.use-case.test.ts`/`list-character-versions`
   si el mapper gana un parámetro de resumen.
4. **`source-key.test.ts` debe ser conductual.** No congelar la serialización exacta
   (orden de claves interno); asertar equivalencia/inequivalencia (mismo key ante reorden
   de claves/IDs/`order` sin reorden relativo; distinto ante reorden relativo o cambio de
   contenido/ajustes). Evita romper por cambios benignos de implementación.
5. **Nombres de rutas/router.** Nuevo recurso `lorebooks.routes.ts` (plural) vs compat
   `lorebook.routes.ts` (singular). Los tests de `lorebooks.routes.test.ts` importan
   `buildLorebooksRouter` (o similar); confirmar el nombre de export en la etapa de
   implementación sin que el test pinte de más.
