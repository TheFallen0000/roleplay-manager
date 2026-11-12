# S133 — Superficie card-first de personaje + fundación de lorebooks versionados

**Estado:** En progreso (refactor de fidelidad UI pre-merge)
**Inicio:** 2026-11-11
**Fin:** 2026-11-11

> `Draft` → `Aprobado` → `En progreso` → `Completado`.
> Solo el usuario cambia `Draft` a `Aprobado`.

## Descripción

S133 convierte el personaje en una **superficie card-first seccionada** (Identidad,
Card, Fichas, Lorebook, Versiones, con nav sticky y barra de guardado) y sienta la
**fundación del versionado de lorebooks**: un `lorebook` (contenedor) ya no es 1:1
con un personaje, gana **versiones inmutables** (`lorebook_versions`) y cada
**versión de personaje fija una versión concreta de lorebook**
(`character_versions.lorebook_version_id`). Añade el **contrato de card**
(`GET/PUT /api/characters/:id/card`) con `extensions.rm` para no perder datos
nativos de RM, hace que **prompt y preview lean la versión enlazada** (no el libro
vivo), y abre una superficie básica de lorebooks (`/lorebooks`, `/lorebooks/new`,
`/lorebooks/:id` con selector de versión).

Es el primer paso de la dirección «card-first, motor RM» de `docs/14` y del plan
`docs/15`/`docs/16`: el personaje deja de ser un formulario con tabs y el lorebook
deja de ser una pestaña escondida.

## RFC

### Problema

Evidencia en el código actual (rama `master` `a309d03`):

1. **Lorebook 1:1 con el personaje, sin versiones.**
   `lorebooks.schema.ts` declara `character_id` `NOT NULL` con `uniqueIndex("lorebooks_character_idx")`
   y `onDelete: "cascade"`; `lorebook.entity.ts` exige `characterId` no vacío.
   `DrizzleLorebookRepository` solo expone `findByCharacterId` / `upsertBook` /
   `replaceBook` anclados a `character_id`. Un libro no puede existir sin personaje,
   no puede ser compartido y no tiene historial. `character-versions.schema.ts` no
   tiene `lorebook_version_id`, así que **una versión de personaje no fija un libro**:
   si edito el libro, todas las conversaciones que usan ese personaje cambian de
   contenido a la vez (viola la regla «editar un libro no cambia conversaciones
   existentes» de `docs/16`).

2. **La card pierde datos nativos de RM.** `sillytavern-card.mapper.ts` escribe solo
   `extensions.rm.tagline` (vía `withTagline`) y no lee/escribe `subtitle`,
   `instructions`, `knowledgeCards` ni `versionNumber`. La auditoría `docs/14` §3.4
   los marca como **Gap P1**: al compartir una card se pierden (son campos activos en
   prompt o en la UI). Tampoco hay **contrato canónico** `GET/PUT /api/characters/:id/card`
   (solo import/export `POST .../cards/*` de S132); no hay forma de leer/escribir el
   personaje como objeto card.

3. **El prompt/card leen el libro vivo, no una versión fijada.**
   `conversation-context-loader.service.ts:148,173` llama
   `repository.findByCharacterId(characterVersion.characterId)`; `export-sillytavern-card.use-case.ts:48`
   hace lo mismo. El `character_book` del export y el lorebook del prompt salen de la
   **cabeza viva**, no de una versión inmutable.

4. **La UI es un formulario con tabs.** `character-form.tsx` (357 líneas) usa
   `Tabs` (Personaje / Tarjetas / Lorebook). La pestaña de fichas se llama
   «Tarjetas» (`characters.tabCards = "Tarjetas"` en `es.ts`, `"Cards"` en `en.ts`),
   que **colisiona con las «cards» de SillyTavern** (`docs/14` §5 P2.6). No hay
   páginas de lorebook (`/lorebooks*` no existen); el lorebook solo se edita dentro
   del personaje.

5. **No hay superficie de lorebooks.** No existe `GET /api/lorebooks` ni rutas por
   libro; un libro no puede crearse suelto ni listarse.

6. **La migración de datos es necesaria.** La última migración es
   `0019_character_cards.sql`. S132 dejó los libros existentes sin versión; hay que
   generar su v1 y enlazar todas las versiones de personaje existentes para no
   cambiar el prompt de las conversaciones ya creadas.

**Consecuencia observable:** un usuario no puede tener un lorebook independiente,
vincularlo a varios personajes, fijar una versión concreta por versión de personaje,
ni compartir una card sin perder sus fichas de conocimiento/instrucciones. Cada
edición de libro arrastra a todas las conversaciones de ese personaje.

### Restricciones

- **Arquitectura hexagonal.** `domain/` puro (no importa `application/`,
  `infrastructure/`, `containers/`); `application/` no importa `infrastructure/`
  (excepción documentada: `error-handler`). La entidad nueva `LorebookVersion` y las
  reglas de versionado son dominio puro; los use cases orquestan; Drizzle queda en
  el repo.
- **Pureza de `shared/`.** Tipos y helpers puros sin `react`/`express`/`drizzle-orm`/
  `better-sqlite3`/etc. El `source_key` usa `node:crypto`, así que el **hash vive en
  backend** (application), no en `shared/` (el bundle del frontend nunca lo importa);
  la serialización canónica es pura y testeable.
- **500 líneas** por archivo en frontend; **aislamiento de features** (un feature no
  importa de otro; el editor de lorebook vive en `components/lorebook/` y el resumen
  compartido en `components/shared/`); **archivos sin referencia muertos**.
- **Sin dependencias pesadas.** SHA-256 con `node:crypto` (built-in); nada nuevo.
- **Local-only / sin red.** Toda la migración, el backfill y el hash son locales.
- **i18n ES/EN.** Copia en `es.ts`/`en.ts`, tuteo, términos técnicos en inglés.
  Renombrar «Tarjetas»→«Fichas» (ES) / «Cards»→«Knowledge cards» (EN) y localizar
  todas las ocurrencias user-facing.
- **Accesibilidad / PWA-móvil.** `aria-current` en sidebar y nav de secciones, foco
  visible, labels asociados, contraste AA, `prefers-reduced-motion`; nav en chips en
  móvil y save bar al pie; probar 1440/1024/768/390.
- **Backward compatibility S129–S132.** El contrato de prompt **no cambia de forma**:
  solo cambia la fuente del lorebook (versión enlazada en vez de libro vivo). Los
  snapshots S129 son el ancla. Las rutas `POST/GET/PUT /api/characters/:id/lorebook*`
  y `POST /api/characters/cards/*` (S132) siguen funcionando.
- **Integridad de datos.** `character_versions.lorebook_version_id` FK
  `ON DELETE RESTRICT`; soft delete del contenedor; borrar un personaje no borra el
  libro. Las conversaciones antiguas siguen fijadas a su versión de personaje y, por
  tanto, a su versión de lorebook.
- **Orden de rutas.** Las rutas `/characters/:id/card` y `/lorebooks*` se montan
  **antes** de `/characters/:id` (ya montadas antes en `server.ts:151-155`).
- **Fuera de alcance duro.** Chats/JSONL, CHARX, assets V3, group chats, timed
  effects/probabilidad/grupos/decoradores/`vectorized`, prompt manager de ST,
  múltiples lorebooks por versión de personaje, limpieza de versiones huérfanas.

### Opciones consideradas

#### Modelo de datos (versionado de lorebook)

| # | Opción | Ventajas | Costes | ¿Elegida? |
| --- | --- | --- | --- | --- |
| **A** | **Contenedor vivo (`lorebooks`+`lorebook_entries`) + `lorebook_versions` inmutables** con `entries_json` y `source_key`; `character_versions.lorebook_version_id` fija la versión. | La cabeza viva se edita igual que hoy; la versión inmutable **es** la captura (sin tabla de snapshots paralela); el usuario ve y elige versiones; soft delete preserva historial. | Migración de datos + entidad/repo/use-cases + UI de selector. | **Sí** |
| **B** | Snapshot oculto (`character_versions.lorebook_json`) sin entidad de versión. | Migración mínima. | El usuario no ve qué copia usa cada versión; no hay historial ni selector; reimportar es frágil. | No (contradice `docs/16` §2) |
| **C** | Mover todo el contenido al JSON de la versión (sin `lorebook_entries` como cabeza). | Un solo lugar. | Pierde la edición por entrada y las queries/índices actuales; reescribe S132. | No |

Descarte de B/C: `docs/16` cierra A. La versión inmutable **es** la captura y la
cabeza viva sigue siendo `lorebooks`+`lorebook_entries`.

#### Estrategia de migración (0020) y backfill

| # | Opción | Ventajas | Costes | ¿Elegida? |
| --- | --- | --- | --- | --- |
| **A** | **SQL `0020` (schema, generado por drizzle-kit) + backfill TypeScript idempotente** que corre tras `runMigrations` (selecciona libros con `current_version_id IS NULL` y repara/continúa si ya existe una v1 sin enlazar). | `source_key` (SHA-256) se calcula en TS con `node:crypto`; el backfill enlaza las versiones de personaje antes de que la columna legacy quede inservible; idempotente y testeable, incluida la reparación de fallos parciales. | Un módulo TS extra + un punto de llamada en `index.ts`. | **Sí** |
| **B** | Todo en SQL (puro). | Sin TS. | SQLite **no puede calcular SHA-256**; el `source_key` quedaría vacío o en un hash SQL aproximado; el enlazado de versiones requiere leer `character_id` antes de soltarlo (frágil). | No |
| **C** | Migración a mano que dropea `character_id` en 0020 y relee el vínculo por `character_versions`. | Sin columna legacy. | El backfill corre **después** del SQL y ya no tendría `character_id` para saber qué versiones enlazar (pérdida de datos). | No |

Descarte de B/C: sin SHA-256 en SQL y sin `character_id` disponible post-drop no hay
backfill fiable. A conserva `character_id` **nullable-legacy** el tiempo justo para
enlazar y luego lo anula.

#### `character_id`: drop vs legacy

| # | Opción | Ventajas | Costes | ¿Elegida? |
| --- | --- | --- | --- | --- |
| **A** | **Legacy nullable en 0020** (rebuild de `lorebooks` para quitar `NOT NULL`, soltar el índice único y la FK cascade; el backfill anula `character_id` tras enlazar). | El backfill lee `character_id` para enlazar versiones; sin pérdida; `docs/16` §8.1 lo permite («o queda como legado»). El drop físico se aplaza a una limpieza futura. | Columna muerta temporal; una migración posterior para dropearla. | **Sí** |
| **B** | **Drop físico en 0020** (rebuild sin la columna). | Sin columna residual. | El backfill post-SQL no puede enlazar versiones (no sabe qué personaje era); habría que reordenar SQL/TS o perder el vínculo. | No en 0020 |

Descarte de B en 0020: rompe el enlazado. A es el puente necesario y está autorizado
por `docs/16`.

#### Contrato de card: resolución de `character_book` en `PUT /card`

| # | Opción | Ventajas | Costes | ¿Elegida? |
| --- | --- | --- | --- | --- |
| **A** | **Siempre crear libro nuevo + v1** en `PUT /card` (sin matching `origin_id`/`source_key`). El contenedor/versión reciben **IDs locales nuevos**; se preserva solo el `originId` importado (si viene) como `origin_id` y se **recalcula** `sourceKey` desde la v1; la respuesta devuelve los IDs nuevos en `extensions.rm.lorebook`. | Sin reconstrucción (que es S134); determinista; la card es autocontenida y los IDs devueltos son los reales (no los importados). | Reimportar la misma card crea un libro nuevo (reuse matching es S134). | **Sí** |
| **B** | Reutilizar por `origin_id`/`source_key` ya en S133. | Menos duplicados. | Es la reconstrucción de historial de S134 (`docs/16` §6); infla el slice. | No (S134) |

Descarte de B: la reconstrucción/reuse es explícitamente S134. A mantiene la
autocontención sin adelantar el matching.

#### Semántica de guardado de la página (personaje)

| # | Opción | Ventajas | Costes | ¿Elegida? |
| --- | --- | --- | --- | --- |
| **A** | **Un solo `PUT /characters/:id`** con identidad+card+fichas+`lorebookVersionId` (la página seccionada guarda por esta ruta). `PUT /characters/:id/card` queda para escrituras «como card». | At most one versión por guardado; reutiliza el `UpdateCharacterUseCase` (copia-desde-prev + `NoChangesDetectedError`). | Añadir `lorebookVersionId` al schema/use-case. | **Sí** |
| **B** | Guardar por secciones (varios endpoints). | Granularidad fina. | Dos+ versiones por guardado; estados inconsistentes; contradice `docs/15` §12.8 (un guardado global). | No |

Descarte de B: la página no debe llamar a `PUT /characters/:id` **y** `PUT /characters/:id/card`
y crear dos versiones.

#### Fuente del prompt/card

| # | Opción | Ventajas | Costes | ¿Elegida? |
| --- | --- | --- | --- | --- |
| **A** | `ConversationContextLoader` resuelve la **versión de lorebook enlazada** a `characterVersion.lorebookVersionId` y alimenta el mismo `LorebookActivationService` + `PromptContextLorebook`. | Prompt/preview parity intacta; el compilador no cambia; solo cambia la fuente. | Un paso de resolución (versión → `entries_json`). | **Sí** |
| **B** | Seguir leyendo el libro vivo por `character_id`. | Sin cambio. | Rompe la invariante «editar no cambia conversaciones»; es el problema que S133 corrige. | No |

Descarte de B: es el estado actual que se quiere eliminar.

### Decisión

Diseño elegido (coherente con `docs/16` §3–§12 y los prototipos):

1. **Modelo.** Contenedor `lorebooks` (`origin_id`, `current_version_id`,
   `deleted_at`; `character_id` queda nullable-legacy), tabla `lorebook_versions`
   (número, nombre, descripción, ajustes, `entries_json`, `source_key`), y
   `character_versions.lorebook_version_id` FK nullable `ON DELETE RESTRICT`. Una
   versión de personaje → cero o una versión de lorebook; una versión de lorebook →
   muchas versiones de personaje.

2. **Versionado.** Guardar un libro crea una versión nueva **solo si el contenido
   canónico cambió** (no-op no crea versión). Se versiona todo: nombre, descripción,
   ajustes (`scan_depth`, `token_budget`, `recursive_scanning`) y entradas. Un
   **reordenamiento relativo de entradas** cambia el orden de inyección del prompt
   (tie-break) y, por tanto, **crea versión** (el `source_key` cambia porque la
   posición en el array codifica el orden). `source_key` = SHA-256 de la
   serialización canónica (sin IDs locales ni timestamps). Versiones antiguas = solo
   lectura.

3. **Card contract.** `GET /api/characters/:id/card?spec=v2|v3&versionId=` y
   `PUT /api/characters/:id/card`. `character_book` sale de la **versión de lorebook
   enlazada**. `extensions.rm` transporta `subtitle`, `instructions`,
   `knowledgeCards`, `versionNumber`, `tagline` y `lorebook { lorebookId,
   lorebookVersionId, versionNumber, sourceKey, originId? }` (ver `Contrato de card`).
   `PUT /card` crea **una** versión de personaje; `character_book` → libro nuevo + v1
   (sin matching S134); campos desconocidos preservados.

4. **Prompt.** `ConversationContextLoader` + `ContextCompiler`/builder sin cambios;
   solo cambia la fuente (la versión enlazada). Paridad preview/send exacta.

5. **UI.** IA shell «Biblioteca» (Personajes, Lorebooks, Personajes jugados), diálogo
   «Crear» con dos placas (sin tabs), páginas seccionadas de personaje y lorebook,
   renombre «Tarjetas»→«Fichas».

6. **Migración.** SQL `0020` (schema) + backfill TypeScript idempotente (v1 + enlace
   de todas las versiones existentes + `current_version_id` + `origin_id` + anular
   `character_id`).

### Plan de migración

#### Cambios de schema (migración `0020_lorebook_versions.sql`, generada con `db:generate`)

1. **`lorebook_versions`** (tabla nueva):
   - `id` text PK; `lorebook_id` text NOT NULL FK → `lorebooks.id`
     `ON DELETE RESTRICT` (el borrado es soft; protege el historial).
   - `version_number` integer NOT NULL; `name` text; `description` text;
     `scan_depth` integer NOT NULL default 4; `token_budget` integer NOT NULL
     default 400; `recursive_scanning` integer NOT NULL default 0.
   - `entries_json` text NOT NULL (JSON completo e inmutable de las entradas).
   - `source_key` text NOT NULL (SHA-256 hex).
   - `created_at` integer NOT NULL.
   - Índice único `(lorebook_id, version_number)`; índice por `source_key`.

2. **`lorebooks`** (rebuild para soltar la restricción y añadir columnas):
   - Soltar `uniqueIndex("lorebooks_character_idx")`.
   - `character_id` pasa a **nullable y sin FK/cascade** (la columna se conserva
     como legado el tiempo del backfill; ver abajo). El índice único desaparece.
   - Añadir `origin_id` text (índice), `current_version_id` text FK →
     `lorebook_versions.id` `ON DELETE SET NULL`, `deleted_at` integer.
   - La cabeza viva (`name`, `description`, `scan_depth`, `token_budget`,
     `recursive_scanning`, `extensions`, `unknown_fields`) se conserva para edición
     y listado.

3. **`character_versions`**:
   - Añadir `lorebook_version_id` text FK → `lorebook_versions.id`
     `ON DELETE RESTRICT` (nullable). Índice por `lorebook_version_id`.

4. **Snapshot/journal.** `0020_snapshot.json` y `_journal.json` (`idx: 20`,
   `version: "6"`, `breakpoints: true`) generados por `db:generate`.
   `scripts/package.mjs` ya copia la carpeta completa de migraciones.

#### Backfill de datos (TypeScript, idempotente)

SQLite no puede calcular SHA-256 ni enlazar versiones tras soltar `character_id`,
por eso el backfill es TypeScript y corre **después** de `runMigrations` (en
`packages/backend/src/index.ts`, tras la línea 66), antes de construir el contenedor:

- **Nuevo módulo** `packages/backend/src/infrastructure/database/backfill/lorebook-versions.backfill.ts`
  con `runLorebookVersionsBackfill(db: Database): void`.
- **Canonicalización + hash** en `packages/backend/src/application/use-cases/character/lorebook/source-key.ts`:
  - `canonicalizeLorebookContent(normalized) → string`: `JSON.stringify` de
    `{ name, description, scan_depth, token_budget, recursive_scanning, entries }`
    con **orden estable de claves** y las entradas serializadas **en orden de
    presentación** (`order` asc, desempate `insertion_order` asc). Cada entrada
    canónica incluye `name`, `keys`, `secondary_keys`, `comment`, `content`,
    `constant`, `selective`, `selective_logic`, `insertion_order`, `position`,
    `priority`, `enabled`, `case_sensitive`, `whole_words`, `extensions`,
    `unknown_fields`; **excluye** `id`, `source_id`, `lorebook_id`, `order`,
    `created_at`, `updated_at` y timestamps (IDs locales y timestamps no definen
    identidad de contenido; `docs/16` §6.1). El campo `order` se excluye **porque el
    orden relativo queda codificado por la posición en el array**: un reordenamiento
    relativo de entradas cambia el array y, por tanto, el `source_key` (y debe crear
    una versión nueva).
  - `computeLorebookSourceKey(canonical: string) → string`: `createHash("sha256")`
    hex (backend-only, `node:crypto`).
- **Algoritmo** (por libro, en una transacción; **idempotente y auto-reparador**):
  1. Seleccionar libros pendientes:
     `SELECT ... FROM lorebooks WHERE current_version_id IS NULL`. Se incluyen
     también los libros que, por un fallo parcial previo, ya tienen una v1 insertada
     pero sin enlazar (se detecta y se reutiliza; ver paso 4).
  2. Leer el `character_id` legacy y las entradas vivas ordenadas por `order`.
  3. Calcular `source_key` del contenido canónico; serializar `entries_json`.
  4. Insertar la **v1** **solo si no existe ya** una versión para ese libro
     (`INSERT ... WHERE NOT EXISTS (SELECT 1 FROM lorebook_versions WHERE
     lorebook_id = <id> AND version_number = 1)`); si ya existe (fallo parcial), se
     reutiliza la v1 existente en lugar de crear una segunda.
  5. `UPDATE lorebooks SET current_version_id = <v1>, origin_id = <uuid nuevo>,
     updated_at = now WHERE id = ...` (RM genera un `origin_id` estable con
     `randomUUIDv7()`; si el libro ya tenía `origin_id` se conserva).
  6. `UPDATE character_versions SET lorebook_version_id = <v1> WHERE character_id
     = <legacy character_id>` (enlaza **todas** las versiones de ese personaje).
  7. `UPDATE lorebooks SET character_id = NULL WHERE id = ...` (anula el legado;
     «uso eliminado»).
- **Idempotencia/rollback.** El guard `current_version_id IS NULL` garantiza que todo
  libro pendiente se procesa; el `INSERT ... NOT EXISTS (v1)` del paso 4 impide
  duplicar la v1 cuando un fallo parcial la dejó creada sin enlazar (reparación). Los
  `UPDATE` son idempotentes, así que reejecutar el backfill converge a no-op. Revertir
  el código deja `lorebook_versions`/columnas nuevas en SQLite (ignoradas por
  versiones anteriores); no hay migración inversa ni pérdida. El drop **físico** de
  `character_id` se difiere a una limpieza futura (S134+), permitido por `docs/16` §8.1.

#### Decisión `character_id`

Se elige **legacy nullable** (opción A de la tabla): la columna se conserva en 0020
(sin índice único, sin FK cascade, nullable) para que el backfill pueda enlazar las
versiones de personaje, y se anula al terminar. El drop físico se aplaza. Si se
dejara `NOT NULL` o con cascade, crear un lorebook suelto (`POST /api/lorebooks`)
fallaría o borrar un personaje borraría el libro — ambas contradicen `docs/16`
§5.2/§8.1.

#### Test de migración (fixture)

Nuevo `migration-0020.test.ts` (patrón de `migration-0019.test.ts`):
- Schema: journal `idx:20`, tabla `lorebook_versions`, `character_versions.lorebook_version_id`
  con FK `RESTRICT`, `lorebooks` con `origin_id`/`current_version_id`/`deleted_at`,
  `character_id` nullable, índice `lorebooks_character_idx` **ausente**.
- Backfill: sembrar (tras `runMigrations`) un personaje + 2 `character_versions` +
  1 `lorebooks` (con `character_id` y `current_version_id` NULL) + 2
  `lorebook_entries`; ejecutar `runLorebookVersionsBackfill`; asertar v1 creada,
  `current_version_id` apuntada, **ambas** versiones enlazadas a la v1, `source_key`
  estable (recalcular la canonicalización desde la cabeza viva y comparar),
  `character_id = NULL`; re-ejecutar el backfill y asertar que **no** crea una
  segunda versión (idempotencia).
- **Reparación de fallo parcial:** sembrar un segundo libro con una v1 insertada
  manualmente pero `current_version_id` aún NULL (simula un crash entre el paso 4 y 5);
  ejecutar el backfill; asertar que **reutiliza** la v1 existente (no inserta otra),
  apunta `current_version_id`, enlaza sus versiones de personaje y anula
  `character_id`.

### Riesgos y mitigaciones

| Riesgo | Mitigación | Test / evidencia |
| --- | --- | --- |
| **Slice grande / scope creep** (migración + backend + dos superficies UI + card contract). | Deferrals explícitos a S134 (historial/restore/uso/vínculo, soft-delete/restore UI, import/export por libro, reconstrucción por `origin_id`/`source_key`); la página seccionada guarda **una** vez (`PUT /characters/:id`); el selector de saludo alternativo se mueve a S134. | `### Deferred`; criterio «una versión por guardado»; test de saludo alternativo ausente (deferido). |
| **Migración 0020 / backfill / rebuild de SQLite.** | Backfill TypeScript **idempotente y auto-reparador** (`current_version_id IS NULL` + `INSERT … NOT EXISTS (v1)`); `db:generate` genera el rebuild; **sin drop físico** de `character_id` en 0020; se verifica `character_id` nullable, sin índice único y sin FK cascade. | `migration-0020.test.ts` (schema) + `lorebook-versions.backfill.test.ts` (v1, enlace, idempotencia, reparación de fallo parcial). |
| **Perder el lorebook de conversaciones antiguas.** | Enlazar **todas** las versiones de personaje existentes a la v1; la versión inmutable no se muta; el prompt de una conversación fijada a v1 usa v1 aunque el libro vivo esté en v2. | Backfill test (ambas versiones enlazadas) + eval fixture «libro editado a v2» (prompt/preview usa v1). |
| **`source_key` canónico** (orden de claves, IDs locales, reordenamiento). | Serialización estable con entradas en orden de presentación; exclusión de `id`/`source_id`/`lorebook_id`/`order`/timestamps; reordenar crea versión (el array codifica el orden). | `source-key.test.ts` (mismo `source_key` ante reorden de claves/IDs/`order` sin reorden relativo; distinto ante reorden relativo o cambio de contenido/ajustes) + `saveLiveHeadAndVersion` reorden → v2. |
| **Doble versión de personaje por guardado.** | La página guarda **solo** por `PUT /characters/:id` (identidad+card+fichas+`lorebookVersionId`); `PUT /characters/:id/card` queda para escrituras «como card». | Test de «at most one versión» (spy de `saveVersion` llamado una vez); criterio de aceptación. |
| **Pérdida de campos desconocidos / clobber de `extensions.rm`.** | `withRmExtensions` **fusiona** (setea solo claves RM conocidas; preserva claves desconocidas en `extensions` y dentro de `extensions.rm`); `unknownFields`/`unknownRootFields` verbatim. | Round-trip de card con `extensions`, buckets desconocidos **y** clave desconocida de `extensions.rm` → field loss = 0. |
| **Rutas compat / `LorebookDTO.characterId`.** | `characterId` pasa a opcional/legacy; las rutas S132 lo **derivan** del personaje de la ruta (no del libro); `LorebookDTO`/`LorebookEntryDTO` se mueven a `lorebook.ts` con re-export. | Tests de compat `/characters/:id/lorebook*`, `/characters/cards/*`, `/lorebooks/preview`; ajuste de fixtures frontend. |
| **Lorebook eliminado / estado del personaje.** | Solo **soft delete** (nunca se borra la versión inmutable); el resumen sigue legible vía `lorebook_versions`; precedencia `deleted` → `outdated` → `current`. | Test de `CharacterVersionDTO.lorebookVersion.status` (3 ramas) + `GET /lorebooks/:id` de eliminado → 404. |
| **`PUT /card` siempre crea libro nuevo** (duplicados al reimportar). | Documentado: en S133 no hay matching; la card sigue autocontenida (conserva `originId`, recalcula `sourceKey`, devuelve IDs nuevos); el reuse es S134. | Test de `PUT /card` (IDs locales nuevos ≠ importados, `originId` preservado, `sourceKey` recalculado); nota en `### Deferred`. |
| **Frontend >500 líneas / aislamiento de features.** | Página dividida en `character-page` + secciones + hooks; editor de lorebook movido a `components/lorebook/`; resumen compartido en `components/shared/`; sin imports entre features. | `pnpm check:arch` (500 líneas, aislamiento, archivos muertos) en el gate. |
| **Regresiones S129–S132.** | El compilador no cambia (solo cambia la fuente del lorebook); snapshots S129 como ancla; paridad preview/send. | `pnpm check`, `pnpm build`, `pnpm audit --prod`, `pnpm --filter @workspace/backend eval` verdes. |

### Superficie de API

Montaje: nuevo `lorebooks.routes.ts` + `character.routes.ts` ampliado, ambos **antes**
de `/characters/:id` (en `server.ts` ya están antes las rutas card/lorebook). Se
añade `app.use("/api/lorebooks", cardJsonParser)` (15 MB) para los bodies grandes.

**Lorebooks (recurso):**

| Método | Ruta | Entrada | Salida / códigos |
| --- | --- | --- | --- |
| GET | `/api/lorebooks` | query `limit?` (1..200), `offset?` | 200 `LorebookSummaryDTO[]` (solo vivos, `deleted_at IS NULL`) |
| GET | `/api/lorebooks/:id` | — | 200 `LorebookDTO` (contenedor + versión actual + entradas vivas); 404 `LOREBOOK_NOT_FOUND` si no existe o está eliminado |
| GET | `/api/lorebooks/:id/versions` | — | 200 `LorebookVersionDTO[]` |
| GET | `/api/lorebooks/:id/versions/:versionId` | — | 200 `LorebookVersionDTO` (read-only); 404 `LOREBOOK_VERSION_NOT_FOUND` |
| POST | `/api/lorebooks` | `CreateLorebookInput` | 201 `LorebookDTO` (crea contenedor + v1; **no** enlaza personajes) |
| PUT | `/api/lorebooks/:id` | `UpdateLorebookInput` | 200 `{ lorebook: LorebookDTO, createdNewVersion: boolean }` (edita cabeza; crea versión solo si el contenido canónico cambió) |

- `CreateLorebookInput`: `name` (min 1, la página lo exige), `description?`,
  `scanDepth?` 0..64, `tokenBudget?` 0..100000, `recursiveScanning?`,
  `entries?` (`CreateLorebookEntryInput[]`, máx `MAX_LOREBOOK_ENTRIES = 1000`).
- `UpdateLorebookInput`: `name?` (nullable), `description?` (nullable), `scanDepth?`,
  `tokenBudget?`, `recursiveScanning?`, `entries?` (reemplazo completo de la cabeza
  viva). Reutiliza los límites Zod de `LorebookSettingsSchema`/`LorebookEntrySchema`
  (S132).
- **No-op:** `PUT` con contenido canónico idéntico → no crea versión; responde
  `createdNewVersion: false` con el DTO actual (no lanza error, distinto del
  `NoChangesDetectedError` del personaje).
- **Versión antigua:** no hay `PUT` sobre `versions/:versionId`; las versiones son
  inmutables. (Restore → S134.)

**Card contract (personaje):**

| Método | Ruta | Entrada | Salida / códigos |
| --- | --- | --- | --- |
| GET | `/api/characters/:id/card` | query `spec?` (`v2`\|`v3`, default `v3`), `versionId?` | 200 envelope V2/V3; `character_book` de la **versión enlazada**; 404 `CHARACTER_NOT_FOUND`/`CHARACTER_VERSION_NOT_FOUND` |
| PUT | `/api/characters/:id/card` | envelope `{ spec, spec_version?, data }` | 200 envelope V3 de la nueva versión (autocontenido); 400 `INVALID_CARD_*`; crea **una** versión de personaje |

- `PUT /card` valida con las reglas S132 (`parseCardRoot` + `cardDataToVersionFields`:
  `name` requerido, `description`/`first_mes` fallback, `MAX_PROMPT_FIELD_CHARS`,
  `MAX_LOREBOOK_ENTRIES`). Si `data.character_book` está presente → crea un libro
  nuevo + v1 (sin matching) y enlaza la nueva versión. El contenedor y la versión
  reciben **IDs locales nuevos** (no se escriben los `lorebookId`/`lorebookVersionId`
  importados como IDs locales); se preserva el `originId` importado (si viene) como
  `origin_id` del contenedor y se **recalcula** `sourceKey` desde la v1 (se puede
  asertar que coincide con el `sourceKey` de la card si el contenido no cambió). Si
  `data.extensions.rm` trae `subtitle`/`instructions`/`knowledgeCards`/`tagline`, se
  restauran (ver `Contrato de card`). Devuelve el envelope V3 con `character_book` +
  `extensions.rm` re-emitidos, con los **IDs nuevos** en `extensions.rm.lorebook`
  (`lorebookId`/`lorebookVersionId` reales, `versionNumber = 1`, `sourceKey`
  recalculado, `originId` preservado).
- **`extensions.rm.lorebook` presente pero `character_book` ausente:** se **ignora la
  huella** (no crea libro ni enlaza nada): en S133 no hay matching ni reuse local; la
  nueva versión queda sin lorebook. (La reutilización de una versión local existente
  por `lorebookVersionId` es S134, junto a la reconstrucción.)

**Personaje create/update con lorebook:**

- `POST /api/characters` y `PUT /api/characters/:id` ganan
  `lorebookVersionId?: string | null`:
  - `undefined` → conservar el vínculo de la versión previa (copia-desde-prev).
  - `null` → quitar el libro (nueva versión sin lorebook).
  - `<id>` → enlazar esa versión (validar que existe; si no, 404
    `LOREBOOK_VERSION_NOT_FOUND`).
  - El cambio de vínculo participa en la detección de «sin cambios» (cambiar solo el
    libro crea una versión).
- La **página seccionada guarda por `PUT /characters/:id`** (una sola versión). No
  llama a `PUT /characters/:id/card` en el mismo guardado.

**Compatibilidad (rutas S132, siguen funcionando):**

- `GET /api/characters/:id/lorebook`, `PUT .../lorebook`,
  `POST .../lorebook/entries`, `PUT .../lorebook/entries[:/id]`, `DELETE ...`,
  `POST .../lorebook/import`, `POST .../lorebook/export` se **mapean a la cabeza
  viva del libro** del personaje: se resuelve el contenedor por el **carácter de la
  versión actual** (back-compat: en la práctica el libro ya no es del personaje, pero
  estas rutas siguen resolviendo «el libro que usa la versión actual del personaje»).
  Semántica exacta:
  - `GET .../lorebook` → el libro vivo vinculado a la **versión actual** (vía
    `currentVersion.lorebookVersionId` → su `lorebook_id`); sin libro → 404.
  - `PUT .../lorebook` (ajustes) / CRUD de entradas → editan la **cabeza viva** y
    (en S133) generan versión nueva al guardar, igual que `PUT /lorebooks/:id`.
  - Quedan como compat; el editor real vive en `/lorebooks/:id`. Documentar que
    mutar por aquí edita la cabeza compartida (comportamiento S132).
- `POST /api/characters/cards/*` (preview/import/export) de S132 **no cambian su
  contrato**; el export empieza a usar la versión enlazada (ver `Contrato de card`).
- `POST /api/lorebooks/preview` (S132) sigue disponible.

**Comportamiento de libro eliminado:** `GET /lorebooks/:id` de un libro eliminado →
404. Las versiones enlazadas a personajes **siguen leyéndose** (el prompt/card leen
la versión inmutable por id, sin filtrar por `deleted_at`); la UI del personaje
muestra «Lorebook eliminado · <nombre> v<n>».

**Resumen de la versión enlazada (`CharacterVersionDTO.lorebookVersion`):**

El detalle de personaje debe mostrar la versión exacta y su estado. `toCharacterVersionDTO`
rellena `lorebookVersion?: LorebookVersionSummary | null`:

```ts
export interface LorebookVersionSummary {
  lorebookId: string
  versionId: string        // lorebook_versions.id enlazada
  versionNumber: number
  name: string | null
  entryCount: number
  sourceKey: string
  originId?: string | null
  status: "current" | "outdated" | "deleted"
}
```

- **Precedencia de `status`:** `deleted` si el contenedor tiene `deleted_at`; en caso
  contrario `outdated` si `versionId !== lorebooks.current_version_id`; en caso
  contrario `current`.
- Un contenedor **eliminado** sigue siendo legible a través de su versión inmutable:
  el resumen se construye desde `lorebook_versions` + el contenedor (aunque esté
  soft-deleted), para que el personaje pueda mostrar «Lorebook eliminado · nombre v<n>».
- `CharacterVersionDTO` gana `lorebookVersion?`; `GET /characters/:id` lo rellena
  (una query agregada por versión de personaje, sin N+1). La sección Versiones usa el
  mismo resumen por fila.

### Contrato de card

**Envelope** (V2/V3, igual que S132): V2 `{ spec:"chara_card_v2", spec_version:"2.0",
data }`; V3 `{ spec:"chara_card_v3", spec_version:"3.0", data }`. `GET /card` con
`versionId` exporta esa versión de personaje (default: la actual).

**`character_book`** sale de la **versión de lorebook enlazada** a la versión de
personaje seleccionada, no de la cabeza viva. Se deserializa `entries_json` de la
versión y se mapea con `bookToCardData` existente (`lorebook.mapper.ts`). Sin
lorebook → sin `character_book`. (Proyección V2 de S132 se mantiene.)

**`RmExtensions`** (nuevo en `packages/shared/src/types/sillytavern-card.ts`):

```ts
export interface RmExtensions {
  version: 1
  subtitle?: string | null
  instructions?: string | null
  knowledgeCards?: Array<{
    title: string
    content: string
    position: number
    active: boolean
  }>
  versionNumber?: number
  tagline?: string | null
  lorebook?: {
    lorebookId: string
    lorebookVersionId: string
    versionNumber: number
    sourceKey: string
    originId?: string | null
  } | null
}
```

- `knowledgeCards` ↔ `character_cards` (versionadas por `version_id`): se construyen
  desde los `cards` de la versión seleccionada; al importar se convierten en `cards`
  de la nueva versión.
- `versionNumber` = `character_versions.version_number` (número RM, no la
  `card_character_version` de ST).
- `lorebook` = huella de la versión enlazada (`lorebookId` = contenedor,
  `lorebookVersionId` = versión inmutable, `versionNumber`, `sourceKey`,
  `originId` = `lorebooks.origin_id`).

**Merge/preservación de campos desconocidos.** `extensions` se conserva verbatim
(S132). `withRmExtensions(extensions, rm)` **fusiona, no sobrescribe**: lee el objeto
`extensions` existente y su `extensions.rm` (si existe), **setea/actualiza solo las
claves RM conocidas** (`version`, `subtitle`, `instructions`, `knowledgeCards`,
`versionNumber`, `tagline`, `lorebook`) y **preserva** las claves desconocidas tanto
en `extensions` (otros namespaces) como dentro de `extensions.rm` (claves que no
gestionamos), re-emitiéndolas tal cual. Es el mismo patrón de `withTagline` de S132
ampliado a todo el namespace. `readRmExtensions(extensions)` extrae solo las claves
conocidas. `unknownFields`/`unknownRootFields` siguen verbatim en su bucket.

**`nickname` NO entra en `extensions.rm`** (no está en la lista aprobada); sigue
round-trip en `unknownFields`. Ver `Decisiones`/`Deferred`.

**Import/export autocontenido.** Exportar una card incluye el `character_book`
exacto de la versión y la huella `extensions.rm.lorebook`; importarla en otra
instalación crea libro + v1 (en S133) o reutiliza (S134). En `PUT /card`, el
contenedor y la versión reciben **IDs locales nuevos**; el `originId` importado (si
viene) se conserva como `origin_id` y el `sourceKey` se **recalcula** desde la v1
(no se copian los IDs locales importados como propios; esos solo describen la
instalación de origen). El export de una **versión antigua** de personaje usa su
versión de lorebook (la que tenía enlazada), no la actual.

**Endpoints S132 que cambian de fuente (sin cambiar contrato):**
`export-sillytavern-card.use-case.ts` resuelve el `character_book` desde la versión
enlazada en vez de `findByCharacterId`. El `POST /api/characters/:id/cards/export`
sigue exportando la **versión actual** salvo que se especifique `versionId` (el
nuevo `GET /card?versionId=` cubre el export por versión concreta).

### Prompt y contexto

- `ConversationContextLoader.loadLorebook` deja de recibir `characterId` y resuelve
  la versión: si `characterVersion.lorebookVersionId` está presente → `lorebookRepository.findVersionById(id)`
  → deserializar `entries_json` → construir el input de activación con los ajustes de
  la **versión** (`scan_depth`, `token_budget`, `recursive_scanning`) → mismo
  `LorebookActivationService` → mismo `PromptContextLorebook`. Si no hay vínculo →
  `null` (sin lorebook, como hoy).
- `ContextCompiler`/`PromptContextBuilderImpl` **no cambian**: el `PromptContextLorebook`
  (before/after/overBudgetCount) entra por el camino S129. Paridad preview/send
  exacta (ambos pasan por el loader).
- **Libro eliminado:** la versión se lee por id sin filtrar `deleted_at`; la
  conversación sigue funcionando con su copia (objetivo del soft delete).
- **Sin lorebook:** sección ausente (paridad con hoy).
- **Manifiesto:** `ContextManifestDTO.lorebook` gana opcionalmente
  `versionNumber` y `sourceKey` (depuración, `docs/16` §12.13); sin cambio de forma.

### UI y componentes

**IA shell (`components/layout/app-shell.tsx`):** grupo «Biblioteca» / «Library»
(renombra `nav.groupCharacters`) con Personajes (`/`), Lorebooks (`/lorebooks`) y
Personajes jugados (`/player-characters`). `isActive` distingue `/`, `/lorebooks` y
`/player-characters` (no `startsWith("/")` a secas). Icono de libro (`BookOpenIcon`).

**Diálogo «Crear» (`components/shared/create-dialog.tsx`):** modal con **dos placas**
grandes (Personaje → `/characters/new`, Lorebook → `/lorebooks/new`), mismo peso,
sin tabs ni campos; enlace terciario «Importar card»; cierra con `Esc`/click fuera y
devuelve foco. Sustituye el modal con pestañas de S132.

**Páginas de personaje (sustituyen `CharacterForm`):** `/characters/new` y
`/characters/:id` montan una página seccionada:
- `components/character/character-page.tsx` (shell: header, nav, secciones, save bar),
  `character-section-nav.tsx` (sticky; chips horizontales en móvil),
  `character-save-bar.tsx` (sticky al pie en móvil; visible cuando hay cambios).
- Secciones: `sections/identity-section.tsx`, `card-section.tsx`,
  `fichas-section.tsx` (renombra «Tarjetas»), `lorebook-section.tsx`,
  `versions-section.tsx`. Estado en `use-character-page.ts`.
- **Crear empieza vacío con placeholders** (el ejemplo precargado del prototipo es
  solo demo de revisión); avanzados de Card plegados (`details`). Lorebook opcional
  con selector libro+versión (default la versión actual; aviso de «versión antigua»).
- **Detalle:** header con identidad/acciones; sección Lorebook muestra la **versión
  enlazada exacta** (nombre, versión, entradas, ajustes, estado del libro vivo:
  actual/editado/eliminado) y acciones «Abrir», «Cambiar» (crea versión nueva del
  personaje), «Quitar» (crea versión nueva sin libro); sección Versiones lista cada
  versión con el libro/versión usado.
- **Guardado:** un solo `PUT /characters/:id` (identidad+card+fichas+`lorebookVersionId`);
  guardar crea una versión nueva (aviso «Guardar crea una versión nueva»).

**Páginas de lorebook:**
- `/lorebooks` (`components/lorebook/lorebook-list.tsx` + `lorebook-card.tsx`):
  directorio básico (cards con versión actual, nº entradas, «Sin usar»), «Crear»
  abre el diálogo o va a `/lorebooks/new`.
- `/lorebooks/new` (`components/lorebook/lorebook-page.tsx` en modo crear):
  Identidad (nombre obligatorio), Ajustes, Entradas; crea **v1** y **no enlaza**
  personajes (nota «podrás vincularlo después»).
- `/lorebooks/:id`: detalle con selector de versión (header), Identidad, Ajustes,
  Entradas; versión antigua en **read-only** (banner «solo lectura»); guardar crea
  versión nueva. (Historial completo, uso/vínculo, soft delete/restore → S134.)
- `components/lorebook/lorebook-section-nav.tsx`, `lorebook-identity-section.tsx`,
  `lorebook-settings-section.tsx`, `lorebook-entries-section.tsx`,
  `lorebook-entry-form.tsx` (movido de `character/`), `lorebook-editor.tsx`
  (movido/refactorizado de `character/`), `use-lorebook-page.ts`.
- `lib/api/lorebooks.ts` (nuevo); `lib/api/lorebook.ts` (S132) se mantiene por
  compat o se migra.

**Accesibilidad/móvil/estados vacíos:** `aria-current` en nav y secciones; foco
visible; labels; contraste AA; `prefers-reduced-motion`; nav en chips + save bar al
pie en móvil; estados vacíos (sin personajes, sin lorebooks, personaje sin fichas,
personaje sin lorebook, lorebook sin entradas). Reutilizar primitivas de
`@workspace/ui` (nada nuevo).

### Inventario de archivos

**shared (`packages/shared`):**
- `src/types/lorebook.ts` (nuevo): `LorebookSummaryDTO`, `LorebookVersionDTO`,
  `LorebookVersionSummary`, `CreateLorebookInput`, `UpdateLorebookInput`,
  `CreateLorebookEntryInput`. **No se redefine `LorebookDTO`/`LorebookEntryDTO`:**
  esas viven hoy en `src/types/sillytavern-card.ts` y se **mueven aquí** (o se
  re-exportan desde `lorebook.ts` para no romper los imports S132) con su shape
  actualizado: `LorebookDTO.characterId` pasa a `characterId?: string | null`
  (nullable, legado). Las rutas compat S132 (`GET /characters/:id/lorebook`) siguen
  derivando `characterId` = el personaje de la ruta (no del libro) para no romper el
  DTO; los consumidores frontend (`lib/api/lorebook.ts`, fixtures/tests) se ajustan a
  `characterId` opcional. `LorebookDTO` gana `originId?`, `currentVersionId?`,
  `deletedAt?` y `currentVersionNumber?`.
- `src/types/sillytavern-card.ts` (extender): `RmExtensions` + `CharacterCardEnvelope`;
  re-exportar `LorebookDTO`/`LorebookEntryDTO` desde `lorebook.ts` (compat).
- `src/types/character.ts` (extender): `CharacterVersionDTO.lorebookVersion?: LorebookVersionSummary | null`,
  `CreateCharacterInput.lorebookVersionId?`, `UpdateCharacterInput.lorebookVersionId?`.
- `src/i18n/locales/es.ts` + `en.ts`: `nav.groupLibrary`, `nav.lorebooks`,
  `create.*`, `characters.section*` (identity/card/fichas/lorebook/versions),
  `characters.fichas*`, `characters.lorebookVersion*`, `lorebooks.*`; renombrar
  `characters.tabCards`.
- `src/index.ts` (re-exportar).

**backend (`packages/backend`):**
- `domain/entities/lorebook.entity.ts` (cambiar): `characterId` pasa a
  **opcional/legacy** (`characterId?: string | null`); se elimina el invariante
  `Lorebook characterId is required` (o solo se comprueba cuando está presente) para
  poder construir un libro **standalone** (`POST /api/lorebooks` sin personaje).
  Gana los campos de contenedor del modelo: `originId?: string | null`,
  `currentVersionId?: string | null`, `deletedAt?: Date | null` (getters + `withX()`
  correspondientes). `withSettings` sigue actualizando la cabeza viva sin tocar
  `currentVersionId`/`deletedAt`.
- `domain/entities/lorebook-version.entity.ts` (nuevo): `LorebookVersion`
  (`create`/`reconstruct`, getters, `withX()`; invariantes `version_number ≥ 1`,
  `scan_depth ≥ 0`, `token_budget ≥ 0`, `entries_json` string no vacío).
- `domain/entities/character-version.entity.ts` (extender): prop/getter
  `lorebookVersionId?: string | null`.
- `domain/ports/lorebook.repository.ts` (extender): `findById` (contenedor),
  `list` (vivos), `findVersions`, `findVersionById`, `createContainerWithVersion`,
  `saveLiveHeadAndVersion` (crea versión si cambió), `findByCharacterId` (compat).
- `domain/ports/character.repository.ts` (extender): `saveVersion`/`findVersionById`
  mapean `lorebookVersionId`.
- `application/use-cases/character/lorebook/source-key.ts` (nuevo).
- `application/use-cases/character/lorebook/` (nuevos): `list-lorebooks`,
  `get-lorebook-by-id`, `create-lorebook`, `update-lorebook`,
  `list-lorebook-versions`, `get-lorebook-version`.
- `application/use-cases/character/sillytavern-card.mapper.ts` (extender):
  `readRmExtensions`/`withRmExtensions`, `lorebookVersionToCardData`.
- `application/use-cases/character/lorebook/lorebook.mapper.ts` (extender):
  `toLorebookDTO` mapea los campos nuevos del contenedor (`originId`,
  `currentVersionId`, `deletedAt`) y `characterId` opcional; nuevo
  `toLorebookVersionDTO` (deserializa `entries_json` → `entries`).
- `application/use-cases/character/export-sillytavern-card.use-case.ts` (cambiar
  fuente a la versión enlazada).
- `application/use-cases/character/get-character-card.use-case.ts` (nuevo).
- `application/use-cases/character/update-character-card.use-case.ts` (nuevo).
- `application/use-cases/character/update-character.use-case.ts` y
  `create-character.use-case.ts` (extender: `lorebookVersionId`).
- `application/services/conversation-context-loader.service.ts` (cambiar fuente).
- `application/services/lorebook-activation.service.ts` (aceptar versión/entradas).
- `infrastructure/adapters/secondary/drizzle/schema/lorebook-versions.schema.ts`
  (nuevo); `lorebooks.schema.ts` y `character-versions.schema.ts` (cambiar);
  `schema/index.ts` (exportar).
- `infrastructure/adapters/secondary/drizzle/repositories/drizzle-lorebook.repository.ts`
  y `drizzle-character.repository.ts` (extender).
- `infrastructure/adapters/primary/routes/lorebooks.routes.ts` (nuevo);
  `character.routes.ts` (extender: card + `lorebookVersionId`); `server.ts` (montar).
- `infrastructure/database/migrations/0020_lorebook_versions.sql` + `meta/*` (generado).
- `infrastructure/database/backfill/lorebook-versions.backfill.ts` (nuevo).
- `index.ts` (llamar al backfill tras `runMigrations`).
- `containers/app-container.ts` (cablear use cases + router deps).

**frontend (`packages/frontend`):**
- `lib/api/lorebooks.ts` (nuevo); `lib/api/sillytavern-card.ts` (extender
  `getCharacterCard`/`updateCharacterCard`); `lib/api/characters.ts` (extender
  `lorebookVersionId`). `lib/api/lorebook.ts` (S132) y sus consumidores/fixtures
  (`use-lorebook.ts`, `lorebook-editor.tsx`, `lorebook-import/export-dialog.test.tsx`,
  `character-form.test.tsx`) se ajustan a `LorebookDTO.characterId` opcional.
- `components/shared/create-dialog.tsx` (nuevo).
- `components/layout/app-shell.tsx` (cambiar).
- `components/character/`: `character-page.tsx`, `character-section-nav.tsx`,
  `character-save-bar.tsx`, `sections/{identity,card,fichas,lorebook,versions}-section.tsx`,
  `use-character-page.ts` (nuevos); `character-form.tsx` se retira/sustituye.
- `components/lorebook/`: `lorebook-list.tsx`, `lorebook-card.tsx`,
  `lorebook-page.tsx`, `lorebook-section-nav.tsx`,
  `lorebook-{identity,settings,entries}-section.tsx`, `lorebook-entry-form.tsx`,
  `lorebook-editor.tsx` (movido), `use-lorebook-page.ts`.
- `pages/characters/new.astro` y `[id].astro` (cambiar); `pages/lorebooks/index.astro`,
  `new.astro`, `[id].astro` (nuevos).

**tests:** ver `Plan de tests`.

### Plan de tests

Comandos exactos:
- `pnpm --filter @workspace/backend test`
- `pnpm --filter @workspace/backend eval` (snapshots de ensamblado/contexto; ancla S129)
- `pnpm --filter @workspace/frontend exec vitest run`
- `pnpm check` (arch + typecheck + lint), `pnpm build`, `pnpm audit --prod`

Fixtures deterministas, sin red, en memoria (patrón S132). Cobertura:

**Backend:**
1. `migration-0020.test.ts` (schema): journal `idx:20`, tabla `lorebook_versions`,
   `character_versions.lorebook_version_id` FK `RESTRICT`, `lorebooks` con
   `origin_id`/`current_version_id`/`deleted_at`, `character_id` nullable, índice
   único `lorebooks_character_idx` ausente.
2. `lorebook-versions.backfill.test.ts`: fixture S132 (personaje + 2 versiones +
   libro con `character_id` + 2 entradas) → backfill → v1 + `current_version_id` +
   **ambas** versiones enlazadas + `source_key` estable + `character_id = NULL`;
   re-ejecutar → idempotente (sin segunda v1).
3. `source-key.test.ts`: `computeLorebookSourceKey` **estable** (mismo `source_key`)
   ante (a) reordenación de claves del JSON de entrada, (b) cambio de IDs locales
   (`id`, `source_id`, `lorebook_id`) y timestamps, y (c) cambio de los valores
   numéricos de `order` **sin** cambiar el orden relativo (misma secuencia de
   entradas); **distinto** ante (d) un reordenamiento relativo de entradas (cambia la
   posición en el array) y (e) cambio de contenido o de ajustes
   (`scan_depth`/`token_budget`/`recursive_scanning`/nombre/descripción). El caso (d)
   debe reflejarse en `saveLiveHeadAndVersion`: reordenar crea una versión nueva.
4. Repositorio `drizzle-lorebook.repository.test.ts` (extender): `createContainerWithVersion`
   (contenedor + v1), `findById`/`list` (filtra eliminados), `findVersions`/
   `findVersionById`, `saveLiveHeadAndVersion` (contenido cambiado → v2; **reordenar
   entradas → v2**; idéntico → sin versión), `findVersionById` por id inmutable;
   `Lorebook.create` sin `characterId` (standalone) construye y persiste.
5. Use cases: `create-lorebook` (standalone, v1, **sin** `characterId`), `update-lorebook`
   (no-op vs versión nueva; reordenar entradas → versión nueva), `list-lorebook-versions`,
   `get-lorebook-version` (read-only), `update-character`/`create-character` con
   `lorebookVersionId` (link/change/remove → una versión; `undefined` copia; `null`
   desvincula; id inválido → 404).
6. Card contract: `get-character-card.use-case` / `update-character-card.use-case` +
   mapper round-trip V2/V3 con `character_book` (de la versión enlazada) +
   `extensions.rm` (subtitle/instructions/knowledgeCards/versionNumber/tagline/lorebook)
   + campos desconocidos (`extensions`/`unknown_fields`/`unknown_root_fields`) **y una
   clave desconocida dentro de `extensions.rm`** (preservada por `withRmExtensions`,
   no sobrescrita) → **field loss = 0**; `PUT /card` crea una versión y enlaza el
   libro nuevo con **IDs locales nuevos** en la respuesta (distintos de los
   importados), `originId` importado conservado y `sourceKey` recalculado;
   `extensions.rm.lorebook` sin `character_book` → sin vínculo (huella ignorada);
   `GET /card?versionId=` exporta la versión antigua con su libro.
7. Prompt: `conversation-context-loader` resuelve la versión enlazada (no
   `findByCharacterId`); conversación fijada a versión v1 → usa las entradas de v1
   aunque el libro vivo esté en v2; libro eliminado → sigue leyendo la versión; sin
   vínculo → sin lorebook; paridad preview/send exacta (`get-prompt-context.parity.test.ts`).
8. Rutas: `lorebooks.routes.test.ts` + `character.routes.test.ts` (card) — Zod y
   códigos; no-op save (`createdNewVersion:false`); versión antigua sin `PUT`;
   `GET /lorebooks/:id` de eliminado → 404; orden de montaje (rutas card/lorebooks
   antes de `/characters/:id`); compat `/characters/:id/lorebook*`.
9. `NoChangesDetectedError` con solo cambio de lorebook no se dispara (crea versión).
10. `CharacterVersionDTO.lorebookVersion`: `get-character` devuelve el resumen con
    `status` correcto — `current` (versión enlazada = `current_version_id`),
    `outdated` (enlazada ≠ actual, contenedor vivo), `deleted` (contenedor con
    `deleted_at`, resumen legible a través de la versión inmutable). Cubre las tres
    ramas de precedencia.

**Frontend (RTL):**
- `create-dialog.test.tsx`: dos placas, sin tabs, navega a `/characters/new` y
  `/lorebooks/new`, cierre con `Esc`.
- `app-shell.test.tsx`: grupo «Biblioteca», item Lorebooks, `aria-current` correcto
  en `/`, `/lorebooks`, `/player-characters`.
- `character-page` + secciones: nav sticky, save bar, placeholders en creación
  (empieza vacío), fichas renombradas, selector de lorebook con versión y estados
  (sin lorebook, versión antigua, libro eliminado), cambiar/quitar → una llamada a
  `PUT /characters/:id`.
- `lorebook-list`/`lorebook-page`: directorio, crear v1 sin vínculo, selector de
  versión, versión antigua read-only.

**Casos negativos:** doble versión prevenida (la página guarda una vez);
`createdNewVersion` en no-op; campos desconocidos preservados; libro eliminado
compatible; rutas compat S132; `pnpm check`/`pnpm build`/`pnpm audit --prod` verde;
sin archivos >500 líneas; aislamiento de features.

## Plan de eval

Obligatorio (toca prompt/contexto/card). Sin red.

- **Fixtures (deterministas):**
  1. **S132 → 0020:** un personaje con un lorebook (2 entradas) y 2+ versiones de
     personaje. Ejecutar migración + backfill. Asertar: v1 creada,
     `current_version_id` apuntada, **todas** las versiones enlazadas a v1,
     `source_key` estable (recalcular y comparar).
  2. **Libro editado a v2:** la misma conversación fijada a la versión v1 del
     personaje; editar el libro vivo a v2. El prompt/preview usa las entradas de v1
     (no v2).
  3. **Card round-trip V2/V3:** card con `character_book` (versión enlazada) +
     `extensions.rm` completo + campos desconocidos → `GET /card` → `PUT /card` →
     `GET /card`; **field loss = 0** (raíz, `data`, libro, entrada, `extensions.rm`).
  4. **Guardado de lorebook:** contenido cambiado → crea v2; **reordenar entradas**
     → crea v2 (el orden relativo cambia el `source_key`); guardado idéntico → no
     crea versión (`createdNewVersion:false`).
  5. **Paridad preview/send:** mismo `systemPrompt` y mismo manifiesto para la misma
     conversación con lorebook versionado.

- **Métricas:** `field loss = 0`; nº de versiones creadas por guardado (≤ 1 para el
  personaje; 1 o 0 para el libro); paridad exacta; snapshots S129 intactos;
  `lorebook.versionNumber`/`sourceKey` correctos en el manifiesto; cero llamadas de red.

- **Baseline:** comportamiento S132 (prompt/card leen el libro vivo por
  `character_id`; sin `extensions.rm` salvo `tagline`; sin versiones). Capturado con
  los tests S129–S132 existentes y los snapshots de `pnpm --filter @workspace/backend eval`.

- **Umbral:** 100 % de fixtures nuevos en verde; **cero regresiones S129–S132**
  (snapshots intactos); `pnpm check`, `pnpm build`, `pnpm audit --prod` verde.

## Criterios de aceptación

- [x] Migración `0020` crea `lorebook_versions`, añade `origin_id`/`current_version_id`/`deleted_at`
      a `lorebooks` y `lorebook_version_id` (FK `RESTRICT`) a `character_versions`;
      suelta el índice único `lorebooks_character_idx` y la FK cascade de `character_id`.
- [x] Backfill idempotente y **auto-reparador**: v1 para cada libro existente,
      `current_version_id`, `origin_id`, `source_key` (SHA-256 canónico), enlace de
      **todas** las versiones de personaje a la v1, y `character_id` anulado; un
      fallo parcial (v1 insertada sin enlazar) se repara reutilizando la v1 (sin
      duplicar) en la siguiente ejecución.
- [x] `ConversationContextLoader` resuelve la versión enlazada (no el libro vivo);
      preview/send parity exacta; libro eliminado sigue funcionando; sin vínculo →
      sin lorebook.
- [x] `GET /api/characters/:id/card?spec=&versionId=` y `PUT /api/characters/:id/card`
      con `character_book` de la versión enlazada y `extensions.rm` completo
      (subtitle, instructions, knowledgeCards, versionNumber, tagline, lorebook).
- [x] Card round-trip autocontenido con field loss = 0 y campos desconocidos
      preservados (incluida una clave desconocida dentro de `extensions.rm`);
      `PUT /card` devuelve los **IDs locales nuevos** (no los importados), conserva el
      `originId` importado y recalcula `sourceKey`.
- [x] Endpoints de lorebooks: `GET /lorebooks`, `GET /lorebooks/:id`,
      `GET /lorebooks/:id/versions`, `GET /lorebooks/:id/versions/:versionId`,
      `POST /lorebooks` (**standalone**: crea contenedor + v1 sin personaje), `PUT
      /lorebooks/:id` (versión nueva solo si cambió, **incluido un reordenamiento
      relativo de entradas**; no-op → `createdNewVersion:false`).
- [x] Crear/editar personaje acepta `lorebookVersionId` (link/change/remove) y crea
      **una** versión por guardado.
- [x] Rutas compat S132 (`/characters/:id/lorebook*`, `/characters/cards/*`,
      `/lorebooks/preview`) siguen funcionando.
- [x] Sidebar «Biblioteca» con Personajes, Lorebooks y Personajes jugados; diálogo
      «Crear» con dos placas (sin tabs).
- [x] `/characters/new` y `/characters/:id` seccionados con nav sticky, save bar y
      placeholders (creación empieza vacía).
- [x] «Tarjetas» → «Fichas» / «Cards» → «Knowledge cards» en todas las ocurrencias
      user-facing.
- [x] Sección Lorebook del personaje muestra la versión exacta y su estado
      (current/outdated/deleted) y acciones cambiar/quitar que crean versión nueva.
- [x] `CharacterVersionDTO.lorebookVersion` (resumen: lorebookId, versionId,
      versionNumber, name, entryCount, sourceKey, originId?, status) con la
      precedencia correcta: `deleted` si `deleted_at`, si no `outdated` si
      `versionId !== current_version_id`, si no `current`; un contenedor eliminado
      sigue legible a través de su versión inmutable.
- [x] `/lorebooks`, `/lorebooks/new` (v1, sin vínculo) y `/lorebooks/:id` con
      selector de versión y versión antigua read-only.
- [x] Sin regresiones S129–S132; `pnpm check`, `pnpm build` y `pnpm audit --prod`
      en verde; sin archivos >500 líneas; aislamiento de features respetado.

## Red tests

- **Comando:**
  - `pnpm --filter @workspace/backend test`
  - `pnpm --filter @workspace/frontend exec vitest run`
- **Fallo esperado:** S133 aún no está implementado. Los rojos válidos son módulos
  nuevos ausentes (`Cannot find module`), tabla/columna nueva ausente
  (`lorebook_versions`, `lorebook_version_id`, `origin_id`, `current_version_id`,
  `deleted_at`), métodos nuevos del puerto/repositorio ausentes, endpoints/rutas
  nuevas en 404, componentes/páginas nuevas ausentes y asserts de comportamiento
  todavía no implementado (p. ej. el loader sigue usando `findByCharacterId` y el
  prompt no contiene la versión enlazada). No hay fallos de infraestructura.
- **Salida relevante (2026-11-11):**
  - backend: `17 failed | 141 passed` archivos, `28 failed | 962 passed` tests.
    Representativos: `Cannot find module './get-character-card.use-case'`,
    `'./update-character-card.use-case'`, `'./create-lorebook.use-case'`,
    `'./get-lorebook-version.use-case'`, `'./source-key'`, `'./lorebooks.routes'`,
    `'../../../../application/use-cases/character/lorebook/source-key'`;
    `withRmExtensions is not a function`; `repository.findById is not a function`;
    `Lorebook.create` sin `characterId` lanza `Cannot read properties of undefined (reading 'trim')`;
    `NOT NULL constraint failed: lorebooks.character_id`; journal sin `idx: 20`;
    `columnsOf("lorebook_versions")` vacío; `findVersionById` llamado 0 veces y
    `findByCharacterId("char-1")` todavía usado; rutas card/lorebooks en 404;
    `expected 404 to be 200` en la ruta de lorebooks.
  - frontend: `7 failed | 77 passed` archivos, `4 failed | 430 passed` tests.
    Representativos: `Failed to resolve import "./create-dialog"`,
    `"./character-page"`, `"./lorebook-list"`, `"./lorebook-page"`,
    `"./lorebook-editor"`, `"./character-form-fields"`; `AppShell` no muestra el
    grupo «Biblioteca» ni el enlace `/lorebooks`.
  - Se retiraron los tests del formulario con tabs (`character-form.test.tsx`) y se
    movieron `character-form-fields.test.ts` / `lorebook-editor.test.tsx` a
    `components/lorebook/`. `migration-0019.test.ts` y
    `drizzle-lorebook.repository.test.ts` se ajustaron a las invariantes S133
    (sin índice único por personaje ni cascade personaje→libro).
  - `migration-0020` conserva intencionadamente el assert del cascade
    `lorebook_entries → lorebooks`; es un guard de regresión, no un rojo.
  - Falsos verdes corregidos: el round-trip del mapper se endureció para exigir el
    namespace `extensions.rm` completo; el test del shell se endureció para exigir
    «Biblioteca». Se añadió un polyfill mínimo de `matchMedia` en
    `packages/frontend/src/test-setup.ts` (infraestructura de test, no producción).
- **Plan:** `docs/10-slices/S133-test-plan.md` (30 casos; matriz, fixtures y
  criterios de rojo válido).
- **Ajustes de harness/fixtures:** antes de implementar se añadió el polyfill de
  `matchMedia` y se alinearon los fixtures S132 (schema de lorebooks, `characterId`
  opcional y componentes movidos) con el contrato S133; no cambian la razón de rojo.

## Decisiones

- **Contenedor + versiones inmutables** (`docs/16` §3): `lorebooks`+`lorebook_entries`
  siguen siendo la cabeza editable; `lorebook_versions` guarda snapshots inmutables.
- **`character_id` legacy nullable en 0020** (gate aprobado; no drop físico): el
  backfill necesita leer `character_id` para enlazar las versiones de personaje; el
  drop se aplaza. Al terminar, `character_id` queda `NULL` (uso eliminado) y sin
  índice único ni FK cascade.
- **Backfill TypeScript idempotente** tras `runMigrations` (SQL no calcula SHA-256):
  guard `current_version_id IS NULL` + `INSERT ... NOT EXISTS (v1)` (auto-repara
  fallos parciales sin duplicar); `node:crypto` en backend; `source_key` excluye IDs
  locales (`id`, `source_id`, `lorebook_id`), `order` y timestamps.
- **Card: crear libro + v1 en `PUT /card`** (gate aprobado; sin matching
  `origin_id`/`source_key`): la reconstrucción/reuse es S134. El contenedor/versión
  reciben **IDs locales nuevos**; se conserva solo el `originId` importado (como
  `origin_id`) y se recalcula `sourceKey`; la respuesta devuelve los IDs nuevos.
  `extensions.rm.lorebook` sin `character_book` se ignora (sin vínculo).
- **Fix B1 (imports con libro pero sin v1):** `createWithFirstVersion` crea, en una
  sola transacción, el libro standalone, sus entradas vivas y la v1 (`entriesJson` +
  `source_key` SHA-256), fija `lorebooks.current_version_id` y enlaza
  `character_versions.lorebook_version_id`; el import aplica esa v1 a todas las
  versiones posteriores. `create-character` da precedencia al selector
  `lorebookVersionId` sobre el payload legacy `input.lorebook` (con selector presente
  no se construye libro del payload).
- **Guardado de la página = un solo `PUT /characters/:id`** con `lorebookVersionId`
  (sin llamar también a `PUT /card`): evita dos versiones.
- **Semántica `lorebookVersionId`:** `undefined` copia, `null` desvincula, id enlaza
  (validado); el cambio participa en la detección de cambios.
- **No-op de libro distinto del personaje:** `PUT /lorebooks/:id` idéntico responde
  `createdNewVersion:false` (no lanza `NoChangesDetectedError`).
- **Versiones antiguas read-only:** no hay `PUT` sobre `versions/:versionId`; el
  detalle las muestra en lectura.
- **Fuente del prompt = versión enlazada** (no `findByCharacterId`); el compilador no
  cambia.
- **`nickname` fuera de `extensions.rm`:** no está en la lista aprobada; sigue en
  `unknownFields`. Deferido (requiere aprobación si se promociona).
- **Saludo alternativo → S134** (recomendación): añade flujo propio de
  `CreateConversationInput` + validación contra la versión + picker UI + tests sobre
  la conversación; S133 ya es grande (migración + versionado + card + dos superficies
  UI). Se documenta y difiere sin cambiar el diseño.
- **Reconciliaciones de alcance** (para no re-litigar): (1) `/lorebooks/new` **está
  en S133** (`docs/15` §4.2 lo ponía en S134, pero `docs/16` §13 y el alcance
  aprobado exigen «crear v1 + biblioteca/detalle básico»); (2) el vínculo desde el
  **detalle del lorebook** (sección «Vínculo» / «Vincular a un personaje») es
  **S134**; en S133 el vínculo se hace desde el **personaje**.

## Verificación

- **Backend:** `pnpm --filter @workspace/backend test` → 158 archivos / 1025 tests
  en verde.
- **Frontend:** `pnpm --filter @workspace/frontend exec vitest run` → 84 archivos /
  452 tests en verde.
- **Eval (ancla S129):** `pnpm --filter @workspace/backend eval` → 1 archivo / 33
  tests en verde; los snapshots de ensamblado/contexto de S129 siguen intactos (cero
  regresiones S129–S132).
- **`pnpm check`:** pasa (`check:arch` 7/7, typecheck 5/5, lint 5/5).
- **`pnpm build`:** pasa; solo aparecen avisos preexistentes.
- **`pnpm audit --prod`:** sin vulnerabilidades conocidas.
- **`git diff --check`:** limpio.
- **Release dry-run:** no ejecutado; el slice no toca empaquetado, módulos nativos ni
  lockfile.
- **Prueba manual:** capturas y comprobaciones de interacción con Playwright sobre
  escritorio (1440 px) y móvil (390 px): lista, crear/detalle de personaje,
  estantería y detalle de lorebook, diálogo Crear, exportación de card/lorebook,
  inspector JSON, vista de versiones y diálogo de borrado.
- **Estado del trabajo:** refactor UI completo en local, sin bump de versión ni
  push/PR/merge; pendiente de revisión independiente y aprobación humana.

## Refactor de fidelidad UI (pre-merge)

La implementación funcional de S133 pasó review y release checks, pero la prueba
visual contra `docs/prototypes/card-first/` mostró que la UI seguía leyéndose como
shadcn y que algunas acciones de S133 no estaban expuestas. Este refactor completa
el slice antes del merge; no abre una slice nueva ni cambia el alcance de datos.

**Decisiones cerradas con el usuario (2026-11-11):**

1. **Alcance:** shell + superficies S133 (lista/crear/detalle de personaje,
   diálogo Crear, lista/crear/detalle de lorebook). Chat, ajustes y tutoriales no
   se rediseñan en esta pasada.
2. **Sistema de diseño:** híbrido con identidad propia. Layout, paneles, cards,
   nav, fichas y tipografía propios; shadcn/Radix solo como base accesible para
   diálogos, menús y selects, re-estilizados.
3. **Acciones:** las de S133 deben funcionar (iniciar conversación, exportar,
   eliminar, ver versiones, inspector de card y export de lorebook). Lo diferido a
   S134 se oculta o se marca como «S134», nunca como botón muerto.
4. **Datos de cards:** se amplía la API de lista con tags, creador y resumen del
   lorebook actual para que las cards sean fieles al prototipo.
5. **Rama:** misma `feat/S133-card-first-character` y mismo PR #140.

**Criterios de aceptación del refactor:**

- Shell de papel con la sidebar de «Biblioteca» y topbar de tinta; sin el look
  genérico de shadcn en las superficies S133.
- Diálogo Crear con dos placas grandes (Personaje/Lorebook) y el import de card
  conectado.
- Lista de personajes con cards que muestran portada, tags, creador, versión y
  lorebook actual; acciones accesibles sin menú contextual oculto.
- Crear/detalle de personaje con portada, nav vertical sticky, tres columnas
  (nav, paneles, rail) y barra de guardado; placeholders en el formulario vacío.
- Acciones de S133 en el detalle: nueva conversación, exportar (RM y card),
  eliminar, inspector de card y vista de versiones.
- Sección Lorebook con ficha de libro, versión enlazada, estado y acciones
  cambiar/quitar; versiones antiguas en lectura.
- Lista de lorebooks como estantería de lomos, con filtros Todos/En uso/Sin usar.
- Detalle de lorebook con portada, secciones, historial de versiones, export
  funcional y edición completa de entradas; vínculo/uso marcados como S134.
- Tests actualizados, `pnpm check`, build, audit y revisión independiente en
  verde; sin bump de versión ni release.

### Resultado del refactor

- **Capa visual:** `packages/frontend/src/styles/card-first.css` define el
  lenguaje de paneles de papel, portadas, nav vertical, estantería de libros,
  fichas, rail y barra de guardado. Se importa desde `base.astro`.
- **Shell:** sidebar/topbar con tokens de papel y tinta; la sidebar mantiene
  Biblioteca (Personajes, Lorebooks, Personajes jugados) y el diálogo Crear.
- **Personajes:** lista con cards de estantería (tags, creador, lorebook, fechas
  y acciones visibles); crear/detalle con portada, nav sticky, tres columnas,
  rail de resumen/vista previa mini-card, fila compacta de imagen y barra de
  guardado.
- **Acciones S133:** nueva conversación, exportación RM y card, eliminación,
  inspector de card JSON y vista previa de versiones; iniciar conversación desde
  una versión concreta.
- **Lorebooks:** estantería con filtros Todos/En uso/Sin usar; detalle con
  portada, identidad, ajustes, entradas plegables y completas, versiones,
  exportación funcional y panel de vínculo marcado como S134.
- **Datos:** `CharacterSummary` incluye `tags`, `creator` y el resumen del
  lorebook enlazado; `LorebookSummaryDTO` incluye descripción, uso y fecha.
  `POST /api/lorebooks/:id/export` exporta un libro suelto.
- **Tests:** caso nuevo de metadatos de lista, export por id y acciones del
  detalle de personaje; los tests existentes se ajustaron al nuevo DOM.
- **Verificación:** `pnpm check` 7/7 + typecheck 5/5 + lint 5/5; backend 158
  archivos / 1025 tests; frontend 84 archivos / 452 tests; `pnpm build` 4/4;
  `pnpm audit --prod` limpio; `git diff --check` limpio.

## Review

- **Estado:** PASS WITH NOTES
- **Informe:** `docs/10-slices/S133-review.md`
- **Historial:** la revisión inicial quedó **BLOCKED** por B1; el fix `0892bf5` y su
  test `5d804dd` la reabren con **PASS WITH NOTES**.
- **Bloqueantes resueltos:** B1 — los imports de card/lorebook (S132) creaban el libro
  sin v1 ni enlace; ahora `createWithFirstVersion` crea la v1 y enlaza la versión de
  personaje en la misma transacción, y `import-character` propaga esa v1 a todas las
  versiones. Sin bloqueantes pendientes.
- **Notas no bloqueantes:** I1/N1–N5 recogidas en `## Deferred`; ninguna impide el
  cierre del slice.

## Deferred

- **Reconstrucción/reuse por `origin_id`/`source_key`** al reimportar → **S134**.
- **Historial completo de versiones, restore, uso por versión, «Vincular a un
  personaje», soft-delete/restore UI, import/export por libro** → **S134** (S133 solo
  trae directorio básico + detalle con selector y versión antigua read-only).
- **Drop físico de `lorebooks.character_id`** → limpieza futura (S134+).
- **Saludo alternativo al iniciar conversación** → **S134**.
- **`nickname` en `extensions.rm`** → sin aprobar; requiere decisión (sigue en
  `unknownFields`).
- **Limpieza de versiones de lorebook huérfanas** → fuera (S133/S134 no borran
  versiones automáticamente).
- **Notas de la review (no bloqueantes, ninguna impide el cierre):**
  - **I1 — N+1 en `GET /characters/:id`:** `get-character` +
    `lorebook-version-summary` hacen `findVersionById` + `findById` por versión (2N
    consultas). → limpieza/S134 (batch `IN (...)`).
  - **N1 — `toLorebookVersionDTO` sin `id` de entrada:** `entries_json` no incluye
    `id` y el DTO lo declara obligatorio; el frontend lo tolera
    (`entry.id ?? …`). → limpieza/S134 (sintetizar `id`).
  - **N2 — i18n muerta `characters.tabCards`:** «Tarjetas»/«Cards» ya no se
    referencia. → limpieza.
  - **N3 — `extensions.rm` emite `subtitle`/`instructions` en `null`:** una card sin
    `extensions` gana el namespace `rm`; cosmético, `field loss = 0`. → limpieza.
  - **N4 — paginación y `usageCount` en memoria en `listLorebooks`:** trae todo y
    hace `slice`, con `usageCount: 0` fijo. → limpieza/S134.
  - **N5 — `canonicalizeLorebookContent` vive en `shared/lib`:** re-exportado desde
    `source-key.ts`; benigno (paquete puro y hash en backend). → nota, sin acción.
- Chats/JSONL, CHARX, assets V3, group chats, lorebook avanzado (timed/probability/
  groups/decorators/vectorized), prompt manager de ST → fuera.

## Commits

Lista real de la slice (orden cronológico; sin bump de versión ni release). Los
commits de documentación y tests previos se agrupan para mantener la lista legible:

**Documentación y tests**

1. RFC de S133 (`542e86b`, `312da5a`, `7471a90`) y plan de tests (`e3f3c65`).
2. Baseline rojo, harness y fixtures S132 alineados: `a8e0fb6`, `9a5d171`,
   `4f0a61a`, `509eed0`, `c919b34`.

**Implementación**

3. `8efc2ee` — `feat(shared): add lorebook versioning and card contract types`
4. `8ee7dc0` — `feat(backend): add lorebook versions schema, 0020 migration and
   backfill`
5. `5d46b42` — `feat(backend): add lorebook resource use cases and routes`
6. `1e42791` — `feat(backend): link character versions to lorebook versions`
7. `0bca253` — `feat(backend): carry RM extensions in character cards`
8. `1eb1f49` — `feat(backend): add character card GET/PUT contract`
9. `7d1055c` — `feat(backend): resolve prompt lorebook from linked version`
10. `3cfe469` — `feat(frontend): add lorebook and character card API clients`
11. `bfbe3ba` — `feat(frontend): add card-first character and lorebook surfaces`

**Fix B1**

12. `0892bf5` — `fix(backend): link imported lorebooks to a v1`
13. `5d804dd` — test del fix B1 (v1 + enlace en los imports).

**Cierre**

14. `docs(slice)`: verificación, review, `CHANGELOG` y PR body de S133 (este
    commit).

## CHANGELOG

Entradas bajo `[Unreleased]` (en español; escrita en `CHANGELOG.md`, sin bump):

- **Added:** Biblioteca de personajes, lorebooks y personajes jugados en el panel
  lateral; diálogo «Crear» con placas de Personaje y Lorebook.
- **Added:** Página de personaje por secciones (Identidad, Card, Fichas, Lorebook,
  Versiones) con navegación fija y barra de guardado.
- **Added:** Versiones inmutables de lorebook; cada versión de personaje fija una
  versión concreta del libro.
- **Added:** Contrato de card (`GET/PUT /api/characters/:id/card`) con
  `extensions.rm` para conservar subtítulo, instrucciones, fichas, versión y la
  referencia del lorebook al importar/exportar.
- **Added:** Biblioteca y páginas de lorebooks (`/lorebooks`, `/lorebooks/new`,
  `/lorebooks/:id`) con selector de versión.
- **Changed:** «Tarjetas» pasa a llamarse «Fichas» (EN: «Knowledge cards»).
- **Changed:** El prompt y la previsualización usan la versión de lorebook enlazada,
  no el libro vivo.
- **Fixed:** Editar un lorebook ya no altera las conversaciones existentes (cada
  versión de personaje conserva su copia).

## Open questions (gate)

No hay decisiones que cambien el alcance sin cobertura en `docs/15`/`docs/16`. Los
dos puntos de control se resolvieron en la aprobación con la recomendación de abajo:

1. **`character_id` legacy-nullable vs drop físico en 0020.** Resuelto:
   legacy-nullable ahora, drop físico en una limpieza futura (`docs/16` §8.1 lo
   permite).
2. **`PUT /card` siempre crea libro nuevo + v1 en S133.** Resuelto: la reutilización
   por `origin_id`/`source_key` es S134; no hay matching en S133.
