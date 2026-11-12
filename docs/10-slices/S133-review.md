# S133 — Review

**Estado:** PASS WITH NOTES
**Revisor:** slice-reviewer
**Fecha:** 2026-11-11

## Historial

- Revisión inicial: **BLOCKED** por B1 (los imports S132 creaban lorebooks sin v1 ni enlace).
- Fix `0892bf5` + test `5d804dd`; re-revisión: **PASS WITH NOTES**.

## Verificación del fix B1 (`0892bf5` + `5d804dd`)

El escenario B1 queda **cerrado**. Confirmado sobre el código:

- **`createWithFirstVersion` (`drizzle-character.repository.ts`)** ahora, cuando recibe un `lorebook`, dentro de una única transacción: inserta el libro como standalone (`book.withCharacterId(null)`), inserta las entradas vivas, crea una `LorebookVersion` v1 (`entriesJson` vía `serializeLorebookEntries` + `sourceKey` SHA-256 vía `canonicalizeLorebookContent`), inserta la v1, fija `lorebooks.current_version_id` y actualiza `character_versions.lorebook_version_id = v1.id`. Devuelve `{ character, version: version.withLorebookVersionId(v1.id), lorebookVersion }`.
- **Orden de FKs correcto:** libro antes de versión (FK `lorebook_versions.lorebook_id → lorebooks.id` RESTRICT), versión antes de los dos `UPDATE` (FK `lorebooks.current_version_id → … SET NULL` y `character_versions.lorebook_version_id → … RESTRICT`). Sin doble v1 (una sola inserción por llamada).
- **`import-character.use-case.ts`** aplica `created.lorebookVersion?.id` a **todas** las versiones posteriores (`version.withLorebookVersionId(...)`), y la primera queda enlazada dentro de `createWithFirstVersion`. Todas comparten la v1.
- **`import-sillytavern-card.use-case.ts`** queda arreglado automáticamente: pasa `lorebook` a `createWithFirstVersion`, que ahora enlaza la única versión. No necesita usar el retorno (devuelve `CharacterSummary`).
- **`create-character.use-case.ts`** da precedencia al selector `lorebookVersionId` (`hasOwnProperty`) sobre el payload legacy `input.lorebook`: si el selector está presente, no se construye libro del payload (ambigüedad resuelta); si no, el camino legacy ahora crea v1 + enlace vía el repo.
- **Compatibilidad legacy:** el libro importado queda con `character_id = null` pero enlazado; `findByCharacterId` lo sigue resolviendo por la versión actual (`findBookByCurrentCharacterVersion`), así que `GET /characters/:id/lorebook` (S132) sigue funcionando.
- **Test nuevo (`drizzle-character.repository.test.ts`)** aserta: `lorebookVersion` definida, `version.lorebookVersionId === v1.id`, libro standalone (`characterId === null`), `current_version_id` apuntada, v1 con `versionNumber 1` + `sourceKey` hex-64 + `entriesJson` con el contenido, y `character_versions.lorebook_version_id` = v1.id.

No se detecta ningún bloqueante nuevo introducido por el fix. El import de mappers/`source-key` desde `application/` dentro del repo (infraestructura) mantiene la dirección inward y ya era el patrón de `drizzle-lorebook.repository.ts`; `check:arch` sigue 7/7.

## Hallazgos restantes (notas; ninguna bloquea)

**Nota 1 — N+1 en `GET /characters/:id` (anterior I1).** `get-character.use-case.ts` → `lorebook-version-summary.ts` emiten `findVersionById` + `findById` por versión (2N consultas). Desviación del requisito explícito «sin N+1» del RFC y de la guard-rail de AGENTS.md, con impacto acotado (pocas versiones por personaje). No es bug de corrección; recomendable un batch (`IN (...)`) en una limpieza futura.

**Nota 2 — `toLorebookVersionDTO` deserializa entradas sin `id` (anterior N1).** `lorebook.mapper.ts` hace `JSON.parse(entriesJson) as LorebookEntryDTO[]`; `lorebookEntrySnapshot`/`snapshotEntry`/`readEntry` no incluyen `id`, así que el DTO viola `LorebookEntryDTO.id: string` en runtime. El frontend lo tolera con `key={entry.id ?? ...}`, sin bug funcional. Considerar sintetizar `id` (p. ej. `sourceId ?? entry-<i>`).

**Nota 3 — clave i18n muerta `characters.tabCards` (anterior N2).** `es.ts` (`"Tarjetas"`) y `en.ts` (`"Cards"`) ya no se referencian. No es user-facing (muerta); conviene eliminarla.

**Nota 4 — `extensions.rm` emite `subtitle: null` / `instructions: null` siempre (anterior N3).** El mapper escribe `null` aunque no haya valor, de modo que una card sin `extensions` gana el namespace `rm`. Cosmético; `field loss = 0` se mantiene.

**Nota 5 — paginación en memoria en `list-lorebooks` (anterior N4).** El use case trae todo y hace `slice`, con `usageCount: 0` hardcodeado. Inocuo con pocos libros; difiere del patrón de paginación SQL del resto del repo.

**Nota 6 — ubicación de `canonicalizeLorebookContent` (anterior N5).** Vive en `shared/lib/lorebook-versioning.ts` (re-exportado desde `source-key.ts`), no en `application/...` como el inventario. Benigno: `shared/` es puro (sin `node:crypto`), el hash queda en backend y la firma coincide con los tests.

## Revisión del refactor de fidelidad UI (2026-11-11)

**Alcance:** commits `44d6873..5843a0c` sobre `feat/S133-card-first-character`
(shared + backend + frontend + docs). La revisión fue independiente y read-only;
las capturas de escritorio y móvil se revisaron contra `docs/prototypes/card-first/`.

**Veredicto:** **PASS WITH NOTES**. Sin bloqueantes: no hay botones muertos en los
flujos alcanzables de S133, no se filtraron datos y las acciones restauradas
(nueva conversación, exportación RM/card, eliminación, inspector JSON, vista de
versiones y export de lorebook) están cableadas.

**Hallazgos corregidos después de la revisión:**

- **M1 — barra de guardado:** se añadió «Guardar cambios» en la portada cuando
  se edita y la barra pasa a `position: sticky` en móvil, con ocultación cuando
  no hay cambios. La barra inferior sigue mostrando el estado en escritorio.
- **M2 — test de ruta de export:** se añadió cobertura de
  `POST /api/lorebooks/:id/export` (ccv3, formato inválido → 400 y libro
  inexistente → 404) y `exportLorebook` al arnés de rutas.
- **L1 — enlace a libro eliminado:** «Abrir» se sustituye por una placa
  «Lorebook eliminado» cuando el estado es `deleted` (personaje y rail).
- **L2 — contador de conversaciones:** el diálogo de exportación recibe el
  número real de conversaciones del personaje, no `0`.
- **L3 — entradas del lorebook en la lista:** el `entryCount` del resumen del
  personaje se calcula desde `lorebook_versions.entries_json` de la versión
  enlazada, no desde la cabeza viva.
- **L4 — card de personaje nuevo:** la portada muestra «—» cuando todavía no
  hay `cardCharacterVersion`, en vez de asumir V2.
- **N2 — `onExport` muerto:** se retiró el botón/prop del editor de lorebook; la
  exportación vive en la cabecera del detalle.
- **N3 — versiones en creación:** la sección y el enlace de «Versiones» no se
  muestran al crear un personaje, según `docs/15`.

**Notas que se mantienen (no bloqueantes):**

- **N1 — `<details open>` inicial:** la primera entrada se abre con `open` sin
  `onToggle`; funciona, pero se puede convertir en un acordeón controlado si se
  quiere eliminar cualquier aviso de React.
- **N4 — grano y shell globales:** `card-first.css` se importa en `base.astro`,
  así que el grano y el topbar de tinta también se ven en chat/ajustes. Es
  coherente con el alcance «shell» acordado; si se quiere aislar, habría que
  mover el import a las páginas S133.
- **N5 — `KeyListInput`:** conserva estado local sin resincronizar al cambiar de
  versión; patrón preexistente, no introducido por este refactor.
- **N6 — revisión visual del subagente:** el revisor no tenía entrada de imagen;
  la fidelidad visual se validó con capturas humanas y la inspección de
  CSS/DOM. Las capturas finales están en `/tmp/opencode/s133-refactor/`.

## Recapitulación de verificación

- B1 cerrado: import (card ST, import RM, crear con lorebook) genera v1 + enlace; prompt y `GET /card` ya ven el lorebook importado.
- Refactor UI: PASS WITH NOTES; M1/M2, L1–L4 y N2/N3 corregidos; N1/N4/N5/N6 quedan como notas.
- Sin bloqueantes nuevos: orden transaccional/FKs correcto, sin doble v1, precedencia selector/payload resuelta, compatibilidad S132 preservada.
- Verificación final: `pnpm check` 7/7 + typecheck 5/5 + lint 5/5; backend 158 archivos / 1027 tests; frontend 84 archivos / 452 tests; build 4/4; audit limpio.
- Hallazgos restantes I1/N1–N5 → notas no bloqueantes; estado **PASS WITH NOTES**.
