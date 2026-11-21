# S134 — Test plan (handoff para `slice-test-author`)

Contrato: `docs/10-slices/S134-progress.md` (RFC, Aprobado, commit `91b0bd7`).
Este plan fija nombres/firmas, la matriz de tests y las dos clarificaciones de
contrato que el test-author **no** debe codificar mal. No re-decide la API ni
reabre las decisiones de gate. Formato: `S133-test-plan.md`.

## 1. Scope y principio de red-test

Un test debe fallar en rojo **por la razón esperada**: falta módulo/tipo, falta
método del puerto, falta endpoint/ruta, falta componente, o comportamiento no
implementado. **No** debe fallar por fixtures ausentes, red, timers flaky,
setup de test ni config.

Los rojos S134 serán "Cannot find module …", "`<método> is not a function`"
(método nuevo del puerto), 404 de ruta nueva, o `getByRole(...)`/`getByText(...)`
que no encuentra el componente/acción. Esa es la razón aceptable para un rojo en
esta etapa.

## 2. Clarificaciones de contrato (bloquear antes de escribir tests)

1. **Uso «Historial» = versiones anteriores.** `docs/16` §4.2 y el prototipo
   (`lorebook-detail.html`, «Historial de versiones anteriores») definen
   «Historial» como versiones de personaje que usaron versiones **anteriores**
   del libro (`versionNumber < seleccionada`). La línea del RFC «cualquier otra
   versión» es una errata. **Aserciones:** «En uso por» = igualdad exacta con la
   versión seleccionada; «Historial» = `versionNumber < seleccionada`; una
   versión de personaje que usa una versión **más nueva** que la seleccionada
   **no** aparece en «Historial» para esa selección.

2. **Restore de versión fuerza versión nueva.** El RFC dice «restaurar como
   versión nueva» y el prototipo «Restaurar una versión antigua crea una versión
   nueva; el historial no se reescribe». `saveLiveHeadAndVersion` solo crea
   versión cuando cambia `sourceKey`, así que **no sirve tal cual** para un
   restore explícito (un restore de una versión cuyo contenido canónico ya es el
   de la cabeza no-op silenciosamente — erróneo).
   - `versionId === current_version_id` → **200 `{ lorebook, createdNewVersion: false }`** (no-op, sin escritura). Es lo que dice el RFC («Si la versión antigua es ya la actual, `createdNewVersion: false`»). **No** es 409; la UI oculta/deshabilita «Restaurar» para la versión actual, así que el guard es defensivo.
   - `versionId !== current_version_id` → **siempre** crea versión nueva, incluso si el `sourceKey` del contenido restaurado ya coincide con el actual (se permite duplicar `sourceKey`). Asertar `versionNumber = MAX+1`, `current_version_id` apunta a la nueva, la versión antigua queda intacta, y la cabeza viva refleja el contenido restaurado.

3. **Acciones de import (matriz explícita).** Por el RFC (tabla de acción,
   líneas 334–346): `live-identical → reuse`; `deleted-identical → restore`;
   `live-different → new-version`; `deleted-different → new-book`;
   `manual-identical (source_key sin origin_id) → reuse/restore (confirmación)`;
   `manual-different → new-book`; sin match → `new-book`. **Solo** `new-version`
   es compatible con `live-different` según la tabla; si el reviewer quiere
   permitir `new-book` también ahí (lo sugiere `docs/16` §6.2), es una pregunta
   abierta (ver §9), no la adivines.

4. **Sin migración nueva.** Probar solo `0020` (regresión). No diseñar `0021`.

## 3. Contrato a fijar (símbolos que los tests importan)

**Puerto `LorebookRepository`** (`domain/ports/lorebook.repository.ts`) gana:

- `softDelete(id: string): Promise<void>`
- `restoreVersionAsNewHead(book: Lorebook, entries: LorebookEntry[], sourceVersion: LorebookVersion): Promise<SaveLiveHeadResult>` — **siempre** crea versión (fuerza), a diferencia de `saveLiveHeadAndVersion`.
- `findUsageVersions(lorebookId: string): Promise<LorebookUsageRow[]>` con `LorebookUsageRow = { characterVersionId, characterVersionNumber, characterId, characterName, lorebookVersionNumber }` (query 1).
- `findCurrentCharacterVersionNumbers(characterIds: string[]): Promise<Array<{ characterId, versionNumber }>>` (query 2, para marcar `actual`).
- `findBooksByOriginId(originId: string): Promise<Lorebook[]>` (tie-break vivo → actual → más antiguo en el use case).
- `findVersionsBySourceKey(sourceKey: string): Promise<LorebookVersion[]>`.
- `findVersionsByIds(ids: string[]): Promise<LorebookVersion[]>` y `findByIds(ids: string[]): Promise<Lorebook[]>` (batch I1).
- `listSummaries(input?: { limit?: number; offset?: number; filter?: "all" | "in-use" | "unused" }): Promise<LorebookSummary[]>` — amplía `listSummaries()`; `LorebookSummary` gana `usageVersionCount: number`.

**Use cases nuevos** (`application/use-cases/character/lorebook/`):

- `soft-delete-lorebook.use-case.ts` → `SoftDeleteLorebookUseCase.execute(id): Promise<void>` (404 `LOREBOOK_NOT_FOUND` si no existe o ya eliminado).
- `restore-lorebook-version.use-case.ts` → `RestoreLorebookVersionUseCase.execute({ lorebookId, versionId }): Promise<{ lorebook: LorebookDTO; createdNewVersion: boolean }>`.
- `get-lorebook-usage.use-case.ts` → `GetLorebookUsageUseCase.execute({ lorebookId, versionId? }): Promise<LorebookUsageDTO>`.
- `link-lorebook.use-case.ts` → `LinkLorebookUseCase.execute({ lorebookId, characterId, versionId? }): Promise<CharacterVersionDTO>` (delega en `UpdateCharacterUseCase`; 409 `LOREBOOK_LINK_UNCHANGED`).
- `import-lorebook-preview.use-case.ts` → `ImportLorebookPreviewUseCase.execute({ format, payload }): Promise<ImportLorebookPreview>`.
- `import-lorebook-standalone.use-case.ts` → `ImportLorebookStandaloneUseCase.execute({ format, payload, action }): Promise<ImportLorebookResult>` (nombre distinto al `import-lorebook.use-case.ts` legacy).
- Modificar: `create-conversation.use-case.ts` (`greetingIndex`), `export-lorebook.use-case.ts` (`executeById({ lorebookId, versionId, format })`).

**Rutas** (`infrastructure/adapters/primary/routes/lorebooks.routes.ts`): `POST /lorebooks/:id/versions/:versionId/restore`, `DELETE /lorebooks/:id`, `GET /lorebooks/:id/usage`, `POST /lorebooks/:id/link`, `POST /lorebooks/import/preview`, `POST /lorebooks/import`, y `POST /lorebooks/:id/export` gana `versionId?`. Nuevos deps en `buildLorebooksRouter`.

**Errores** (vía `DomainError` o subclases en `domain/errors.ts`): `LOREBOOK_NOT_FOUND` 404, `LOREBOOK_VERSION_NOT_FOUND` 404, `LOREBOOK_LINK_UNCHANGED` 409, `IMPORT_ACTION_MISMATCH` 409, `IMPORT_STALE_MATCH` 409, `INVALID_GREETING` 400. Reutiliza `INVALID_CARD_JSON` (400), `CHARACTER_NOT_FOUND`, `INVALID_VERSION_FOR_CHARACTER`.

**Shared** (`packages/shared/src/types/`): `lorebook.ts` gana `LorebookSummaryDTO.usageVersionCount?`, `LorebookUsageVersion`, `LorebookUsageCharacter`, `LorebookUsageDTO`, `LinkLorebookInput`, `ImportLorebookAction = "reuse" | "restore" | "new-version" | "new-book"`, `ImportLorebookPreview`, `ImportLorebookResult`, `ImportLorebookInput`. `conversation.ts` gana `CreateConversationInput.greetingIndex?: number`.

**Frontend:** `lib/api/lorebooks.ts` gana `restoreLorebookVersion`, `deleteLorebook`, `getLorebookUsage`, `linkLorebook`, `importLorebookPreview`, `importLorebook`, y `exportLorebook(id, format, versionId?)`. Componentes nuevos: `components/lorebook/lorebook-link-section.tsx`, `lorebook-danger-section.tsx`, `lorebook-link-dialog.tsx`, `lorebook-import-dialog.tsx`, `lorebook-restore-dialog.tsx`, `use-lorebook-actions.ts`, `use-lorebook-usage.ts`, `components/shared/alternate-greeting-picker.tsx`. Modificados: `lorebook-page.tsx`, `lorebook-versions-section.tsx`, `lorebook-list.tsx`, `character-page-actions.tsx`, `sections/versions-section.tsx`, `character-list.tsx`.

**i18n** (`en.ts`/`es.ts`): añadir `lorebooks.restoreVersion`, `.restoreHint`, `.inUseBy`, `.history`, `.linkToCharacter`, `.linkCreatesVersion`, `.linked`, `.linkUnchanged`, `.delete`, `.deleteTitle`, `.deleteWarning`, `.deleted`, `.import`, `.importPreview`, `.restoreHistory`, `.createNewBook`, `.createNewVersion`, `.reuse`, `.usageCharactersVersions`, `.exportVersion`, `.versionRestored`; `characters.greetingPickerTitle`, `.greetingPickerFirstMes`, `.greetingPickerAlternate`, `.greetingPickerConfirm`. Eliminar `lorebooks.linkDeferredTitle`, `.linkDeferred`, `.versionsDeferred`, `characters.tabCards`.

## 4. Matriz de tests

Columna AC = criterio de aceptación del RFC. "Rojo esperado" = razón exacta del
fallo en la etapa red.

| # | Área / AC | Fichero (runner) | Fixture / acción | Aserciones clave | Rojo esperado |
| --- | --- | --- | --- | --- | --- |
| 1 | Migración 0020 regresión (AC 13) | `infrastructure/database/migrations/migration-0020.test.ts` (extender) | leer journal + PRAGMAs | columnas/índices/FKs de 0020 siguen válidos; `_journal.json` **sin** `idx:21` (no hay 0021) | `entry` undefined para idx 21 (si aparece) → regresión |
| 2 | Soft delete (AC 7) | `application/use-cases/character/lorebook/soft-delete-lorebook.use-case.test.ts` (nuevo) | libro vivo + 2 versiones + versiones de personaje enlazadas | `deleted_at` seteado; versiones y `character_versions` intactas; `listSummaries` no lo devuelve; segundo `execute` → 404 `LOREBOOK_NOT_FOUND` | "Cannot find module …/soft-delete-lorebook.use-case" |
| 3 | Repo softDelete (AC 7) | `drizzle-lorebook.repository.test.ts` (extender) | `softDelete(id)` | fila `deleted_at != NULL`; `findById` sigue devolviendo el libro (con `deletedAt`) | `repository.softDelete is not a function` |
| 4 | Restore fuerza nueva (AC 5, clarif. 2) | `restore-lorebook-version.use-case.test.ts` (nuevo) | v2 actual; restore v1 cuyo contenido **==** cabeza actual (sourceKey duplicado) | `createdNewVersion: true`; `versionNumber = 3`; `current_version_id` → v3; v1 intacta; cabeza viva = contenido v1 | "Cannot find module …/restore-lorebook-version.use-case" |
| 5 | Restore de la actual = no-op (AC 5) | mismo | restore `versionId === current_version_id` | 200 `createdNewVersion: false`; sin fila nueva; `current_version_id` sin cambios | mismo import (rojo previo al assert) |
| 6 | Restore negativos (AC 5) | mismo | versión de otro libro; libro eliminado | `LOREBOOK_VERSION_NOT_FOUND` 404 / `LOREBOOK_NOT_FOUND` 404 | import del use case |
| 7 | Usage agrupado por personaje (AC 4, clarif. 1) | `get-lorebook-usage.use-case.test.ts` (nuevo) | 2 personajes; cv usan v1, v2, v3; seleccionada v2 | «En uso por» = solo `lorebook_version_id == v2`; «Historial» = solo `versionNumber < 2` (v1); la cv que usa v3 **no** aparece en ninguna lista; `actual` = `MAX(version_number)` por personaje | "Cannot find module …/get-lorebook-usage.use-case" |
| 8 | Usage sin N+1 (AC 4) | mismo (spy) | mock repo con `findUsageVersions`/`findCurrentCharacterVersionNumbers` | ambas llamadas una vez; `findVersionById` **no** llamado por fila | `repository.findUsageVersions is not a function` |
| 9 | Usage libro eliminado (AC 4) | mismo | `deleted_at` seteado | 404 `LOREBOOK_NOT_FOUND` | import del use case |
| 10 | Link crea versión (AC 6) | `link-lorebook.use-case.test.ts` (nuevo) | personaje con v1 sin libro; `POST link { characterId, versionId }` | `saveVersion` ×1 (copy-from-prev); nueva versión con `lorebook_version_id = versionId`; versión previa sin mutar; devuelve `CharacterVersionDTO` | "Cannot find module …/link-lorebook.use-case" |
| 11 | Link unchanged (AC 6) | mismo | versión actual ya usa exactamente esa versión | 409 `LOREBOOK_LINK_UNCHANGED`; sin `saveVersion` | import del use case |
| 12 | Link negativos (AC 6) | mismo | libro eliminado; versión de otro libro; personaje inexistente | 404 `LOREBOOK_NOT_FOUND` / `LOREBOOK_VERSION_NOT_FOUND` / `CHARACTER_NOT_FOUND` | import del use case |
| 13 | Import preview matching (AC 8, clarif. 3) | `import-lorebook-standalone.use-case.test.ts` (nuevo) | 6 payloads: origin_id vivo/eliminado × idéntico/diferente; source_key manual idéntico/diferente | `suggestedAction` correcto por caso (reuse/restore/new-version/new-book/reuse|restore/new-book); `matched`/`book.usedByCharacters` correctos | "Cannot find module …/import-lorebook-standalone.use-case" |
| 14 | Import acción aplica (AC 8) | mismo | mismo payload con `action` correcta | reuse → sin escritura; restore → `deleted_at = NULL`; new-version → versión nueva + `current_version_id`; new-book → contenedor + v1 | import del use case |
| 15 | Import negativos (AC 8) | mismo | `action` incompatible; match cambiado entre preview y confirmación | 409 `IMPORT_ACTION_MISMATCH` / `IMPORT_STALE_MATCH`; JSON inválido → 400 `INVALID_CARD_JSON` | import del use case |
| 16 | Colisión origin_id (AC 8) | mismo | eliminado + diferente → new-book | libro nuevo recibe `origin_id` **nuevo** (≠ importado); el eliminado conserva su `origin_id` | import del use case |
| 17 | Repo matching helpers (AC 8) | `drizzle-lorebook.repository.test.ts` (extender) | dos libros mismo `origin_id` (vivo + eliminado) | `findBooksByOriginId` devuelve ambos; tie-break vivo→actual→más antiguo en el use case | `repository.findBooksByOriginId is not a function` |
| 18 | Export por versión (AC 9) | `export-lorebook.use-case.test.ts` (extender) | export `versionId` de una versión **no** actual | CCv3 + ST native salen de `entries_json` de la versión seleccionada (no cabeza viva); `extensions.rm = { version: 1, originId }`; round-trip `source_key` estable | `executeById` sin `versionId` (assert falla) / import |
| 19 | Saludo alternativo (AC 11) | `create-conversation.use-case.test.ts` (extender) | `greetingIndex` 0/undefined, 1, fuera de rango, versión inexistente | mensaje 0 = `normalizeUserContent(first_mes)` (0/undef) o `alternateGreetings[i-1]`; fuera de rango → 400 `INVALID_GREETING`; solo mensaje 0 afectado | `greetingIndex` no en `CreateConversationInput` (TS) / assert |
| 20 | Prompt/card tras soft delete (AC 7) | `conversation-context-loader.service.test.ts` + `get-character-card.use-case.test.ts` (extender) | libro eliminado; versión enlazada presente | loader/card leen `findVersionById` (no `findByCharacterId`); prompt funciona; `status === "deleted"` en resumen | `findVersionById` no definido en mock |
| 21 | Paridad preview/send (AC 14) | `get-prompt-context.parity.test.ts` (extender) | conversación con versión enlazada | `preview.systemPrompt === send.context.systemPrompt`; manifiesto con `lorebook.versionNumber`/`sourceKey` | `findVersionById` no existe en repo mock |
| 22 | Limpieza I1 batch (AC 12) | `get-character.use-case.test.ts` (extender) | personaje con N versiones enlazadas | `findVersionsByIds`/`findByIds` llamados una vez con todos los ids; `findVersionById` **no** llamado por versión | `repository.findVersionsByIds is not a function` |
| 23 | Limpieza N1 ids sintéticos (AC 12) | `lorebook.mapper.test.ts` (extender) | `toLorebookVersionDTO(version)` con entradas sin `id` | cada `entries[i].id` = `sourceId ?? \`entry-${i}\``, estable por posición; round-trip estable | entries sin `id` → DTO los tenía `undefined` (assert falla) |
| 24 | Limpieza N4 paginación SQL (AC 3) | `list-lorebooks.use-case.test.ts` + `drizzle-lorebook.repository.test.ts` (extender) | `listSummaries({ limit, offset, filter })` | `LIMIT/OFFSET` + pushdown `EXISTS`/`NOT EXISTS`; `usageVersionCount` real; sin `slice` en memoria (spy del repo recibe `filter`) | `listSummaries` ignora input / `usageVersionCount` undefined |
| 25 | Rutas nuevas + códigos (AC 5–9) | `lorebooks.routes.test.ts` (extender) | supertest/fetch contra cada ruta | restore 200, DELETE 204, usage 200, link 201, import/preview 200, import 200/201, export `versionId` 200; 404/400/409 según caso; legacy `POST /characters/:id/lorebook/import` sigue respondiendo | 404 (ruta no montada) o deps faltante |
| 26 | Mount + origen (AC 14) | `lorebooks.routes.test.ts` (extender, assert fuente) | leer `server.ts` | `buildLorebooksRouter` montado bajo `/api` antes de `/characters/:id`; rutas mutantes heredan `buildApiOriginGuard` del mount `/api` (no hay guard por ruta) | assert de montaje falla si falta dep |
| 27 | Biblioteca filtros/uso (AC 3) | `lorebook-list.test.tsx` (extender, RTL) | summaries con `usageCount`/`usageVersionCount` | «Usado por N personajes · M versiones» / «Sin usar»; botón filtro pasa `filter` a `listLorebooks` | texto de uso ausente (assert falla) |
| 28 | Detalle sección Vínculo (AC 4) | `lorebook-link-section.test.tsx` (nuevo, RTL) | `getLorebookUsage` con 2 personajes | «En uso por» / «Historial» agrupados; filas `vN · actual` / `vM · histórica`; partición correcta | "Cannot find module lorebook-link-section" |
| 29 | Peligro + diálogo borrado (AC 7) | `lorebook-danger-section.test.tsx` (nuevo, RTL) | libro vivo | aviso de `docs/16` §5.1; confirmar → `deleteLorebook`; navega a `/lorebooks` | "Cannot find module lorebook-danger-section" |
| 30 | Versiones restore + read-only (AC 5) | `lorebook-versions-section.test.tsx` (nuevo, RTL) | versiones v1/v2 (v2 actual) | botón «Restaurar como versión nueva» por fila **no** actual; sin `versionsDeferred`; versión antigua read-only | `getByRole("button", { name: /Restaurar/i })` ausente |
| 31 | Diálogo import preview+confirm (AC 8) | `lorebook-import-dialog.test.tsx` + `lorebook-restore-dialog.test.tsx` (nuevos, RTL) | payload con match | `importLorebookPreview` → match → confirmación → `importLorebook` con la `action` sugerida; sin match → libro nuevo | "Cannot find module lorebook-import-dialog" |
| 32 | Diálogo vínculo (AC 6) | `lorebook-link-dialog.test.tsx` (nuevo, RTL) | select personaje | aviso «Esto crea una versión nueva del personaje»; `linkLorebook` llamado; toast con nombre | "Cannot find module lorebook-link-dialog" |
| 33 | Picker saludo (AC 11) | `components/shared/alternate-greeting-picker.test.tsx` (nuevo, RTL) | versión con `alternateGreetings` | se muestra solo si `length > 0`; radio/lista + preview; `onConfirm(index)`; cableado en `character-page-actions`, `versions-section`, `character-list` | "Cannot find module alternate-greeting-picker" |
| 34 | i18n + sin botones muertos (AC 13/14) | `en.ts`/`es.ts` (typecheck + tests RTL) | claves nuevas/eliminadas | claves `lorebooks.restoreVersion`… y `characters.greetingPicker*` presentes en ambos idiomas; `linkDeferred*`/`versionsDeferred`/`characters.tabCards` ausentes; sin chips «S134» | `t("lorebooks.restoreVersion")` key missing (typecheck) / texto S134 aún presente |

## 5. Fixtures / builders

Deterministas, sin red, en memoria. Reutilizar:

- `test-utils/sillytavern-fixtures.ts`: `buildLorebookCCv3`, `buildLorebookStNativeObject`, `buildCCv3Entry`, `buildStNativeEntry`, `buildCardWithRmExtensions`, `buildCardWithImportedLorebookIds`.
- `test-utils/message-history.ts` (`buildMessageHistoryRepository`) y `buildRepos`/`buildConversation`/`buildMessage` de `get-prompt-context.parity.test.ts` (añadir `lorebookRepository.findVersionById`).
- Frontend: patrón `vi.hoisted` + `vi.mock("@/lib/api/lorebooks")` de `lorebook-page.test.tsx` / `lorebook-list.test.tsx`; `I18nProvider initialLocale`.

Añadir builders en `test-utils/`:

- `buildVersionedLorebook(db, overrides)` — contenedor + v1/v2/v3 con `source_key` distintos y `entries_json` serializado (restore/usage/export).
- `buildUsageFixture(db)` — 2 personajes con versiones apuntando a v1/v2/v3 (una apuntando a versión **más nueva** para asertar exclusión en «Historial»).
- `buildImportPayloadCCv3({ originId?, contentVariant? })` / `buildImportPayloadStNative` — para los 6 casos de matching + colisión.

Sin `vi.useFakeTimers`, sin `fetch` real, sin dependencias nuevas. Mocks de puertos
vía objetos `as never` (patrón existente).

## 6. Comandos

```sh
# etapa red (iteración del slice-test-author):
pnpm --filter @workspace/backend test
pnpm --filter @workspace/frontend exec vitest run
# target opcional:
pnpm --filter @workspace/backend test restore-lorebook-version
pnpm --filter @workspace/backend test import-lorebook-standalone
pnpm --filter @workspace/frontend exec vitest run src/components/shared/alternate-greeting-picker.test.tsx

# etapa eval / gate final:
pnpm --filter @workspace/backend eval     # ancla S129 (paridad preview/send), no se exige en rojo
pnpm check
pnpm build
pnpm audit --prod
```

`eval`/`check`/`build`/`audit` son el gate final, no del rojo.

## 7. Fuera de alcance (no escribir tests)

- **Matching en `PUT /api/characters/:id/card`** — decisión documentada: conserva S133 (libro+v1). No probar matching ahí; solo la regresión S133 ya existente.
- **Compatibilidad de ST UI más allá del parser** — el parser y el round-trip se prueban; no se valida que ST renderice los efectos.
- **Limpieza de versiones huérfanas / drop de `lorebooks.character_id`** — diferido.
- **Export interno RM schema v2 (`docs/16` §11.2)** — no se toca `EXPORT_SCHEMA_VERSION`.
- **`nickname` en `extensions.rm`** — sigue en `unknownFields`; no se prueba promoción.
- **CHANGELOG a inglés (AC 13)** — lo hace `slice-docs`; el test-author no escribe tests de docs.

## 8. Ambiguidades / riesgos (no adivinar)

1. **Clarificación 1 (Historial).** El texto del RFC «cualquier otra versión» es errata; codificar `versionNumber < seleccionada`. Si el implementer usa el texto literal, el test #7 falla y el reviewer debe corregir la implementación (no el test).
2. **Clarificación 2 (restore fuerza nueva).** `restoreVersionAsNewHead` debe forzar versión aunque `sourceKey` coincida. Asertar en el límite use-case/ruta (`createdNewVersion`, `versionNumber = MAX+1`); no congelar la firma interna del repo (patrón "contract a confirmar" de S132/S133). `restoreVersionAsNewHead` es nombre propuesto; si el implementer prefiere un flag `force` en `saveLiveHeadAndVersion`, ajustar el mock sin pintar de más.
3. **Restore de la actual = 200 no-op** (no 409). El RFC no define `LOREBOOK_VERSION_CURRENT`; no lo inventes.
4. **`live-different` action matrix.** Por la tabla del RFC, solo `new-version`; `new-book` para `live-different` es pregunta abierta (ver §9). No codifiques `new-book` como compatible sin resolverlo.
5. **Colisión de `sourceId` en N1.** `id: sourceId ?? entry-${i}` puede colisionar si dos entradas comparten `sourceId`. Asertar estabilidad por posición y que el frontend deja de depender de `entry.id ?? …`; si el RFC no cubre duplicados, marcar en review (no inventar un desempate en el test).
6. **Robustez de conteo de queries (I1/usage).** Preferir aserciones de forma: `findVersionsByIds` llamado **una** vez con todos los ids y `findVersionById` **no** llamado por fila. Evitar asertar un número literal de llamadas que se rompa por chunking benigno.
7. **Tie-breaks de matching** (vivo→actual→más antiguo) son del use case, no del repo; probarlos a nivel use-case con mocks ordenados, no con SQL.

## 9. Open questions

1. **`new-book` para `live-different`.** `docs/16` §6.2 dice «el usuario decide» entre versión nueva o libro nuevo, pero la tabla de acción del RFC solo asigna `new-version` a `live-different`. El plan codifica `new-version` únicamente. Si el RFC owner quiere `new-book` también, añadir una fila de matching y un caso de `IMPORT_ACTION_MISMATCH` inverso. **Reportado; no lo resuelve el test-author.**
2. **Idempotencia de `softDelete`.** El RFC dice 404 si ya eliminado (idempotente por estado). Confirmar que el use case comprueba `deletedAt` vía `findById` (que hoy no filtra `deleted_at`) antes de escribir.

## 10. Estrategia de ejecución

**En un solo pase** (el `slice-test-author` escribe todo en el commit de red tests),
pero ordenado por capas para que el rojo sea legible: (a) shared/types → (b) puerto
+ use cases → (c) rutas → (d) frontend. **Seguros de escribir antes de producción:**
todos los tests de §4, porque importan símbolos que hoy no existen (rojo de módulo).
Los únicos que **no** son rojos de autoría son #1, #20, #21, #26 (regresión/ancla de
comportamiento ya implementado en S133): son el gate de no-regresión, no red tests.
No retirar ni relajar tests S133 existentes salvo que el propio RFC lo ordene; los
que 0020 rompió ya se ajustaron en S133.
