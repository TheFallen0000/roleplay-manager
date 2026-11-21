# S134 — Biblioteca de lorebooks completa y versionado

**Estado:** En progreso
**Inicio:** 2026-11-14
**Fin:** —

> `Draft` → `Aprobado` → `En progreso` → `Completado`.
> Solo el usuario cambia `Draft` a `Aprobado`.

**Situación:** implementación, tests, revisión independiente y documentación
completos; solo queda la preparación de release (`S134-release.md`). El
orquestador marcará `Completado` al cerrar esa etapa.

## Descripción

S134 completa la fundación que dejó S133: el lorebook pasa de «directorio básico
con selector de versión» a **ciudadano de primera** con historial completo,
restauración, uso por versión, vínculo a personajes, soft delete y
import/export por libro/versión con reconstrucción por huella. Cierra los
endpoints diferidos de `docs/16` §9 (`restore`, `DELETE`, `usage`, `link`,
`import`, `export` por versión), elimina los placeholders S134 de la UI
(`lorebooks.linkDeferred*`, `lorebooks.versionsDeferred`) y añade el
**selector de saludo alternativo** al iniciar conversación (diferido de S133).

Además limpia las notas no bloqueantes de S133 directamente relacionadas
(N+1 de `GET /characters/:id`, ids sintéticos de entrada, paginación SQL y
filtros de la estantería) y corrige el `CHANGELOG.md` a inglés en un commit de
docs separado.

## RFC

### Problema

Evidencia en el código actual (rama `feat/S134-lorebook-library`, base
`master` `bb16c56`, incluye S133):

1. **No hay restore, soft delete, uso, vínculo ni import standalone.**
   `lorebooks.routes.ts` solo monta `GET /lorebooks`, `GET /lorebooks/:id`,
   `GET /lorebooks/:id/versions`, `GET .../versions/:versionId`,
   `POST /lorebooks`, `PUT /lorebooks/:id` y `POST /lorebooks/:id/export`
   (export solo de la cabeza viva, sin `versionId`). El puerto
   `LorebookRepository` (`domain/ports/lorebook.repository.ts`) no expone
   `softDelete`, `restore`, `findUsage`, `findVersionBySourceKey`,
   `findBookByOriginId` ni paginación SQL. Los endpoints `DELETE`,
   `.../versions/:versionId/restore`, `.../usage`, `.../link` y
   `POST /lorebooks/import` de `docs/16` §9 no existen.

2. **La UI muestra placeholders S134, no acciones.** En
   `components/lorebook/lorebook-page.tsx` la sección Vínculo renderiza un
   panel vacío con `lorebooks.linkDeferredTitle` / `lorebooks.linkDeferred` y
   un chip «S134» (líneas 224–229 y 283–289). `lorebook-versions-section.tsx`
   solo ofrece «Ver» (sin «Restaurar») y cierra con `lorebooks.versionsDeferred`
   (línea 75). No hay sección Peligro (borrado), ni diálogos de importar/borrar/
   restaurar/vincular. El detalle no distingue «En uso por»/«Historial».

3. **Paginación en memoria y filtros que mienten.**
   `list-lorebooks.use-case.ts` llama a `listSummaries()` (que ya devuelve
   `usageCount` real — `COUNT(DISTINCT cv.character_id)` vía `lorebook_versions`,
   ver `drizzle-lorebook.repository.ts:340-373`) y luego hace
   `summaries.slice(offset, end)` **en memoria** (N4). No hay pushdown SQL de
   `limit`/`offset` ni de filtro `in-use`/`unused`. El frontend
   (`lorebook-list.tsx`) filtra client-side sobre `usageCount`, que **ya es
   real**, así que los filtros funcionan una vez cargados todos los libros; el
   defecto es de escala (trae todo y pagina en memoria), no un `usageCount`
   falso. Falta además el contador de **versiones** de personaje para el texto
   «Usado por N personajes · M versiones» de `docs/15` §6.3.

4. **N+1 en `GET /characters/:id` (I1).** `get-character.use-case.ts:27-34`
   mapea **todas** las versiones con `toCharacterVersionDTOWithLorebookSummary`,
   y `lorebook-version-summary.ts:15-43` hace `findVersionById` + `findById`
   por versión (2N consultas). Con pocas versiones el impacto es acotado, pero
   viola la guard-rail «sin N+1» y el requisito explícito del RFC S133.

5. **Ids sintéticos ausentes en el DTO de versión (N1).**
   `toLorebookVersionDTO` (`lorebook.mapper.ts:535-549`) hace
   `JSON.parse(version.entriesJson) as LorebookEntryDTO[]`; el snapshot
   `snapshotEntry` (líneas 483-503) **no incluye `id`**, así que en runtime el
   DTO viola `LorebookEntryDTO.id: string`. El frontend lo tolera con
   `key={entry.id ?? ...}` (`lorebook-editor.tsx:179`), pero las keys no son
   estables ni round-trip.

6. **No hay selector de saludo alternativo.** `CreateConversationUseCase`
   (`create-conversation.use-case.ts:76-86`) crea siempre el mensaje 0 con
   `normalizeUserContent(version.greeting)`. `CreateConversationInput` solo
   tiene `characterId` y `versionId`; no hay forma de elegir
   `alternateGreetings`. El dato ya está en `CharacterVersionDTO` y en el
   mapper de ST, pero no hay contrato de selección ni picker UI.

7. **CHANGELOG mixto.** Desde `## [1.50.1]` hasta `## [Unreleased]` el
   `CHANGELOG.md` está en español; `[1.50.0]` y anteriores en inglés. Los
   `scripts/release-notes.mjs` extraen la sección por cabecera `## [X.Y.Z]`
   (no dependen del idioma), pero `AGENTS.md` y `docs/10-slices/WORKFLOW.md`
   afirman que «el CHANGELOG sigue en español», en contradicción con la política
   de release notes en inglés.

**Consecuencia observable:** un usuario no puede restaurar una versión, ver qué
personajes usan un libro, vincularlo desde el libro, borrarlo con aviso,
reimportarlo reconstruyendo historial, exportar una versión concreta ni elegir
un saludo alternativo al conversar. La estantería no escala (trae todo y pagina
en memoria).

### Restricciones

- **Arquitectura hexagonal.** `domain/` puro; `application/` no importa
  `infrastructure/` (excepción documentada: `error-handler`). Los use cases
  nuevos (`soft-delete`, `restore`, `usage`, `link`, `import` con matching)
  orquestan puertos; Drizzle queda en el repo. El matching (`source_key`) es
  `application/` (usa `node:crypto` ya presente en `source-key.ts`); la
  serialización canónica sigue en `shared/lib` (pura) y el hash en backend.
- **Pureza de `shared/`.** Solo tipos y helpers puros; nada de
  `react`/`express`/`drizzle-orm`/`node:crypto`. Los DTOs nuevos
  (`LorebookUsageDTO`, `ImportLorebookPreview`, `greetingIndex`) son tipos.
- **500 líneas / aislamiento de features / archivos sin referencia.** Las
  secciones nuevas (Vínculo, Peligro) son archivos propios; ningún componente de
  `lorebook/` importa de `character/` ni viceversa. La lógica compartida vive en
  `lib/api/` o `components/shared/`.
- **Sin botones muertos.** Cada acción debe mapear a un endpoint real o estar
  ausente. Se retiran los placeholders `linkDeferred*`/`versionsDeferred`.
- **Prototipos como fuente visual.** `docs/prototypes/card-first/lorebook-detail.html`,
  `lorebooks.html`, `lorebook-create.html`, `character-detail.html`. Donde el
  prototipo y los datos reales difieran, el layout sigue al prototipo y el
  comportamiento al modelo de datos.
- **Identificadores/comentarios en inglés; copia de usuario en español neutro**
  (tuteo) en `en.ts`/`es.ts`. Términos técnicos en inglés.
- **Protección de origen de API.** Los endpoints que cambian estado
  (`POST .../restore`, `DELETE`, `POST .../link`, `POST .../import`) pasan por
  el middleware de protección `Origin`/`Sec-Fetch-Site` ya montado.
- **Rendimiento.** Sin N+1 (I1 resuelto por batch; `usage` por batch); listas
  paginadas en SQL; índices ya existentes en `0020`.
- **Backward compatibility S132/S133.** `GET /lorebooks` mantiene respuesta
  array; `GET /lorebooks/:id` de libro eliminado sigue en 404; las rutas
  `/characters/:id/lorebook*` y `/characters/cards/*` no cambian de contrato.
- **Sin migración nueva salvo necesidad estricta.** El schema de `0020` ya
  cubre soft delete, uso, restore y matching (ver `Modelo de datos`).
- **Release fuera de alcance.** El release post-S134 es un `/release` aparte
  (target `1.58.0`, minor); este slice no bumpa versión ni publica.

### Opciones consideradas

#### (a) Forma de la API de uso/vínculo/restore

| Opción | Ventajas | Costes | ¿Elegida? |
| --- | --- | --- | --- |
| **A** | Endpoints dedicados de `docs/16` §9: `GET /:id/usage?versionId=`, `POST /:id/link`, `POST /:id/versions/:versionId/restore`. | Uso bajo demanda (no infla el detalle), selección de versión explícita. | Tres rutas + tres use cases. | **Sí** |
| **B** | Incrustar `usage` en `GET /lorebooks/:id`. | Un solo viaje para el detalle. | `GET /:id` devuelve la cabeza viva; el uso es por-versión (no de la cabeza), y sobrecargar el DTO rompe la separación y añade payload para quien solo lee el detalle. | No |
| **C** | `POST /:id/link` sin `versionId` (siempre la actual). | Cuerpo mínimo. | Impide vincular una versión antigua, contradice `docs/15` §5.5 («libro + versión; por defecto la actual»). | No |

#### (b) Matching/reconstrucción en el import

| Opción | Ventajas | Costes | ¿Elegida? |
| --- | --- | --- | --- |
| **A** | **Dry-run (`POST /lorebooks/import/preview`) + acción explícita** (`POST /lorebooks/import` con `action: reuse\|restore\|new-version\|new-book`). | Sin reconstrucción silenciosa; el preview devuelve el match y la acción sugerida; idempotente. | Dos endpoints; validación de `action` contra el match (stale match). | **Sí** |
| **B** | `POST /lorebooks/import` con `restore: boolean`. | Un solo endpoint. | No expresa `new-version` vs `new-book` (live diferente); `restore` ambiguo con live-idéntico; no hay preview. | No |
| **C** | Matching silencioso (reutilizar sin confirmar). | Sin UI de confirmación. | Contradice `docs/16` §6.2 («el usuario confirma; no se hace en silencio») y `docs/15` §10.6. | No |

#### (c) Semántica de restore y soft delete

| Opción | Ventajas | Costes | ¿Elegida? |
| --- | --- | --- | --- |
| **A** | `DELETE /:id` = `UPDATE deleted_at`; **sin endpoint de restaurar libro** (la restauración del contenedor solo ocurre al reimportar, como dice `docs/16` §5.1). `POST /:id/versions/:versionId/restore` = «crear versión nueva a partir de una antigua» (restauración de **versión**, no de libro). | Fiel a `docs/16`; sin endpoint extra; una versión restaurada es una versión nueva (inmutabilidad intacta). | Hay que dejar claro en UI que un libro borrado se restaura reimportándolo. | **Sí** |
| **B** | Añadir `POST /lorebooks/:id/restore` para restaurar el contenedor. | Restauración manual directa. | Contradice `docs/16` §5.1/§9 (no existe esa ruta); introduce un tercer camino. | No |
| **C** | Hard delete con versiones conservadas. | Sin `deleted_at`. | `docs/16` §5 cerró soft delete; rompería la restauración por reimport. | No |

#### (d) Schema / migración

| Opción | Ventajas | Costes | ¿Elegida? |
| --- | --- | --- | --- |
| **A** | **Sin migración nueva.** Reutilizar `lorebooks.origin_id` (+índice), `current_version_id`, `deleted_at`, `lorebook_versions.source_key` (+índice), único `(lorebook_id, version_number)` y `character_versions.lorebook_version_id` (+índice), todos creados en `0020`. | Cero riesgo de migración; soft delete/uso/restore/matching caben en columnas e índices existentes. | El export standalone debe transportar `origin_id` en `extensions.rm` (cambio aditivo de shape, no de schema). | **Sí** |
| **B** | Migración `0021` (p. ej. índice único de `origin_id` o columna `imported_from`). | Ninguna necesidad real detectada. | Riesgo de rebuild de SQLite sin ganancia funcional; viola «no migración salvo estricta». | No |

#### (e) Contrato del saludo alternativo

| Opción | Ventajas | Costes | ¿Elegida? |
| --- | --- | --- | --- |
| **A** | **`greetingIndex?: number`** (0 = `first_mes`, `i≥1` = `alternateGreetings[i-1]`) en `CreateConversationInput`, validado contra la versión resuelta. | Determinista; evita comparar texto (ambigüedad ante duplicados/espacios); no reenvía el saludo completo; `alternateGreetings` ya está en el DTO de versión. | Un índice más un guard de rango. | **Sí** |
| **B** | `greeting: string` (contenido). | Legible. | Ambigüedad (dos saludos idénticos), normalización frágil, reenvía texto largo. | No |
| **C** | Endpoint separado para resolver saludos. | Desacopla. | Viaje extra innecesario; el dato ya viaja en la versión. | No |

#### (f) Composición/componentes del frontend

| Opción | Ventajas | Costes | ¿Elegida? |
| --- | --- | --- | --- |
| **A** | Secciones nuevas en archivos propios (`lorebook-link-section.tsx`, `lorebook-danger-section.tsx`) + diálogos (`lorebook-import-dialog.tsx`, `lorebook-restore-dialog.tsx` para el match, `lorebook-link-dialog.tsx`) + hook de acciones (`use-lorebook-actions.ts`); picker de saludo en `components/shared/alternate-greeting-picker.tsx`. | Mantiene `lorebook-page.tsx` (294 líneas) y `use-lorebook-page.ts` (237) bajo 500; el picker es reutilizable por detalle y biblioteca. | Más archivos; hay que respetar aislamiento de features. | **Sí** |
| **B** | Todo dentro de `lorebook-page.tsx`/`use-lorebook-page.ts`. | Menos archivos. | `lorebook-page.tsx` superaría 500 líneas; `use-lorebook-page.ts` rozaría el límite; mezcla preocupaciones. | No |

### Decisión

1. **API de uso/vínculo/restore** = opción (a)-A: los endpoints de `docs/16`
   §9, con `versionId` opcional en `link` (default: versión actual).
2. **Matching** = opción (b)-A: dry-run + `action` enum, sin reconstrucción
   silenciosa. El import de card (`PUT /api/characters/:id/card`) **no** usa el
   matcher en este slice (ver `Fuera de alcance`).
3. **Soft delete / restore** = opción (c)-A: `DELETE` soft; sin endpoint de
   restaurar libro (solo por reimport); `POST .../restore` restaura una
   **versión** como versión nueva.
4. **Schema** = opción (d)-A: **sin migración nueva**; el export standalone
   gana `extensions.rm.originId` de forma aditiva.
5. **Saludo alternativo** = opción (e)-A: `greetingIndex` validado.
6. **Frontend** = opción (f)-A: secciones y diálogos en archivos propios.

### Fuera de alcance

- **Matching en el import de card (`PUT /api/characters/:id/card`).** S133 lo
  cerró como «siempre crear libro + v1». `docs/16` §11.1 menciona la
  reutilización por `origin_id`/`source_key` al importar una card, pero el
  alcance aprobado de S134 es «import/export **por libro/versión** en CCv3 y ST
  nativo»; el import de card es un flujo centrado en el personaje (crea una
  versión de personaje) y añadirle un diálogo de confirmación de match cambiaría
  su semántica sin estar en los prototipos. **Decisión explícita:** el matcher
  se cablea solo en `POST /lorebooks/import`; el `PUT /card` conserva el
  comportamiento S133. Queda como seguimiento opcional en `## Deferred`.
- **Export interno RM schema v2 (`docs/16` §11.2).** No es estrictamente
  necesario para los flujos aprobados; no se diseña ni se toca `EXPORT_SCHEMA_VERSION`
  en este slice. Registrado en `## Deferred`.
- **Múltiples lorebooks por versión de personaje, grupos, timed effects,
  probabilidad, decoradores, assets V3, prompt manager de ST.** Cerrados en la
  aprobación.
- **Drop físico de `lorebooks.character_id` y limpieza de versiones huérfanas.**
  Sigue diferido (no se borran versiones automáticamente).
- **`nickname` en `extensions.rm`.** Sigue en `unknownFields` (decisión cerrada).
- **Release post-S134 (`1.58.0`).** Es un `/release` aparte.

## Modelo de datos y API

### Schema: sin migración nueva

El schema de `0020_lorebook_versions.sql` ya contiene todo lo necesario:

- `lorebooks.origin_id` (índice `lorebooks_origin_idx`, línea 43) → matching
  por `origin_id`.
- `lorebooks.current_version_id` (FK `ON DELETE SET NULL`) → versión actual y
  `status` (`current`/`outdated`).
- `lorebooks.deleted_at` → soft delete / restore (`NULL` ⇄ timestamp).
- `lorebook_versions.source_key` (índice `lorebook_versions_source_key_idx`,
  línea 17) → matching por contenido.
- `lorebook_versions` único `(lorebook_id, version_number)` (línea 16) →
  `MAX(version_number)+1` al restaurar/versionar.
- `character_versions.lorebook_version_id` (índice
  `character_versions_lorebook_version_idx`, línea 45) → uso por versión y
  «En uso por»/«Historial».

**Soft delete** = `UPDATE lorebooks SET deleted_at = now WHERE id = ? AND
deleted_at IS NULL` (sin borrar versiones). **Restore (contenedor)** = solo por
reimport: `UPDATE lorebooks SET deleted_at = NULL`. **Uso** = join
`character_versions → lorebook_versions → lorebooks`. **Matching** = lookup por
`origin_id` (contenedor) y `source_key` (versión). **Restore de versión** =
leer `entries_json` de la versión vieja y pasarla a `saveLiveHeadAndVersion`
(crea una versión nueva con `MAX(version_number)+1`). Ninguna columna ni índice
faltan. **No se requiere `0021`.**

### Cambios de DTO (`packages/shared/src/types/**`)

Preservando los campos existentes (compatibilidad S132/S133):

- `lorebook.ts`:
  - `LorebookSummaryDTO` gana `usageVersionCount?: number` (versiones de
    personaje distintas que usan el libro) — para «M versiones».
  - Nuevo `LorebookUsageDTO` / `LorebookUsageCharacter` / `LorebookUsageVersion`
    (ver `Usage queries`).
  - Nuevo `LinkLorebookInput { characterId: string; versionId?: string }`.
  - Nuevo `ImportLorebookAction = "reuse" | "restore" | "new-version" | "new-book"`.
  - Nuevo `ImportLorebookPreview` y `ImportLorebookResult` (ver `Import/export`).
- `conversation.ts`: `CreateConversationInput` gana `greetingIndex?: number`
  (0 = `first_mes`; `i≥1` = `alternateGreetings[i-1]`).

### Superficie de API

| Método | Ruta | Entrada | Salida / códigos | Notas |
| --- | --- | --- | --- | --- |
| GET | `/api/lorebooks` | query `limit?`(1..200), `offset?`, `filter?`(`all`\|`in-use`\|`unused`, default `all`) | 200 `LorebookSummaryDTO[]` (vivos; **misma shape array** por compatibilidad) | N4: SQL `LIMIT/OFFSET` + pushdown de filtro; `usageCount` y `usageVersionCount` reales |
| GET | `/api/lorebooks/:id` | — | 200 `LorebookDTO` (cabeza viva + versión actual + entradas vivas); 404 `LOREBOOK_NOT_FOUND` si no existe **o está eliminado** | Se mantiene 404 en eliminado; el personaje renderiza su versión inmutable vía `CharacterVersionDTO.lorebookVersion`, no vía esta ruta |
| GET | `/api/lorebooks/:id/versions` | — | 200 `LorebookVersionDTO[]` | Sin cambios (ya existe) |
| GET | `/api/lorebooks/:id/versions/:versionId` | — | 200 `LorebookVersionDTO` (read-only); 404 `LOREBOOK_VERSION_NOT_FOUND` | Sin cambios |
| POST | `/api/lorebooks` | `CreateLorebookInput` | 201 `LorebookDTO` (v1, standalone) | Sin cambios |
| PUT | `/api/lorebooks/:id` | `UpdateLorebookInput` | 200 `{ lorebook, createdNewVersion }` (no-op si idéntico) | Sin cambios (un save = una versión) |
| POST | `/api/lorebooks/:id/versions/:versionId/restore` | — | 200 `{ lorebook, createdNewVersion }` (versión nueva a partir de la antigua); 404 `LOREBOOK_NOT_FOUND`/`LOREBOOK_VERSION_NOT_FOUND` | Nueva: lee `entries_json` de la versión y llama `saveLiveHeadAndVersion` |
| DELETE | `/api/lorebooks/:id` | — | 204; 404 `LOREBOOK_NOT_FOUND` si no existe o ya eliminado | Soft delete (idempotente por estado) |
| GET | `/api/lorebooks/:id/usage` | query `versionId?`(default: versión actual) | 200 `LorebookUsageDTO`; 404 `LOREBOOK_NOT_FOUND` (eliminado incluido) | Agrupa por personaje, batch sin N+1 |
| POST | `/api/lorebooks/:id/link` | `{ characterId, versionId? }` | 201 `CharacterVersionDTO` (nueva versión de personaje enlazada); 404 `LOREBOOK_NOT_FOUND`/`LOREBOOK_VERSION_NOT_FOUND`/`CHARACTER_NOT_FOUND`; 409 `LOREBOOK_LINK_UNCHANGED` si la versión actual ya usa esa versión | Crea una versión nueva del personaje |
| POST | `/api/lorebooks/import/preview` | `{ format, payload }` | 200 `ImportLorebookPreview` (match + acción sugerida, sin escribir); 400 `INVALID_CARD_JSON` | Dry-run |
| POST | `/api/lorebooks/import` | `{ format, payload, action }` | 200/201 `ImportLorebookResult`; 400 `INVALID_CARD_JSON`; 409 `IMPORT_ACTION_MISMATCH` / `IMPORT_STALE_MATCH` | Matching + reconstrucción con confirmación |
| POST | `/api/lorebooks/:id/export` | `{ format, versionId? }` | 200 CCv3/ST (con `extensions.rm.originId`); 404 `LOREBOOK_NOT_FOUND`/`LOREBOOK_VERSION_NOT_FOUND` | Gana `versionId`; export por versión |
| POST | `/api/conversations` | `CreateConversationInput` + `greetingIndex?` | 201 `CreateConversationResult`; 400 `INVALID_GREETING` | El mensaje 0 es el saludo elegido |

**Coexistencia de imports.** La ruta legacy `POST /api/characters/:id/lorebook/import`
(`lorebook.routes.ts`) sigue intacta (carácter-scoped, semántica S132:
`replace`/409 `LOREBOOK_ALREADY_EXISTS`, sin matching). El nuevo
`POST /lorebooks/import` es standalone y con matching. Comparten el parser
(`normalizeLorebook` + `assertLorebookEntryCount`) pero tienen use cases y
semánticas distintas; no se reutiliza `replaceBook` (que muta por `character_id`
legacy) en el import standalone.

**Códigos de error nuevos/definidos:**

| Código | HTTP | Cuándo |
| --- | --- | --- |
| `LOREBOOK_NOT_FOUND` | 404 | libro inexistente o eliminado (GET/PUT/DELETE/usage/link/export/restore) |
| `LOREBOOK_VERSION_NOT_FOUND` | 404 | versión inexistente o de otro libro |
| `CHARACTER_NOT_FOUND` / `CHARACTER_VERSION_NOT_FOUND` | 404 | vínculo/uso/saludo |
| `INVALID_VERSION_FOR_CHARACTER` | 422 | versión de personaje de otro personaje |
| `INVALID_CARD_JSON` | 400 | payload no es lorebook CCv3/ST |
| `INVALID_GREETING` | 400 | `greetingIndex` fuera de rango para la versión |
| `LOREBOOK_LINK_UNCHANGED` | 409 | vincular no cambia nada (ya usa esa versión) |
| `IMPORT_ACTION_MISMATCH` | 409 | `action` incompatible con el match calculado |
| `IMPORT_STALE_MATCH` | 409 | el match cambió entre preview y confirmación |

## Import/export, matching y reconstrucción

### Algoritmo de matching (precedencia exacta)

Reutiliza `normalizeLorebook` + `canonicalizeLorebookContent` +
`computeLorebookSourceKey` (ya existentes). El `origin_id` se lee de
`extensions.rm.originId` del payload (nuevo, aditivo).

1. Parsear → `NormalizedLorebook`; calcular `sourceKey` del contenido importado;
   leer `originId` (si el payload lo trae).
2. **`origin_id` primero:** buscar `lorebooks` por `origin_id`. Si hay un match:
   - `identical` si alguna versión de ese libro tiene `source_key = sourceKey`.
   - sino `different`.
   - Clasificación: `live-identical` / `deleted-identical` / `live-different` /
     `deleted-different`.
3. **`source_key` como fallback:** buscar `lorebook_versions` por `source_key`.
   Si hay matches → libro `identical` (preferir **vivo** sobre eliminado; entre
   vivos, preferir el que tenga ese `source_key` en `current_version_id`; desempate
   por `created_at` más antiguo).
4. **Sin match** → `new-book`.

**Tie-breaks / múltiples matches:** `origin_id` puede colisionar (no hay índice
único): preferir **vivo** sobre eliminado y, entre vivos, el más antiguo.
`source_key` puede colisionar entre libros: misma regla (vivo → actual → más
antiguo). Nunca se actúa sobre dos libros a la vez; el resto queda para una
segunda pasada de import.

### Preview y confirmación (sin restore silencioso)

- `POST /lorebooks/import/preview` → `ImportLorebookPreview`:
  `{ matched: boolean; suggestedAction: ImportLorebookAction; book?: { id, name, deleted, matchedVersionNumber, usedByCharacters } }`.
- `POST /lorebooks/import` con `action`:
  - `reuse`: libro **vivo idéntico** → devolver el libro existente, sin escribir
    (sin duplicar).
  - `restore`: libro **eliminado idéntico** → `deleted_at = NULL`, devolver el
    libro restaurado (el historial reaparece solo; las versiones de personaje ya
    apuntaban y no se mutan).
  - `new-version`: libro **vivo diferente** → el contenido importado se convierte
    en la cabeza viva y crea una versión nueva (`saveLiveHeadAndVersion`).
  - `new-book`: **sin match** o **eliminado diferente** → libro nuevo + v1
    (`createContainerWithVersion`).
  - `action` incompatible con el match → 409 `IMPORT_ACTION_MISMATCH`. Si el
    `source_key`/`origin_id` del libro objetivo cambió desde el preview →
    409 `IMPORT_STALE_MATCH` (re-ejecutar preview).

### Reglas de reconstrucción (`docs/16` §6.2)

| Caso | Acción sugerida | Efecto en `character_versions` | `current_version_id` | ¿Versión nueva? |
| --- | --- | --- | --- | --- |
| Vivo idéntico | `reuse` | ninguna (sin mutar) | sin cambios | No |
| Eliminado idéntico | `restore` | ninguna (ya apuntan; reaparecen en «En uso por») | sin cambios | No |
| Vivo diferente | `new-version` | ninguna | pasa a la versión nueva | Sí |
| Eliminado diferente | `new-book` | ninguna (las viejas siguen con su copia) | nueva v1 del libro nuevo | Sí (v1) |
| Manual idéntico (`source_key` match sin `origin_id`) | `reuse`/`restore` (confirmar) | ninguna | sin cambios | No |
| Manual diferente | `new-book` | ninguna | nueva v1 | Sí (v1) |

**Ninguna versión de personaje se muta en ningún caso.** La reconstrucción solo
toca el contenedor vivo (`deleted_at`, cabeza viva, `current_version_id`) y las
filas `lorebook_versions`; el prompt y las cards siguen leyendo las versiones
inmutables.

**Colisión de `origin_id` (deleted + diferente → new book).** `docs/16` no lo
especifica. **Decisión (flag como decisión, no pregunta abierta):** el libro
nuevo recibe un `origin_id` **nuevo** (`randomUUIDv7`), no el importado, para no
dejar dos contenedores con el mismo `origin_id` (ambigüedad futura). El libro
eliminado conserva su `origin_id` original. Reimportar el contenido nuevo
volverá a hacer match por `source_key` (el eliminado tiene contenido distinto,
así que no colisiona). Es la regla más segura y no contradice `docs/16`.

### Export

- `POST /lorebooks/:id/export` gana `versionId?` (default: versión actual).
  Exporta **la versión seleccionada** (deserializa `entries_json`), no la cabeza
  viva.
- CCv3 y ST native; `toCCv3Lorebook`/`toStNativeLorebook` existentes se alimentan
  de la versión. Se añade `data.extensions.rm = { version: 1, originId }`
  (CCv3) y `extensions.rm` equivalente en ST, **aditivo**: los exports S133 sin
  `originId` siguen importando por `source_key`.
- **Round-trip:** exportar → importar produce el mismo `source_key` (canonicalización
  estable); `extensions.rm`/`origin_id` se preservan; `unknownFields` de libro y
  entrada round-trip verbatim (ya cubierto por `normalizeLorebook`/`pickUnknown`).

### Transacciones e idempotencia

- `reuse`: no escribe. `restore`: un `UPDATE` (idempotente). `new-version`:
  `saveLiveHeadAndVersion` ya es transaccional e idempotente por `source_key`
  (si el contenido ya es la versión actual no crea versión). `new-book`:
  `createContainerWithVersion` transaccional. Reejecutar el mismo import converge
  a no-op (matching por `source_key`).

## Soft delete y restauración

- **`DELETE /api/lorebooks/:id`:** soft delete del contenedor (`deleted_at`),
  sin tocar versiones ni `character_versions`. 204; 404 si ya eliminado.
- **Aviso** (de `docs/16` §5.1), en `en.ts`/`es.ts`:

  > Se eliminará **Bosque de Lyra** de la biblioteca. Las versiones de personaje
  > que lo usaron conservarán su copia y seguirán funcionando, pero no podrás
  > consultar qué personajes lo usaban ni vincularlo a nuevas versiones. ¿Eliminar?

- **Qué desaparece:** la estantería (`listSummaries` filtra `deleted_at IS NULL`),
  `GET /lorebooks/:id`, `usage`, `link` y `export` del libro (404). **Qué
  permanece:** las versiones inmutables; las versiones de personaje siguen
  funcionando (el prompt/card leen la versión por id sin filtrar `deleted_at`,
  ya implementado en S133). La página del personaje muestra «Lorebook eliminado ·
  nombre v<n>» (ya resuelto por `LorebookVersionSummary.status === "deleted"`).
- **Restauración del contenedor:** solo al reimportar (sin endpoint dedicado).
  Un import con `source_key`/`origin_id` que coincide con un libro eliminado
  ofrece `restore`; al confirmar, `deleted_at = NULL`, el libro vuelve a la
  estantería y el historial de uso reaparece (las versiones de personaje ya
  apuntaban). No se re-crea ninguna versión.
- **Restauración de una versión (distinto del borrado de libro):**
  `POST /lorebooks/:id/versions/:versionId/restore` crea una **versión nueva**
  a partir de la antigua (lee `entries_json`/ajustes y llama
  `saveLiveHeadAndVersion`), actualizando la cabeza viva y `current_version_id`.
  La versión antigua permanece inmutable. Si la versión antigua es ya la actual,
  `createdNewVersion: false`.
- **Evitar restauraciones accidentales:** `restore` (libro) exige `action`
  explícita y el preview muestra «usado por N personajes» antes de confirmar;
  el dialogo de confirmación de la UI es el único camino.

## Usage queries

- **Definición:** para la versión seleccionada `v` de un libro `b`:
  - **«En uso por»** = versiones de personaje con `lorebook_version_id == v.id`.
  - **«Historial»** = versiones de personaje con `lorebook_version_id` en
    cualquier **otra** versión del mismo libro `b`.
  - Agrupadas por personaje, mostrando `vN · actual` / `vM · histórica`.
- **Estrategia SQL (sin N+1):** dos consultas batch:
  1. `SELECT cv.*, c.name AS character_name FROM character_versions cv JOIN
     characters c ON c.id = cv.character_id WHERE cv.lorebook_version_id IN
     (SELECT id FROM lorebook_versions WHERE lorebook_id = :bookId)`.
  2. `SELECT character_id, MAX(version_number) AS current FROM character_versions
     WHERE character_id IN (:ids) GROUP BY character_id` (para marcar `actual`).
  El use case agrupa en memoria (partición en uso/historial por `v.id`), sin
  consultas por fila.
- **Orden:** por personaje (nombre) y, dentro, versión de personaje descendente.
- **Libro eliminado:** `GET /lorebooks/:id/usage` devuelve 404 (el historial se
  oculta en la UI, `docs/16` §5.1); la página del personaje no depende de esta
  ruta.
- **DTO:**
  ```ts
  interface LorebookUsageVersion {
    characterVersionId: string
    characterVersionNumber: number
    isCurrentCharacterVersion: boolean   // «actual»
    lorebookVersionNumber: number
  }
  interface LorebookUsageCharacter {
    characterId: string
    characterName: string
    inUse: LorebookUsageVersion[]        // apuntan a la versión seleccionada
    history: LorebookUsageVersion[]      // otras versiones del mismo libro
  }
  interface LorebookUsageDTO { characters: LorebookUsageCharacter[] }
  ```
- **`usageCount` en la estantería:** `listSummaries` ya calcula
  `COUNT(DISTINCT cv.character_id)` (real). Se añade `usageVersionCount =
  COUNT(DISTINCT cv.id)` (versiones de personaje). Los filtros `in-use` =
  `usageCount > 0`, `unused` = `usageCount = 0`, se empujan a SQL con
  `EXISTS`/`NOT EXISTS` sobre el join `character_versions → lorebook_versions`.

## Link-to-character flow

- **`POST /api/lorebooks/:id/link`** body `{ characterId, versionId? }`:
  1. Valida libro **vivo** (404 si eliminado) y que `versionId` (default:
     `current_version_id`) pertenece al libro.
  2. Valida `characterId` (404 si no existe).
  3. Delega en `UpdateCharacterUseCase` con `{ id: characterId,
     lorebookVersionId: versionId }` → **copy-from-prev** y **una** versión nueva
     del personaje con esa versión de lorebook. No muta versiones previas.
  4. Si la versión actual del personaje ya usa exactamente esa versión →
     409 `LOREBOOK_LINK_UNCHANGED` (no se crea versión vacía).
- **Respuesta:** 201 `CharacterVersionDTO` (la nueva versión del personaje).
- **Conversaciones existentes:** no se tocan; siguen fijadas a su versión de
  personaje anterior (sin libro o con la versión anterior del libro).
- **Personaje sin versiones:** no ocurre (todo personaje tiene al menos v1 por
  invariante); si por corrupción no tuviera, 404 `CHARACTER_NOT_FOUND`/error
  invariante.
- **Idempotencia/duplicados:** vincular dos veces al mismo personaje sin cambios
  intermedios → `LOREBOOK_LINK_UNCHANGED` (409); si cambió algo, crea una
  versión nueva (correcto).
- **Frontend:** en `lorebook-link-section.tsx`, botón «Vincular a un personaje»
  abre `lorebook-link-dialog.tsx` (búsqueda/select de personaje), con aviso
  explícito «Esto crea una versión nueva del personaje». Al confirmar:
  - llama a `linkLorebook`, refresca `usage` (sección Vínculo) y, si el
    personaje está abierto en otra vista, su resumen se refresca al volver.
  - toast de éxito con el nombre del personaje.

## Alternate-greeting flow

- **Contrato:** `CreateConversationInput.greetingIndex?: number`. El use case
  resuelve la versión (como hoy, con `versionId` si viene) y:
  - `greetingIndex === undefined || 0` → `version.greeting` (comportamiento actual).
  - `greetingIndex >= 1` → exige `version.alternateGreetings[greetingIndex - 1]`;
    si no existe → `INVALID_GREETING` (400).
  - El mensaje 0 es `normalizeUserContent(<saludo elegido>)` (misma normalización
    que hoy).
- **Por qué índice y no contenido:** determinista (no compara texto, evita
  ambigüedad ante saludos duplicados o espacios), no reenvía el texto completo y
  `alternateGreetings` ya viaja en `CharacterVersionDTO`/ST mapper.
- **Picker:** `components/shared/alternate-greeting-picker.tsx` (dialog) recibe
  `{ greeting, alternateGreetings, onConfirm(index) }`; muestra `first_mes` +
  alternativas con preview; se muestra **solo** si `alternateGreetings.length > 0`;
  sin alternativas → conversación directa (comportamiento actual).
- **Entry points:**
  - Detalle de personaje («Nueva conversación», `character-page-actions.tsx`):
    usa `character.currentVersion`.
  - Sección Versiones (`versions-section.tsx`): usa la versión de cada fila
    (tiene `alternateGreetings`).
  - Biblioteca (`character-list.tsx` «Conversar»): resuelve la versión con
    `loadVersions(characterId)` (ya devuelve `CharacterVersionDTO[]` con
    `alternateGreetings`) y abre el picker antes de `createConversation`.
- **i18n/a11y/móvil:** claves `characters.greetingPicker*` en `en.ts`/`es.ts`;
  dialog accesible (radio/lista con foco, `Esc`/click fuera, `aria-describedby`),
  apilado en móvil; preview recortado a ~2 líneas.

## Limpieza S133/S134

- **I1 (N+1 en `GET /characters/:id`):** `lorebook-version-summary.ts` se
  refactoriza a un helper batch `buildLorebookVersionSummaries(repository,
  versionIds[])` que resuelve las versiones con un `findVersionsByIds(ids)` (un
  `IN (...)` en el repo) y los contenedores con un `findByIds(ids)` batch.
  `get-character.use-case.ts` recolecta los `lorebookVersionId` de todas las
  versiones, hace **una** resolución por lote y mapea. Test: spy que exige
  `findVersionsByIds`/`findByIds` llamados una vez (no por versión).
- **N1 (ids sintéticos de entrada):** `toLorebookVersionDTO` sintetiza
  `id: sourceId ?? \`entry-${index}\`` por entrada deserializada, estable por
  posición. El frontend deja de depender de `entry.id ?? ...` como key.
- **N4 (paginación/filtros SQL):** `LorebookRepository.listSummaries` gana
  `{ limit?, offset?, filter? }` y hace `LIMIT/OFFSET` + pushdown; se elimina el
  `slice` en memoria de `ListLorebooksUseCase`. `LorebookSummaryDTO` gana
  `usageVersionCount`. La ruta acepta `filter`.
- **N2 (i18n muerta `characters.tabCards`):** se elimina (barato, sin riesgo).
- **N3 (`extensions.rm` emite `subtitle`/`instructions` en `null`):** **se deja
  fuera.** Es cosmético (`field loss = 0` se mantiene) y cambiar la emisión del
  mapper toca la forma de round-trip de card y sus tests S133; no justifica el
  riesgo en un slice ya grande. Nota en `## Deferred`.

## UI y componentes

### Rutas

- `/lorebooks` — estantería completa (crear, importar, filtros, empty state).
- `/lorebooks/new` — crear (v1, sin vínculo); se mantiene.
- `/lorebooks/:id` — detalle con secciones Identidad, Ajustes, Entradas,
  Versiones, Vínculo y Peligro.
- Picker de saludo alternativo en `/characters/:id` y `/` (biblioteca), no es
  una ruta nueva.

### Secciones del detalle (`/lorebooks/:id`)

- **Header:** selector de versión (ya existe), exportar (gana selector de
  versión), guardar, y (nuevo) menú/botón eliminar.
- **Identidad / Ajustes / Entradas:** sin cambios funcionales; siguen en
  read-only al ver una versión antigua.
- **Versiones (`lorebook-versions-section.tsx`):** añade «Restaurar como versión
  nueva» por fila (solo en libros vivos y para versiones no actuales); retira
  `versionsDeferred`; read-only banner ya existente.
- **Vínculo (`lorebook-link-section.tsx`, nuevo):** «En uso por» / «Historial»
  agrupados por personaje (consumen `GET /:id/usage`); botón «Vincular a un
  personaje» (dialog con aviso). Sustituye el placeholder `linkDeferred*`.
- **Peligro (`lorebook-danger-section.tsx`, nuevo):** botón «Eliminar» con el
  aviso de `docs/16` §5.1 y confirmación; tras borrar navega a `/lorebooks`.
- **Banner read-only** de versión antigua ya existe; el selector de versión del
  header sigue siendo la fuente.

### Estantería (`/lorebooks`)

- `lorebook-list.tsx` conserva los filtros Todos/En uso/Sin usar (ahora con
  `usageCount` real y `usageVersionCount`); `lorebook-card.tsx` muestra
  «Usado por N personajes · M versiones» o «Sin usar».
- Añade acción «Importar» en el header (abre `lorebook-import-dialog.tsx`, que
  hace `import/preview` y, si hay match, `lorebook-restore-dialog.tsx`).
- Empty state y create card ya existen.

### Plan de archivos (bajo 500 líneas y aislamiento de features)

- `components/lorebook/lorebook-link-section.tsx` (nuevo).
- `components/lorebook/lorebook-danger-section.tsx` (nuevo).
- `components/lorebook/lorebook-link-dialog.tsx` (nuevo).
- `components/lorebook/lorebook-import-dialog.tsx` (nuevo, preview+confirm).
- `components/lorebook/lorebook-restore-dialog.tsx` (nuevo, match/reconstrucción).
- `components/lorebook/use-lorebook-actions.ts` (nuevo): delete/restore/link/
  import/export, para no inflar `use-lorebook-page.ts` (237 líneas).
- `components/lorebook/use-lorebook-usage.ts` (nuevo): `GET /:id/usage` (si se
  prefiere separado del hook de acciones).
- `components/shared/alternate-greeting-picker.tsx` (nuevo): reutilizable por
  personaje y biblioteca.
- `lorebook-page.tsx` (294) monta las secciones nuevas; se extrae el cover del
  header a `lorebook-cover.tsx` si el montaje lo acerca a 500.
- `lib/api/lorebooks.ts`: añade `restoreLorebookVersion`, `deleteLorebook`,
  `getLorebookUsage`, `linkLorebook`, `importLorebookPreview`,
  `importLorebook` y `versionId` en `exportLorebook`.
- `lib/api/conversations.ts`: `createConversation` acepta `greetingIndex`.
- **Sin imports de `character/` en `lorebook/`:** el picker vive en
  `components/shared/`; el vínculo usa `lib/api/characters` (listar personajes)
  y `lib/api/lorebooks`, no componentes de personaje.

### Copy/i18n (añadir en `en.ts` y `es.ts`)

- Añadir: `lorebooks.restoreVersion`, `lorebooks.restoreHint`,
  `lorebooks.inUseBy`, `lorebooks.history`, `lorebooks.linkToCharacter`,
  `lorebooks.linkCreatesVersion`, `lorebooks.linked`, `lorebooks.linkUnchanged`,
  `lorebooks.delete`, `lorebooks.deleteTitle`, `lorebooks.deleteWarning`,
  `lorebooks.deleted`, `lorebooks.import`, `lorebooks.importPreview`,
  `lorebooks.restoreHistory`, `lorebooks.createNewBook`, `lorebooks.createNewVersion`,
  `lorebooks.reuse`, `lorebooks.usageCharactersVersions` («{c} personajes ·
  {v} versiones»), `lorebooks.exportVersion`, `lorebooks.versionRestored`;
  `characters.greetingPickerTitle`, `characters.greetingPickerFirstMes`,
  `characters.greetingPickerAlternate`, `characters.greetingPickerConfirm`.
- Eliminar (obsoletos S133): `lorebooks.linkDeferredTitle`, `lorebooks.linkDeferred`,
  `lorebooks.versionsDeferred`, y la i18n muerta `characters.tabCards` (N2).

### Sin botones muertos

Cada botón nuevo mapea a un endpoint: restaurar → `POST .../restore`; vincular →
`POST .../link`; eliminar → `DELETE ...`; importar → `POST .../import(/preview)`;
exportar por versión → `POST .../export?versionId`; saludo → `greetingIndex` en
`POST /conversations`. Se retiran los chips «S134» y los textos diferidos.

## Plan de pruebas

Matriz enfocada (no exhaustiva). **Recomendación:** por la superficie de
matching/reconstrucción y los riesgos de pérdida de datos, `slice-test-architect`
debe emitir `docs/10-slices/S134-test-plan.md` antes de `slice-test-author`
(matriz delicada).

- **Migración/schema (regresión, sin migración nueva):** `migration-0020.test.ts`
  sigue verde; assert de que `origin_id`/`current_version_id`/`deleted_at`/
  `source_key`/`lorebook_version_id` y sus índices existen y soportan soft delete
  (`deleted_at`), `current_version_id` (`SET NULL`), y `character_versions`
  FK `RESTRICT`.
- **Backend (repos/use cases):**
  - `listSummaries` con `limit`/`offset`/`filter` (SQL), `usageCount` +
    `usageVersionCount` reales.
  - `usage` agrupado por personaje (en uso/historial, `actual`), batch sin N+1.
  - `restore` de versión (crea versión nueva; no-op si ya es actual).
  - soft delete (idempotente; 404 en segundo DELETE; filtrado de la estantería).
  - import matching/reconstrucción: los 6 casos de `docs/16` §6.2 + colisión de
    `origin_id` (deleted+different → new book con `origin_id` nuevo) +
    `IMPORT_ACTION_MISMATCH`/`IMPORT_STALE_MATCH`.
  - link-to-character (una versión nueva, copy-from-prev, `LOREBOOK_LINK_UNCHANGED`).
  - saludo alternativo: `greetingIndex` válido/0/fuera de rango → `INVALID_GREETING`.
  - cleanup I1 (batch en `get-character`), N1 (ids sintéticos estables).
- **Rutas:** nuevos endpoints, códigos 404/400/409/204, protección de origen en
  los mutadores, coexistencia legacy `POST /characters/:id/lorebook/import` vs
  `POST /lorebooks/import`.
- **Frontend (RTL):** filtros/empty state de la estantería, secciones Vínculo/
  Peligro, read-only de versión antigua, diálogos de restore/delete/link/import,
  picker de saludo, sin botones muertos.
- **Round-trip:** CCv3 y ST native por libro/versión; estabilidad de
  `origin_id`/`source_key`; preservación de `extensions.rm`/`unknownFields`.
- **Comandos exactos:**
  - `pnpm --filter @workspace/backend test`
  - `pnpm --filter @workspace/frontend exec vitest run`
  - `pnpm check`
  - `pnpm build`
  - `pnpm audit --prod`

## Plan de eval

S134 **mantiene** los controles de activación (scan depth, token budget,
recursive scanning siguen versionados y se respetan) y **no cambia** el
algoritmo de retrieval ni la política del modelo; el saludo alternativo cambia
solo el contenido del mensaje 0, no el comportamiento del modelo. **No se
requiere eval de memoria/contexto/prompt/modelo.** Lo sustituyen tests
deterministas: paridad preview/send con la versión enlazada (ancla S129,
`pnpm --filter @workspace/backend eval` debe quedar verde), round-trip de
import/export (field loss = 0) y el test de saludo (mensaje 0 =
`normalizeUserContent` del saludo elegido). Si la revisión del diff detectara un
cambio en el ensamblado de contexto, se abriría un eval; no se anticipa.

## Criterios de aceptación

- [x] Crear un lorebook standalone → v1, sin personaje.
- [x] Editar crea una versión nueva; las versiones antiguas son de solo lectura.
- [x] La estantería lista libros en uso/sin usar con versión actual, entradas y
      uso real («Usado por N personajes · M versiones» / «Sin usar»), paginada en SQL.
- [x] El detalle muestra historial, uso por versión (agrupado por personaje,
      `actual`/`histórica`) y versión antigua read-only.
- [x] «Restaurar como versión nueva» crea una versión nueva a partir de una
      antigua (no-op si ya es la actual).
- [x] «Vincular a un personaje» crea una versión nueva del personaje con esa
      versión del libro; no muta versiones previas.
- [x] Soft delete con el aviso de `docs/16` §5.1; las versiones de personaje
      siguen funcionando y el personaje muestra «Lorebook eliminado».
- [x] Reimportar un libro idéntico ofrece reconstruir el historial con
      confirmación explícita (no silenciosa); contenido distinto crea un libro
      nuevo; un libro eliminado idéntico se restaura al confirmar.
- [x] Import/export por libro/versión en CCv3 y ST native con `origin_id`/
      `source_key` estables y `extensions.rm`/`unknownFields` preservados.
- [x] El import de card (`PUT /characters/:id/card`) conserva el comportamiento
      S133 (sin matching) — decisión documentada.
- [x] Selector de saludo alternativo al iniciar conversación (detalle, versiones
      y biblioteca) con validación `greetingIndex` en el backend.
- [x] Limpieza I1 (batch sin N+1), N1 (ids sintéticos) y N4 (paginación/filtros
      SQL + `usageVersionCount`) completas.
- [x] CHANGELOG `1.50.1`→`[Unreleased]` íntegramente en inglés; entradas nuevas
      de S134 en inglés; `AGENTS.md`/`WORKFLOW.md` corregidos; `release-notes.mjs`
      verificado (sin cambio esperado).
      **Hecho:** todo el rango `1.50.1`→`[Unreleased]` está en inglés; la
      extracción con `scripts/release-notes.mjs` se verificó para `Unreleased`,
      `1.57.2`, `1.55.0`, `1.54.9`, `1.50.1` y `1.50.0` (sin cambio en el
      script).
- [x] `pnpm check`, tests backend/frontend, `pnpm build` y `pnpm audit --prod`
      en verde; sin archivos >500 líneas; aislamiento de features respetado;
      sin botones muertos; sin migración nueva; sin bump de versión.
      **Nota:** la fidelidad visual a los prototipos no se revalidó manualmente
      en navegador en esta sesión; la UI está cubierta por las suites RTL.

## Red tests

### Backend + contrato shared (2026-11-21)

- **Comando:** `pnpm --filter @workspace/backend test`
- **Fallo esperado:** módulos de use case nuevos ausentes, métodos nuevos del
  puerto/repositorio ausentes (`softDelete`, `findBooksByOriginId`,
  `findVersionsByIds`, `findByIds`, `listSummaries({ limit, offset, filter })`),
  rutas S134 sin montar (404), y asserts de comportamiento aún no implementado
  (restore, usage, link, import matching, export por versión, `greetingIndex`,
  I1, N1, N4). No debe haber fallos de infraestructura.
- **Salida relevante:** `13 failed | 153 passed` archivos, `18 failed | 1030
  passed` tests. Cinco suites fallan con 0 tests por módulos ausentes:
  `get-lorebook-usage.use-case`, `import-lorebook-preview.use-case`,
  `link-lorebook.use-case`, `restore-lorebook-version.use-case` y
  `soft-delete-lorebook.use-case` (`Cannot find module './…'`). Fallos
  representativos:
  - `repository.softDelete is not a function`
  - `repository.findBooksByOriginId is not a function`
  - `usageVersionCount` undefined y `listSummaries` devuelve 14 filas para
    `limit: 2` (paginación en memoria)
  - `expected 404 to be 200` en
    `POST /lorebooks/book-1/versions/version-1/restore`
  - `expected 'Hello!' to be 'Alternate one'` (`greetingIndex`)
  - ids sintéticos `[undefined, undefined, undefined]` en
    `toLorebookVersionDTO` (N1)
  - `findVersionsByIds` no llamado (I1)
  - export por versión devuelve el contenido de la cabeza viva (`Live v2
    content.`) en vez de la versión seleccionada (`Version v1 content.`)
- **Verdes intencionados (guardas/regresión, no rojos nuevos):**
  `migration-0020` sin `0021`, libro eliminado en prompt/card, paridad
  preview/send y `first_mes` para `greetingIndex` 0/undefined.
### Frontend (2026-11-21)

- **Comando:** `pnpm --filter @workspace/frontend exec vitest run`
- **Fallo esperado:** componentes nuevos ausentes (Link, Danger, Import,
  Restore, Link dialog, AlternateGreetingPicker), acciones S134 aún no
  cableadas (restore, delete, link, usage, filtros), placeholders S134 todavía
  presentes, claves i18n nuevas ausentes/obsoletas presentes y picker de saludo
  sin abrir en los tres puntos de entrada.
- **Salida relevante:** `12 failed | 81 passed` archivos, `17 failed | 454
  passed` tests. Seis suites fallan con 0 tests por módulos ausentes
  (`Failed to resolve import "./lorebook-link-section"`, `./lorebook-danger-section`,
  `./lorebook-import-dialog`, `./lorebook-restore-dialog`,
  `./lorebook-link-dialog`, `./alternate-greeting-picker`). Fallos
  representativos:
  - estantería: no aparece `Usado por 2 personajes · 5 versiones`; el filtro
    sigue filtrando en cliente (`listLorebooks` no recibe `filter`)
  - detalle: no hay botón `Restaurar`; la versión antigua no muestra `solo
    lectura`; siguen los textos/chips S134
  - i18n: faltan 21 claves `lorebooks.*` y 4 `characters.greetingPicker*`;
    siguen `linkDeferred*`, `versionsDeferred` y `characters.tabCards`
  - picker: no se abre el diálogo desde el detalle, la fila de versión ni la
    biblioteca (`role="dialog"` ausente)
- **Verdes intencionados (guardas/regresión):** la tarjeta «Sin usar» existente,
  la navegación de la estantería y los tests S133 no relacionados siguen
  pasando.
- **Contratos fijados por los tests para el implementer:**
  `getLorebookUsage(lorebookId, versionId?)`,
  `linkLorebook(lorebookId, { characterId, versionId? })`,
  `deleteLorebook(lorebookId)`, `restoreLorebookVersion(lorebookId, versionId)`,
  `listLorebooks({ filter: "in-use" | "unused" })`; `LorebookImportDialog`
  recibe `format` y usa `importLorebookPreview` antes de `importLorebook`;
  `LorebookRestoreDialog` recibe `preview` y `onConfirm(action)`;
  `LorebookVersionsSection` usa `state.restoreVersion(versionId)`; el picker
  confirma con `greetingIndex`.

## Decisiones

Decisiones tomadas durante la implementación y su justificación. Si cambia el
RFC, explica por qué.

- **Sin migración nueva.** Se reutiliza el schema de `0020`
  (`origin_id`, `current_version_id`, `deleted_at`, `source_key`,
  `lorebook_version_id` y sus índices); no hay `0021`. Soft delete, uso, restore
  y matching caben en las columnas existentes.
- **Errata del RFC — uso «Historial».** «Historial» son solo las versiones de
  personaje que usan versiones **anteriores** del libro
  (`versionNumber < seleccionada`), no «cualquier otra»; una versión de personaje
  que usa una versión más nueva no aparece. Queda fijado por
  `docs/10-slices/S134-test-plan.md` y por el test de uso.
- **Errata del RFC — restore de versión.** Restaurar una versión no actual
  **siempre** crea una versión nueva (aunque el `sourceKey` coincida con la
  cabeza actual, se permite duplicarlo); restaurar la versión actual responde 200
  con `createdNewVersion: false` y no escribe. No hay 409
  `LOREBOOK_VERSION_CURRENT`.
- **Matriz de acciones de import.** `live-different` solo acepta `new-version` en
  este slice; `new-book` para un libro vivo con contenido distinto **no** se
  implementa (habría requerido otra fila de matching y otra rama de
  `IMPORT_ACTION_MISMATCH`).
- **`IMPORT_STALE_MATCH` acotado.** Solo cubre el caso que el usuario resolvió:
  `reuse` confirmado cuando el libro ya está `deleted-identical`. Las demás
  transiciones preview→confirmación incompatibles responden
  `IMPORT_ACTION_MISMATCH` (también 409; la UI reejecuta el preview).
- **Matching del import de card fuera.** `PUT /api/characters/:id/card` conserva
  el comportamiento S133 (libro nuevo + v1, sin matcher); el matcher se cablea
  solo en `POST /lorebooks/import`.
- **`origin_id` nuevo en `deleted-different → new-book`.** El contenedor recibe un
  `randomUUIDv7()` nuevo y también se reescribe `extensions.rm.originId` para que
  el DTO no exponga un `originId` fresco junto a un `extensions.rm.originId`
  antiguo (fix `8196a9e`); el libro eliminado conserva el suyo.
- **`buildLorebookEntities` acepta `string | null`.** El import standalone no
  tiene personaje propietario; el `characterId` pasa a `null` y la firma lo
  refleja en lugar de forzar un id ficticio.
- **Export por versión aditivo.** `mergeExtensions` fusiona `extensions.rm`
  (`version: 1`, `originId`) preservando las claves desconocidas de libro y
  entrada, tanto en CCv3 como en ST native; los exports S133 sin `originId` siguen
  importando por `source_key`.
- **N1 conserva un `id` explícito.** `withSyntheticEntryId` respeta un `id` ya
  presente en el DTO antes de derivar `sourceId` o `entry-<índice>`, de modo que
  un round-trip del snapshot no reescribe ids válidos.
- **Ajuste de test solo por timing.** `character-list.test.tsx` envuelve la misma
  aserción en `waitFor` porque el picker resuelve versiones de forma asíncrona;
  no se relaja ningún contrato.

## Verificación

- **Backend:** `pnpm --filter @workspace/backend test` → 166 archivos / 1078 tests
  en verde.
- **Frontend:** `pnpm --filter @workspace/frontend exec vitest run` → 93 archivos /
  488 tests en verde.
- **Eval (ancla S129):** `pnpm --filter @workspace/backend eval` → 1 archivo / 33
  tests en verde.
- **`pnpm check`:** pasa (`check:arch` 7/7, typecheck 5/5, lint 5/5).
- **`pnpm build`:** 4/4 tareas correctas. El build regeneró
  `packages/website/src/data/release.json` (1.47.0→1.57.2); ese snapshot generado
  se restauró y no forma parte del slice.
- **`pnpm audit --prod`:** sin vulnerabilidades conocidas.
- **`git diff --check`:** limpio.
- **Release dry-run:** no aplica; el slice no cambia `package.json`,
  `pnpm-lock.yaml`, módulos nativos ni empaquetado.
- **Prueba manual:** no ejecutada en esta sesión (sin navegador); el
  comportamiento de UI está cubierto por las suites RTL.
- **Release notes:** `node scripts/release-notes.mjs` verificado para
  `Unreleased`, `1.57.2`, `1.55.0`, `1.54.9`, `1.50.1` y `1.50.0` (vía
  `pnpm node`; sin cambio en el script). Todas las secciones extraídas son no
  vacías y en inglés; `1.50.0` sigue siendo la sección ya inglesa.

## Review

- **Estado:** PASS WITH NOTES
- **Informe:** `docs/10-slices/S134-review.md` (commit `bf52267`).
- **Bloqueantes/majors:** ninguno. La revisión validó contrato RFC,
  clarificaciones de uso/restore, matriz de import, export, saludo, limpieza y
  fronteras de la UI.
- **Corregidos:** MINOR 1 (stale `extensions.rm.originId` en `new-book` de
  `deleted-different`, `8196a9e`), MINOR 2 (claves i18n muertas
  `lorebooks.usageCount`/`exportReadOnly`, `eeb05e4`) y NIT 3 (tipo `format`
  alineado con `LorebookImportFormat`, `455680c`). La re-revisión del delta
  confirmó los tres commits sin hallazgos nuevos.
- **Pendiente (aceptado):** NIT 4 y NIT 5, recogidos en `## Deferred`.

## Riesgos

| Riesgo | Impacto | Mitigación | Owner/etapa |
| --- | --- | --- | --- |
| **Slice grande** (5 endpoints nuevos + UI + saludo + limpieza + CHANGELOG). | Alcance | Deferrals explícitos (card-import matching, export schema v2, N3); secciones/diálogos en archivos propios; `/slice` divide la implementación en chunks. | arquitecto → implementer |
| **Reconstrucción ambigua / pérdida de datos.** | Alto | Matching determinista (`origin_id` → `source_key`), preview + `action`, `IMPORT_ACTION_MISMATCH`/`IMPORT_STALE_MATCH`, ninguna versión de personaje mutada, `origin_id` nuevo en colisión. | implementer + test-architect |
| **Confusión libro eliminado (link/usage/export 404).** | Medio | 404 uniforme + aviso del personaje («Lorebook eliminado»); sección Vínculo/Peligro solo en libros vivos. | implementer |
| **Colisión de `origin_id`.** | Medio | Regla explícita (nuevo `origin_id` en deleted+different); preferencia vivo→actual→más antiguo. | implementer |
| **Explosión de versiones de personaje (link/restore).** | Medio | Un save = una versión; `LOREBOOK_LINK_UNCHANGED` evita versiones vacías; copy-from-prev reutilizado. | implementer |
| **N+1/regresiones de rendimiento.** | Medio | Batch en `get-character` y `usage`; índices 0020; tests con spy de conteo de queries. | implementer |
| **Violaciones 500 líneas / aislamiento de features.** | Gate | Archivos por sección; picker en `shared/`; `pnpm check:arch` en el gate. | implementer + reviewer |
| **Errores en la traducción del CHANGELOG / extracción de release notes.** | Medio | Traducción por pares de sección; verificar `scripts/release-notes.mjs <v>` sobre el nuevo texto; sin cambio de cabeceras `## [X.Y.Z]`. | slice-docs |
| **Backward compatibility S132/S133.** | Alto | `GET /lorebooks` sigue array; `GET /:id` eliminado → 404; rutas legacy intactas; tests de compat. | implementer + reviewer |
| **Bypass de validación del saludo.** | Medio | `greetingIndex` validado contra la versión resuelta (`INVALID_GREETING`); test de rango y de versión inexistente. | implementer |

## Deferred

- **NIT 4 — `IMPORT_STALE_MATCH` acotado.** Solo cubre `reuse` confirmado sobre
  un libro ya `deleted-identical`; otras transiciones preview→confirmación
  incompatibles (por ejemplo `new-version` confirmado tras un soft delete, que
  pasa a `deleted-different`) responden `IMPORT_ACTION_MISMATCH`. Ambos son 409 y
  la UI reejecuta el preview, así que no bloquea.
- **NIT 5 — libros frescos con `origin_id = null`.** Un libro creado a mano, o un
  `new-book` importado sin `originId`, no tiene huella de origen; el matching por
  `origin_id` solo aplica a libros que vienen de una card (S133) o de un import
  standalone con origen. Es intencional y el round-trip es estable.
- **N3 (`extensions.rm` emite `subtitle`/`instructions` en `null`):** cosmético,
  `field loss = 0`; sigue fuera para no tocar el round-trip de card. Sin cambios
  respecto a S133.
- **Matching en `PUT /api/characters/:id/card`:** conserva S133 (libro+v1); el
  matcher se cablea solo en `POST /lorebooks/import`. Reutilizarlo en el import de
  card es un seguimiento opcional (requiere diseñar confirmación dentro del flujo
  de card).
- **Export interno RM schema v2 (`docs/16` §11.2).** No es necesario para los
  flujos aprobados; no se toca `EXPORT_SCHEMA_VERSION`.
- **Drop físico de `lorebooks.character_id`** y **limpieza de versiones
  huérfanas** → limpieza futura.
- **`nickname` en `extensions.rm`** → sin aprobar.
- **Múltiples lorebooks por versión de personaje, grupos, timed effects,
  probabilidad, decoradores, assets V3, prompt manager de ST** → fuera.
- **Release post-S134 (`1.58.0`)** → `/release` aparte; este slice no bumpa
  versión, no crea tag ni publica release.

## Commits

Lista real de la slice (orden cronológico; sin bump de versión ni release).

**Documentación y tests**

1. `91b0bd7` — `docs(slice): approve S134 RFC`
2. `ef5ee20` — `docs(slice): add S134 test plan`
3. `7f0462c` — `test(backend): add S134 red tests`
4. `7593463` — `docs(slice): record S134 backend red tests`
5. `fa14818` — `test(frontend): add S134 red tests`
6. `cb78288` — `docs(slice): record S134 frontend red tests`

**Implementación**

7. `31afcf2` — `feat(shared): add S134 lorebook usage, import and greeting types`
8. `9053d58` — `feat(backend): add lorebook soft delete, restore, usage and link`
9. `f05ad9a` — `feat(backend): add standalone lorebook import and version export`
10. `a52f6c2` — `feat(backend): select alternate greeting when creating a conversation`
11. `cab11be` — `feat(frontend): add S134 lorebook library and detail surfaces`
12. `3eff58b` — `feat(frontend): add alternate-greeting picker`
13. `a0c3576` — `refactor(backend): batch lorebook summaries and paginate in SQL` (I1/N1/N4)
14. `f6dd006` — `feat(shared): add S134 copy and remove S133 placeholders`

**Cierre y correcciones de review**

15. `1b27ceb` — `test(frontend): await version lookup in character list`
16. `1a007c3` — `fix(frontend): keep S134 lorebook effects lint-clean`
17. `8196a9e` — `fix(backend): refresh origin fingerprint on imported new book`
18. `eeb05e4` — `chore(shared): drop dead S134 i18n keys`
19. `455680c` — `refactor(frontend): align lorebook import format type`
20. `1d6cd62` — `chore(agents): let slice-docs update AGENTS.md`
21. `e86ff0f` — `chore(agents): let slice-docs verify release notes`
22. `bf52267` — `docs(slice): add S134 review`

Este commit de docs recoge `## Decisiones`, `## Verificación`, `## Review`,
`## Deferred`, `## Commits`, `## CHANGELOG`, las entradas de `CHANGELOG.md`, la
política de `AGENTS.md`/`docs/10-slices/WORKFLOW.md` y el PR body
(`S134-pr-body.md`). Siguiente etapa: `S134-release.md`.

Queda pendiente de commit la pasada de docs que completa la traducción de
`CHANGELOG.md` (`1.50.1`→`1.54.9`); todavía no tiene hash en esta lista.

## CHANGELOG

Entradas añadidas a `CHANGELOG.md` bajo `[Unreleased]`, en inglés y en formato
Keep a Changelog (sin bump de versión). Todo el rango `1.50.1`→`[Unreleased]`
está ahora en inglés; `1.50.0` y las secciones anteriores quedan sin tocar (ya
estaban en inglés). La traducción de `1.50.1`→`1.54.9` se hizo en esta pasada de
docs, sin cambios de cabeceras, versiones, fechas, enlaces ni URLs.

- **Added:** Complete lorebook library with standalone book creation, in-use/unused
  filters and a detail page with Identity, Settings, Entries, Versions, Link and
  Danger sections.
- **Added:** Full lorebook version history; previous versions are read-only and can
  be restored as a new version.
- **Added:** Usage by version grouped by character ("In use by" and "History"),
  with real character and version counts on the shelf.
- **Added:** Link a book to a character from the book itself, creating a new
  character version.
- **Added:** Soft delete with a warning; character versions that used the book keep
  working and the book is restored by importing it again.
- **Added:** Standalone import and export per book and version in CCv3 and ST
  native, with `origin_id`/`source_key` matching, an import preview and explicit
  history reconstruction. Export per version carries `extensions.rm.originId`
  additively and preserves unknown keys.
- **Added:** Alternate-greeting picker at conversation start, applied to the first
  message of the new conversation.
- **Changed:** The lorebook shelf paginates and filters in SQL and shows real usage
  ("Used by N characters · M versions" or "Unused").
- **Fixed:** The character detail resolves linked lorebook versions in batches
  instead of one lookup per version, and version entries expose stable synthetic
  ids so snapshots round-trip between the editor and the API.
- **Fixed:** Importing a deleted book with different content gives the new book a
  fresh `origin_id` (including `extensions.rm.originId`).
- **Removed:** The obsolete `**S134**` Changed entry that announced the deferred
  lorebook actions as «S134»; they are now real features.

## Open questions (gate)

Ninguna; el alcance está cubierto por `docs/15`, `docs/16` y las decisiones
cerradas. La colisión de `origin_id` (deleted + different) y el alcance del
matcher (solo `POST /lorebooks/import`, no el import de card) se resuelven como
decisiones explícitas arriba, no como preguntas.
