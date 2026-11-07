# S132 — Character cards y lorebooks de SillyTavern (JSON + PNG)

**Estado:** Completado
**Inicio:** 2026-11-06
**Fin:** 2026-11-07

> `Draft` → `Aprobado` → `En progreso` → `Completado`.
> Solo el usuario cambia `Draft` a `Aprobado`.

## Descripción

Importa y exporta **character cards de SillyTavern** (V1, V2, V3, en JSON y en
PNG con chunks `tEXt` `chara`/`ccv3`) y **lorebooks** (embebidos en card y
**standalone**), vinculándolos al personaje e integrándolos como fuente de
contexto en el compilador de S129. Amplía `CharacterVersion` con los campos de la
card (personality, scenario, mensajes de ejemplo, saludos alternativos, notas del
creador, tags, creator, versión de card, `gender`/`pronouns`, `tagline`) y aplica
`system_prompt`/`post_history_instructions` como **overrides de card** con
colocación determinista. No toca chats/JSONL ni CHARX.

## RFC

### Problema

Hoy `Roleplay Manager` solo importa/exporta su formato interno
(`kind: "character-export"`, `EXPORT_SCHEMA_VERSION = 1`). Evidencia en el
código:

- `import-character.use-case.ts:139-161` rechaza cualquier payload cuyo `kind`
  no sea `character-export`; `parse-character-export.ts:37-52` repite la misma
  comprobación en el frontend. No hay ruta para un card de SillyTavern.
- `export-character.use-case.ts` solo produce `CharacterExport` interno; no hay
  salida en JSON/PNG compatible con SillyTavern.
- `CharacterVersionDTO` (`packages/shared/src/types/character.ts:38-50`) solo
  tiene `name, subtitle, description, instructions, greeting, cards`. No existen
  `personality`, `scenario`, `mes_example`, `alternate_greetings`,
  `creator_notes`, `tags`, `creator`, `character_version`, `system_prompt`,
  `post_history_instructions`, `gender`, `pronouns`, `tagline`, `extensions` ni
  `character_book`. Al importar un card, todo ese material se pierde.
- No existe el concepto de **lorebook**: `conversation-context-loader.service.ts`
  resuelve `characterVersion, summary, messages, memories, playerCharacter` pero
  no carga entradas de lorebook; `prompt-context-builder.impl.ts` no tiene
  sección de lorebook. Un usuario que trae un personaje con lorebook de
  SillyTavern no puede usarlo, y tampoco puede importar un lorebook suelto.
- `creator_notes` no existe, así que tampoco existe la garantía explícita de que
  **nunca** llegue al prompt.

**Consecuencia observable:** un usuario con una librería de cards de SillyTavern
(JSON o PNG) y de lorebooks sueltos no puede importarlos, y el material de rol
(personalidad, escenario, ejemplos, lorebook) no se conserva ni se inyecta. Es
una barrera de adopción directa frente a la comunidad de SillyTavern.

### Restricciones

- **Arquitectura hexagonal.** El mapeo card→entidad, la activación de lorebook y
  el ensamblado viven en código sin I/O (`domain/`/`application/` puro o `shared`
  lib); el parseo de PNG/chunks vive en un **adaptador de infraestructura** (usa
  `node:zlib`); el caso de uso orquesta. Nada de Drizzle/Express en
  dominio/aplicación, salvo la excepción `error-handler` ya documentada.
- **`shared/` puro.** Los tipos de card/lorebook y los helpers puros (match de
  keys, presupuesto, lógica selectiva) no pueden importar `react`, `express`,
  `drizzle-orm`, `zod` (tipos sí, runtime no), `sharp` **ni `node:zlib`**.
  `pnpm check:arch` lo verifica. El parser/escritor PNG vive en backend (no en
  `shared/`): el bundle del frontend nunca importa `node:zlib`.
- **Sin red en runtime** para import/export: el parseo de PNG/tEXt es local; la
  imagen de placeholder se genera en memoria (nunca se descarga).
- **Sin dependencias pesadas.** PNG se parsea/escribe en casa reutilizando
  `zlib` de Node (`zlib.crc32`, `zlib.inflateSync`/`deflateSync`); no se añade
  `pngjs` ni similar. La decodificación/re-encode de la imagen de perfil reutiliza
  el pipeline de imágenes existente (`characterAssetImageProcessor`).
- **No cambiar el prompt para caracteres existentes.** Para una `CharacterVersion`
  sin `system_prompt`, `post_history_instructions`, `personality`, `scenario`,
  `mes_example` ni lorebook activo, el `systemPrompt` debe ser byte a byte
  idéntico al actual (snapshots S129 intactos). Los overrides/lorebook/campos
  nuevos son **aditivos y opcionales**.
- **Compatibilidad de datos.** El export interno sigue siendo
  `EXPORT_SCHEMA_VERSION = 1`; los campos nuevos son aditivos/opcionales para que
  los exports viejos sigan importando. El card de SillyTavern es un **formato
  distinto** del export interno.
- **500 líneas** por archivo en frontend; aislamiento de features (`components/
character/` no importa de otros features); archivos sin referencia muertos.
- **Privacidad/seguridad.** Límites de tamaño, sanitización de HTML, **sin regex
  de usuario** (matching literal), cap de recursión, cap de chunks PNG, sin
  secretos en el card exportado (no se exporta settings/providers), `creator_notes`
  nunca en prompt.
- **Legal.** Implementación clean-room desde specs públicas, no copiando código/
  prompts/UI/assets/tests de SillyTavern (AGPL-3.0). Solo nominativo
  «compatible con SillyTavern»; sin logos ni endoso implícito. Nota corta en el
  RFC y en `README`/docs de usuario.
- **Sin chats/JSONL ni CHARX** en este slice.

### Opciones consideradas

#### Modelo de datos (lorebook + campos de card)

| #     | Opción                                                                                                                     | Ventajas                                                                                                                                                                                                         | Costes                                                                                                                                                           | ¿Elegida? |
| ----- | -------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| **A** | Columnas nativas para los campos de card + **tablas normalizadas** `lorebooks`/`lorebook_entries` vinculadas al personaje. | Editable por entrada; activación limpia sin parsear JSON; FK/cascade; futuras features (probabilidad, grupos, efectos temporizados) se añaden como columnas; el lorebook vive fuera de la versión del personaje. | Migración + entidad + puerto + repo + use-cases; más superficie.                                                                                                 | **Sí**    |
| **B** | Una columna JSON (`lorebook_json` en una tabla `lorebooks`, o embebida en `character_versions`).                           | Migración mínima; round-trip trivial.                                                                                                                                                                            | La activación parsea JSON en cada envío; sin edición por entrada; difícil indexar/consultar; el lorebook queda atado a la versión si va en `character_versions`. | No        |
| **C** | JSON embebido en `character_versions` (espejo 1:1 del card de ST).                                                         | Round-trip perfecto del card.                                                                                                                                                                                    | Lorebook re-versionado en cada edición del personaje; sin ciclo de vida propio; contradice «link lorebook al personaje» y la edición independiente.              | No        |

**Descarte de B/C:** el requisito «link lorebook al personaje», «integrar como
fuente de contexto» y «editar/crear entradas» exige filas consultables y con
ciclo de vida propio; B/C aplazan ese coste al camino caliente de cada envío
(parsear JSON) y dificultan las features diferidas (probabilidad, grupos,
efectos temporizados).

#### Matching de activación del lorebook

| #     | Opción                                                                                | Ventajas                                                                      | Costes                                                                                       | ¿Elegida? |
| ----- | ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | --------- |
| **A** | Matching **literal** de substrings (case-insensitive por defecto, opción whole-word). | Sin ReDoS por construcción; determinista y testeable; cubre el subset pedido. | No soporta los `use_regex` de ST (se preservan, no se activan).                              | **Sí**    |
| **B** | Regex de usuario (`use_regex`) con una librería safe-regex.                           | Fidelidad con ST para cards que usan regex.                                   | Superficie de ReDoS/validación; nueva dependencia; comportamiento no portable entre motores. | No        |
| **C** | Regex de usuario sin validación.                                                      | Máxima fidelidad.                                                             | ReDoS trivial contra una entrada importada; inaceptable (guardrail de seguridad).            | No        |

#### Parseo/escritura de PNG

| #     | Opción                                                                                                                              | Ventajas                                                                                                             | Costes                                                                                                           | ¿Elegida? |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | --------- |
| **A** | Parser/escritor PNG **en casa** (chunks `IHDR`/`tEXt`/`IDAT`/`IEND`, CRC con `zlib.crc32`, inflate/deflate con `zlib`), en backend. | Sin dependencia nueva; control total de límites y errores; CRC/len validables; `node:zlib` queda fuera de `shared/`. | Hay que implementar el formato mínimo (firma, chunks, CRC, tEXt, IDAT).                                          | **Sí**    |
| **B** | Dependencia `pngjs`/`fast-png`.                                                                                                     | Menos código.                                                                                                        | Dependencia nueva (superficie de `pnpm audit`, bundle, build); los guardrails desaconsejan dependencias pesadas. | No        |
| **C** | Solo JSON (sin PNG).                                                                                                                | Cero código de imagen.                                                                                               | El alcance aprobado exige PNG (`chara`/`ccv3`); no cumple.                                                       | No        |

### Decisión

Se elige **A** en las tres tablas: campos nativos + lorebook normalizado, matching
literal sin regex, y parser PNG en casa sobre `zlib` (en backend). Resumen del
alcance:

1. **Import/export de cards.** Importar cards V1/V2/V3 desde JSON y PNG (tEXt
   `chara` para V2, `ccv3` para V3; **preferido `ccv3`** cuando ambos existen).
   Exportar V2/V3 en JSON y PNG escribiendo **ambos** chunks `chara` y `ccv3`.
   Preservar `extensions`, campos top-level y de `data` desconocidos.
2. **Campos nativos** en `CharacterVersion` (ver `Plan de migración`).
3. **Overrides de card** en el compilador S129 (ver `Contrato de colocación`).
4. **Lorebook** normalizado + subset de activación + **lógica selectiva**
   (ver `Semántica del lorebook`).
5. **Lorebooks standalone** (CCv3 standalone y ST nativo) con import/export
   propios y linkado a personaje (ver `Formas de lorebook`).
6. **UI** de import/export JSON+PNG (card y lorebook), panel de notas del creador,
   tags, saludos alternativos, chips de género/pronombres, tagline display-only,
   y modal `Crear` con pestañas Personaje / Lorebook.
7. **Seguridad** y **política legal** (secciones dedicadas).

### Plan de migración

**Migración `0019_character_cards.sql`** (idx 19, version 6 del journal; el tag
lo genera `db:generate` salvo que se nombre a mano, como `0016_context_window`).

1. **`character_versions` — 16 columnas nuevas (todas nullable, sin `DEFAULT`):**
   `personality`, `scenario`, `mes_example`, `alternate_greetings` (JSON array),
   `creator_notes`, `tags` (JSON array), `creator`, `card_character_version`
   (label de versión de la card de ST; el nombre evita chocar con nuestro
   `versionNumber` entero), `gender`, `pronouns`, `tagline`, `system_prompt`,
   `post_history_instructions`, `extensions` (JSON, verbatim: `extensions` del
   card), `unknown_fields` (JSON, verbatim: keys de `data` no mapeadas) y
   `unknown_root_fields` (JSON, verbatim: keys de la **raíz** del card no
   mapeadas — extras del envelope o keys planas de un V1). Los campos V3
   `assets`/`nickname`/`group_only_greetings` van en `unknown_fields` porque
   viven dentro de `data`.

2. **`lorebooks`** (nueva tabla):
   - `id` text PK
   - `character_id` text NOT NULL → `characters.id` `onDelete: "cascade"`
   - `name` text (opcional)
   - `description` text (opcional; `description` del `Lorebook` CCv3)
   - `scan_depth` integer NOT NULL default `4`
   - `token_budget` integer NOT NULL default `400`
   - `recursive_scanning` integer boolean NOT NULL default `0`
   - `extensions` text (JSON, el objeto `extensions` del libro, verbatim)
   - `unknown_fields` text (JSON, keys desconocidas a nivel de libro)
   - `created_at`/`updated_at` timestamp NOT NULL
   - **un lorebook por personaje**: índice `UNIQUE` `lorebooks_character_idx`
     sobre `character_id` (el API `GET /characters/:id/lorebook` es singular)

3. **`lorebook_entries`** (nueva tabla):
   - `id` text PK (nuestro)
   - `lorebook_id` text NOT NULL → `lorebooks.id` `onDelete: "cascade"`
   - `name` text (opcional; `name` de ST nativo)
   - `source_id` text (opcional; `id`/`uid` de ST nativo, numérico o string)
   - `keys` text NOT NULL (JSON array)
   - `secondary_keys` text NOT NULL (JSON array, default `[]`)
   - `comment` text (opcional)
   - `content` text NOT NULL
   - `constant` integer boolean NOT NULL default `0`
   - `selective` integer boolean NOT NULL default `0`
   - `selective_logic` integer NOT NULL default `0` (0..3)
   - `insertion_order` integer NOT NULL default `100`
   - `position` text NOT NULL default `"after_char"` (`before_char`|`after_char`)
   - `raw_position` text (opcional; el valor ST verbatim — numérico 0..6 o string —
     para re-emitir en export)
   - `priority` integer NOT NULL default `0`
   - `enabled` integer boolean NOT NULL default `1`
   - `case_sensitive` integer boolean NOT NULL default `0`
   - `whole_words` integer boolean NOT NULL default `0`
   - `order` integer NOT NULL (orden estable de presentación/creación)
   - `extensions` text (JSON, el objeto `extensions` de la entrada, verbatim)
   - `unknown_fields` text (JSON, keys ST no mapeadas o preservadas sin
     activar: `use_regex`/`useRegex`, `probability`, `group*`, timed effects,
     `vectorized`, `depth`, `role`, `scanDepth` per-entry,
     `excludeRecursion`, `preventRecursion`, etc.). Los decoradores no son una
     key: viven en `content` y se preservan ahí.
   - `created_at`/`updated_at` timestamp NOT NULL
   - índices `lorebook_entries_lorebook_idx` (`lorebook_id`, `order`)

4. **Backward compatibility.** Las filas existentes de `character_versions`
   quedan con las columnas nuevas en `NULL`; `toVersion`/DTO las exponen como
   `null`/`[]`/`undefined` y nada cambia en el prompt. Ningún personaje existente
   recibe lorebook (sin backfill). La migración es aditiva:
   `ALTER TABLE character_versions ADD COLUMN ...` y `CREATE TABLE` para
   lorebooks/entries.
   `scripts/package.mjs` copia la carpeta de migraciones completa, así que la
   nueva entra sin cambios en el empaquetado.

5. **Entidad de dominio.** `CharacterVersion` gana getters para los campos
   nuevos (default `null`/`[]`); `Lorebook` y `LorebookEntry` como entidades
   nuevas con factories `create`/`reconstruct` y `withX()` (inmutables).
   Invariantes: `content` es string (puede ser vacío; una entrada vacía se
   preserva pero **nunca se inyecta**); `keys`/`secondary_keys` arrays de strings;
   `position` dentro del enum; `selective_logic` en 0..3; `insertion_order`/
   `order`/`priority` enteros; `scan_depth` ≥ 0; `token_budget` ≥ 0.

6. **Puerto y repo.** `LorebookRepository` (findByCharacterId, upsertBook,
   createEntry, updateEntry, deleteEntry, reorderEntries) en `domain/ports/`;
   `DrizzleLorebookRepository` en `drizzle/repositories/`. El
   `CharacterRepository` se amplía para leer/escribir los campos nuevos de la
   versión en `createWithFirstVersion`/`saveVersion`/`findVersionById`/
   `findVersionsByCharacterId` (el mapeo `toVersion` ya centraliza la
   conversión).

7. **Copia en nueva versión.** Al editar un personaje (nueva `CharacterVersion`),
   los campos de card (`extensions`, `unknown_fields`, `unknown_root_fields`,
   `personality`, `scenario`, `mes_example`, `alternate_greetings`,
   `creator_notes`, `tags`, `creator`, `card_character_version`, `gender`,
   `pronouns`, `tagline`, `system_prompt`, `post_history_instructions`) se
   **copian** del previo salvo que el input los cambie explícitamente (igual que
   hoy hace `update-character` con `description`/`instructions`/`greeting`). El
   lorebook vive fuera de la versión y no se toca en la edición.

### Cards V1 y campos vacíos

**Detección V1:** el objeto raíz **no** tiene `spec`/`data`, **no** tiene
`entries`, y sí tiene al menos `name` y uno de `first_mes`/`description`/
`personality`/`scenario`/`mes_example` (shape plano de seis campos). Un V1
también puede venir embebido en un PNG `chara`; se decodifica igual.

**Mapeo V1 (import-only; no se exporta V1):**

| Campo V1 | Campo nuestro | Nota |
| --- | --- | --- |
| `name` | `Character.name` / `CharacterVersion.name` | requerido; vacío → `INVALID_CARD_NAME` |
| `description` | `CharacterVersion.description` | vacío → fallback neutro + warning |
| `personality` | `CharacterVersion.personality` | vacío → `null` |
| `scenario` | `CharacterVersion.scenario` | vacío → `null` |
| `first_mes` | `CharacterVersion.greeting` | ver política de vacíos |
| `mes_example` | `CharacterVersion.mesExample` | vacío → `null` |
| resto de keys raíz | `CharacterVersion.unknownRootFields` | verbatim; se re-emiten al exportar V2/V3 en la raíz |

Un V1 no trae `system_prompt`, `post_history_instructions`, tags, creator,
`character_book` ni `extensions`; esos campos quedan `null`/`[]`.

**Política de campos vacíos en import (V1/V2/V3):**

- `name` vacío/whitespace → **rechazo** `INVALID_CARD_NAME` (400). El nombre es
  invariante de entidad y no se inventa.
- `description` vacía → fallback localizado `DEFAULT_CARD_DESCRIPTION` (clave
  i18n `characters.cardFallbackDescription`) + warning `EMPTY_DESCRIPTION`; la entidad
  sigue exigiendo descripción no vacía.
- `first_mes` vacío → si `alternate_greetings[0]` existe, se usa como `greeting`
  y se **retira** de `alternate_greetings` (para no duplicar el saludo); si no,
  fallback localizado `DEFAULT_CARD_GREETING` (clave i18n
  `characters.cardFallbackGreeting`) + warning `EMPTY_GREETING`. El invariante de
  entidad no se relaja.
- `personality`, `scenario`, `mes_example`, `system_prompt`,
  `post_history_instructions` vacíos/whitespace → `null` y sin sección en el
  prompt.
- Un `greeting`/`description` que solo tenga whitespace se trata como vacío
  (`.trim() === ""`).

### Formas de lorebook (embebido y standalone)

Se reconocen **tres formas** de entrada, con detección por forma y mapeo a la
misma tabla normalizada:

1. **Embebido CCv3 `data.character_book`.** `{ spec:"chara_card_v3", data:
{ ..., character_book: { entries: [...], name?, description?,
recursive_scanning?, scan_depth?, token_budget?, extensions? } } }`. El libro
   viaja dentro del card y, al importar el card, se crea el `Lorebook` vinculado
   al personaje.

2. **Standalone CCv3.** Archivo raíz `{ spec:"lorebook_v3", data: {
entries: [...], ... } }` (mismo shape del `character_book`, sin card). Se
   importa con los endpoints de lorebook standalone y se **vincula a un personaje**
   (existente o en creación).

3. **ST nativo standalone `{entries: ...}`.** Archivo raíz sin `spec`/`data`:
   `{ entries: { <uid>: { ... }, ... } }` (objeto keyed-by-uid, export histórico
   de ST) **o** `{ entries: [ { ... }, ... ] }` (array). Las entradas usan campos
   ST nativos (`key`, `keysecondary`, `comment`, `content`, `constant`,
   `selective`, `selectiveLogic`, `order`, `position` numérico, `disable`,
   `caseSensitive`, `matchWholeWords`, `scanDepth`, `excludeRecursion`,
   `preventRecursion`, `useRegex`, `priority`, `name`, `id`/`uid`, …). Se detecta
   la forma (objeto con `uid` keys vs array) y se mapea; `uid`→`source_id`.

**Detección de forma** (orden): si el raíz tiene `spec`/`data` y `spec` es
`chara_card_v2|v3` → card (lorebook embebido en `data.character_book`); si el
raíz tiene `spec`/`data` y `spec === "lorebook_v3"` → standalone CCv3; si el
raíz tiene `entries` (objeto o array) sin `spec` → ST nativo standalone.

**Export de lorebook** (desde el lorebook de un personaje) produce exactamente:

- `format: "ccv3"` → `{ spec:"lorebook_v3", data: { entries: [...], name?,
  description?, recursive_scanning?, scan_depth?, token_budget?, extensions? } }`.
  La spec standalone **no define `spec_version`**; no se emite. Si un import lo
  trae, se acepta y se conserva como campo desconocido de la raíz.
- `format: "st-native"` → `{ entries: { "<source_id|id>": { key, keysecondary,
  comment, content, constant, selective, selectiveLogic, order, position
  (numérico), disable, caseSensitive, matchWholeWords, ... }, ... } }` (objeto
  keyed-by-uid, forma histórica de ST). Si no hay `source_id`, se usa el `id`.

Ambos re-emiten los campos `unknown_fields`/`extensions` de libro y entrada en su
sitio (top-level o `extensions`, según corresponda). El card exportado sigue
llevando el `character_book` embebido (además de poder exportar el lorebook solo)
y usa el **lorebook actual del personaje**, no el de una versión histórica:
el lorebook es de carácter, no de versión.

### Plan de export interno

- **`EXPORT_SCHEMA_VERSION` sigue en 1.** Los campos nuevos viajan **dentro** del
  `CharacterVersionDTO` existente (secciones `definition`/`versions`) como
  propiedades opcionales (`personality?`, `scenario?`, …). Un export viejo sin
  esas claves importa con `null`/`[]` (sin cambio); un export nuevo se lee en
  versiones antiguas ignorando las claves (JSON extra). No hay bump porque no
  hay cambio de forma obligatorio.
- **Lorebook en el export interno — sección nueva.** Se añade `"lorebook"` a
  `ExportSection` con `EXPORT_SECTION_PARENTS["lorebook"] = "definition"` (una
  sección hija de `definition`). `CharacterExport` gana `lorebook?: LorebookDTO`
  (top-level, aditivo). `export-character` lo incluye cuando `definition` está
  seleccionada; el diálogo de export añade `lorebook` a `ALL_EXPORT_SECTIONS` y
  a la selección por defecto, marcado junto a `definition`. `import-character`
  crea el lorebook si `payload.lorebook` está presente. **Decisión firme:**
  sección dedicada (no embebida en `definition`), porque el lorebook es de
  carácter, no de versión.
- **Backward compatibility.** Un export viejo no tiene `lorebook` ni la sección
  `"lorebook"` → importa sin lorebook (sin error). Un import de un payload nuevo
  cuyo `lorebook` apunte a una sección ausente (p. ej. `definition` no
  seleccionada) se trata como «sin lorebook» (no se crea). Un lector antiguo
  ignora la clave `lorebook` extra.
- **Card de SillyTavern ≠ export interno.** El card (`spec: chara_card_v2|v3`)
  es un formato de intercambio **distinto** del `character-export` interno. Se
  implementan convertidores puros (no en el use-case de export interno):
  `characterVersion → card data` y `card data → CharacterVersion`. Un personaje
  existente se exporta a card mediante un endpoint dedicado (ver `Superficie de
API`), mapeando los campos nativos a los de ST.
- **Round-trip de campos desconocidos.** `extensions`, `unknown_fields` y
  `unknown_root_fields` viajan en el export interno (JSON verbatim) **y** en el
  card de ST (se re-emiten tal cual), de modo que importar→exportar no pierde
  datos que no entendemos.

### Contrato PNG

- **Firma:** 8 bytes `89 50 4E 47 0D 0A 1A 0A`.
- **Chunks usados:** `IHDR` (obligatorio), `tEXt` (keywords `chara` y `ccv3`),
  `IDAT` (imagen; si hay varios, **se concatenan en orden antes de inflate**,
  per spec PNG), `IEND`. Los chunks auxiliares no reconocidos (`tEXt`/`iTXt`/
  `zTXt` ajenos, `pHYs`/`sRGB`/etc.) se ignoran al leer y se descartan al
  re-escribir. Un chunk **crítico** desconocido (bit ancillario a 0) → rechazo
  `INVALID_CARD_PNG`.
- **APNG:** los chunks `acTL`/`fcTL`/`fdAT` se ignoran; se lee solo la imagen
  base (`IDAT`, primer frame). La exportación siempre escribe PNG estático (sin
  animación).
- **`tEXt`:** keyword Latin-1 (ISO-8859-1), 1–79 bytes, terminada en `\0`; los
  keywords `chara`/`ccv3` son ASCII. El payload es **base64 estándar** de UTF-8
  JSON (alfabeto `A–Z a–z 0–9 + /`, padding `=` correcto, longitud múltiplo de 4
  tras quitar padding; cualquier otra cosa → rechazo). `chara` = V2, `ccv3` = V3.
- **Contenido por formato de export:**
  - Export **V2**: `chara` lleva el objeto V2; `ccv3` lleva el objeto V3
    (proyección V2→V3).
  - Export **V3**: `ccv3` lleva el objeto V3; `chara` lleva la **proyección V2**
    (un V2 válido para lectores antiguos).
  - Al leer, si ambos existen **gana `ccv3`** (V3) y `chara` queda como fallback.
- **Proyección V2 de campos V3-only** (para que un lector V2 reciba un card
  válido): se **omiten** los campos V3 de `data` sin equivalente V2 — `assets`,
  `nickname`, `group_only_greetings`, `creator_notes_multilingual`, `source`,
  fechas de creación/modificación, y los campos V3-only del lorebook
  (`probability`, `group`/`group_override`/`group_weight`, decoradores,
  `vectorized`, `use_regex`, timed effects). Los `extensions` se conservan
  verbatim; el `character_book` V2 lleva solo el subset V2 de entradas. La
  pérdida es inherente al formato V2 (se documenta; el V3 conserva todo).
- **Duplicados:** múltiples chunks `tEXt` con el mismo keyword → **gana el
  último** (en orden de archivo), sin error (comportamiento firme, testeado).
- **Validación:** longitud declarada vs bytes disponibles por chunk; CRC de cada
  chunk con `zlib.crc32`; bytes totales ≤ `MAX_CARD_PNG_BYTES`; nº de chunks ≤
  `MAX_PNG_CHUNKS`; tamaño de cada chunk `tEXt` ≤ `MAX_TEXT_CHUNK_BYTES`; JSON
  decodificado (bytes) ≤ `MAX_DECODED_CARD_JSON_BYTES`; IDAT descomprimido ≤
  `MAX_IDAT_DECOMPRESSED_BYTES` (bomba de compresión). CRC incorrecto, longitud
  inconsistente, `IHDR`/`IEND` ausentes → `INVALID_CARD_PNG` (400). Sin red.
- **Imagen embebida (import):** el `IDAT` (concatenado) se decodifica con el
  pipeline de imagen existente y se guarda como asset de perfil. Si no hay
  imagen o falla la decodificación, se importa sin imagen (no bloquea).
- **Imagen en export:** si el personaje tiene imagen de perfil, se re-encode a
  PNG y se embebe en `IDAT`; si **no**, se emite un PNG placeholder **generado
  en memoria** (sin red): 1×1 (o neutro) RGBA con los chunks `chara`/`ccv3`.
- **Constantes** (coherentes entre sí; `MAX_TEXT_CHUNK_BYTES ≥
ceil(MAX_DECODED_CARD_JSON_BYTES × 4 / 3)`):
  `MAX_CARD_JSON_BYTES = 5 MiB`, `MAX_CARD_PNG_BYTES = 10 MiB`,
  `MAX_PNG_CHUNKS = 512`, `MAX_TEXT_CHUNK_BYTES = 8 MiB`,
  `MAX_DECODED_CARD_JSON_BYTES = 5 MiB`, `MAX_IDAT_DECOMPRESSED_BYTES = 50 MiB`.
- **Ubicación:** el parser/escritor PNG vive en
  `infrastructure/adapters/secondary/` (backend), porque usa `node:zlib`. En
  `shared/` solo van tipos puros y helpers de match/activación.

### Tabla de mapeo de campos (card)

**Envelopes JSON de export:** V2 `{ spec:"chara_card_v2",
spec_version:"2.0", data:{...} }`; V3 `{ spec:"chara_card_v3",
spec_version:"3.0", data:{...} }`; lorebook standalone `{ spec:"lorebook_v3",
data:{...} }` (sin `spec_version`). El import detecta el envelope y no rechaza
un `spec_version` futuro si el `spec` es conocido.

Columna «Prompt» indica si/usar el campo en el ensamblado; «Export card» indica
a qué clave de `data` de ST se mapea al exportar (y si es verbatim).

| Campo ST (V2/V3 `data`)                                                      | Campo entidad/DTO                                       | Prompt                                                      | Export card                                      |
| ---------------------------------------------------------------------------- | ------------------------------------------------------- | ----------------------------------------------------------- | ------------------------------------------------ |
| `name`                                                                       | `CharacterVersion.name` / `Character.name`              | `character` (intro/name)                                    | `name`                                           |
| `description`                                                                | `CharacterVersion.description`                          | `character` (intro)                                         | `description`                                    |
| `personality`                                                                | `CharacterVersion.personality` (nuevo)                  | `character` (tras label personality)                        | `personality`                                    |
| `scenario`                                                                   | `CharacterVersion.scenario` (nuevo)                     | `character` (línea scenario)                                | `scenario`                                       |
| `first_mes`                                                                  | `CharacterVersion.greeting`                             | `style` (ejemplo de saludo)                                 | `first_mes`                                      |
| `mes_example`                                                                | `CharacterVersion.mesExample` (nuevo)                   | `style` (ejemplo, opcional)                                 | `mes_example`                                    |
| `system_prompt`                                                              | `CharacterVersion.systemPrompt` (nuevo)                 | Override del bloque de persona (dentro de `character`; conserva scaffolding) | `system_prompt`                                  |
| `post_history_instructions`                                                  | `CharacterVersion.postHistoryInstructions` (nuevo)      | Override de card (final)                                    | `post_history_instructions`                      |
| `alternate_greetings`                                                        | `CharacterVersion.alternateGreetings` (JSON array)      | No (display-only)                                           | `alternate_greetings`                            |
| `creator_notes`                                                              | `CharacterVersion.creatorNotes` (nuevo)                 | **Nunca**                                                   | `creator_notes`                                  |
| `tags`                                                                       | `CharacterVersion.tags` (JSON array)                    | No (display-only)                                           | `tags`                                           |
| `creator`                                                                    | `CharacterVersion.creator` (nuevo)                      | No (display-only)                                           | `creator`                                        |
| `character_version`                                                          | `CharacterVersion.cardCharacterVersion` (nuevo, string) | No (display-only)                                           | `character_version`                              |
| `gender`                                                                     | `CharacterVersion.gender` (nuevo)                       | No (display-only en S132)                                   | `gender`                                         |
| `pronouns`                                                                   | `CharacterVersion.pronouns` (nuevo)                     | No (display-only en S132)                                   | `pronouns`                                       |
| `tagline` (nuestro)                                                          | `CharacterVersion.tagline` (nuevo)                      | No (display-only)                                           | `extensions.rm.tagline` (merge, no sobrescribir) |
| `extensions`                                                                 | `CharacterVersion.extensions` (JSON verbatim)           | No                                                          | `extensions` (verbatim)                          |
| `character_book`                                                             | `Lorebook` + `LorebookEntry` (vinculado al personaje)   | Entradas activadas (`lorebook.*`)                           | `character_book`                                 |
| keys `data` no mapeadas (incl. V3 `assets`, `nickname`, `group_only_greetings`, `creator_notes_multilingual`, `source`, fechas) | `CharacterVersion.unknownFields` (JSON verbatim)        | No                                                          | top-level de `data` (verbatim)                   |
| keys **raíz** no mapeadas (extras del envelope o V1 plano)                  | `CharacterVersion.unknownRootFields` (JSON verbatim)    | No                                                          | raíz del card (verbatim)                         |

**Mapeo de entradas/lorebook ST → columnas** (con aliases ST nativos):

| Campo ST                                                                                                                                                                    | Columna                                              | Activo/Preservado                     |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- | ------------------------------------- |
| `keys` / `key`                                                                                                                                                              | `keys`                                               | Activo (match literal)                |
| `secondary_keys` / `keysecondary`                                                                                                                                           | `secondary_keys`                                     | Activo (solo si `selective`)          |
| `content`                                                                                                                                                                   | `content`                                            | Activo                                |
| `comment`                                                                                                                                                                   | `comment`                                            | Preservado                            |
| `constant`                                                                                                                                                                  | `constant`                                           | Activo                                |
| `selective`                                                                                                                                                                 | `selective`                                          | Activo                                |
| `selectiveLogic` / `selective_logic`                                                                                                                                        | `selective_logic` (0..3)                             | Activo                                |
| `order` (ST nativo) / `insertion_order` (CCv3)                                                                                                                              | `insertion_order`                                    | Activo                                |
| `position` (numérico 0..6 o `before_char`/`after_char`/`@D`)                                                                                                                | `position` (normalizado) + `raw_position` (verbatim) | Activo + preservado                   |
| `disable`                                                                                                                                                                   | `enabled` (invertido)                                | Activo                                |
| `caseSensitive` / `case_sensitive`                                                                                                                                          | `case_sensitive`                                     | Activo                                |
| `matchWholeWords` (ST nativo)                                                                                                                                               | `whole_words`                                        | Activo                                |
| `priority`                                                                                                                                                                  | `priority`                                           | Activo (trim de presupuesto)          |
| `name`                                                                                                                                                                      | `name`                                               | Preservado (display)                  |
| `id` / `uid` (numérico o string)                                                                                                                                            | `source_id`                                          | Preservado (round-trip)               |
| `scan_depth` (CCv3, libro)                                                                                                                                                  | `lorebooks.scan_depth`                               | Activo (nivel libro)                  |
| `scanDepth` (ST nativo, por entrada)                                                                                                                                        | `unknown_fields`                                     | **Preservado, no activado** (warning) |
| `extensions`                                                                                                                                                                | `extensions` (libro/entrada, verbatim)               | Preservado                            |
| resto (`use_regex`/`useRegex`, `probability`, `group*`, decoradores, timed effects, `vectorized`, `depth`, `role`, `excludeRecursion`, `preventRecursion`, `automation_id`) | `unknown_fields`                                     | **Preservado, no activado**           |

### Contrato de colocación del prompt

Orden numerado de las secciones del `systemPrompt` final (compilador S129 +
builder). La sección `card-overrides.post-history`, las secciones `lorebook.*`
y los contenidos `personality`/`scenario`/`mes_example`/`system_prompt` son
nuevos; el resto queda byte a byte como hoy cuando no hay datos nuevos.

0. `lorebook.before` — entradas activadas con `position = "before_char"` (solo si las hay).
1. `character` — composición interna, en este orden:
   1. `prompt.intro` (name + description).
   2. **Bloque de persona** (mutuamente excluyente):
      - si `system_prompt` no vacío: label + `system_prompt` (override
        autoritativo de la persona);
      - si vacío/whitespace: `prompt.roleplay` + `prompt.roleplayFiction` +
        `prompt.roleplayStayInCharacter` + `prompt.roleplayMature` (como hoy).
   3. **Scaffolding no negociable (siempre):** `prompt.roleplayUserAgency`,
      `prompt.roleplayLanguage`, `prompt.roleplayLength`. No lo sustituye el
      card.
   4. label `prompt.personality` + **`personality`** (si no vacío).
   5. `prompt.name` + `subtitle` (si no vacío).
   6. línea **`scenario`** (si no vacío, etiquetada).
   7. `instructions` nativo (si no vacío; **se mantiene**).
2. `cards` — tarjetas de conocimiento activas (sin cambios).
3. `lorebook.after` — entradas activadas con `position = "after_char"` (default; solo si las hay) — **tras `cards` y antes de `player`**.
4. `player` — personaje del jugador (sin cambios).
5. `memories` — memorias elegibles (sin cambios).
6. `summary` — último resumen (sin cambios).
7. `proposals` — formato de propuestas de memoria (sin cambios).
8. `style` — estilo + ejemplo de saludo (`greeting`) + **`mes_example`** (si no vacío, tras el saludo de ejemplo).
9. `format` — reglas de formato de respuesta (sin cambios).
10. `ooc` — solo si `filterOocFromHistory` (sin cambios).
11. `card-overrides.post-history` — **solo si `post_history_instructions` no vacío**, al final absoluto.

**Reglas de interacción:**

- `system_prompt` y `post_history_instructions` son **overrides de
  compatibilidad**, no un port del prompt de ST. `system_prompt` sustituye
  **solo** al bloque de persona (`prompt.roleplay`, `prompt.roleplayFiction`,
  `prompt.roleplayStayInCharacter`, `prompt.roleplayMature`) dentro de
  `character`; **no** quita el scaffolding de agencia del usuario, idioma y
  longitud (`prompt.roleplayUserAgency`, `prompt.roleplayLanguage`,
  `prompt.roleplayLength`), ni el `instructions` nativo, la seguridad, el
  formato o las tools. `post_history_instructions` se inyecta como sección
  etiquetada al final. No reproducen el prompt por defecto de ST.
- **D1 resuelta — `system_prompt` vs `instructions` nativo:** se mantiene el
  `instructions` nativo; `system_prompt` solo reemplaza el bloque de persona.
  Si `system_prompt` está vacío/whitespace, se emite el bloque de persona como
  hoy; si no, se emite `system_prompt` en su lugar (etiquetado como
  instrucciones autoritativas de la persona).
- **Vacío/whitespace = sección/línea ausente** (se usa `.trim() === ""`) → la
  salida es idéntica a la actual (paridad S129). Aplica a `personality`,
  `scenario`, `mes_example`, `instructions`, `system_prompt`,
  `post_history_instructions`.
- **`post_history_instructions`** se emula al **final del system prompt** (la
  app no tiene slot de mensaje post-historia); la alternativa de un mensaje
  `system` tras el historial se descarta para no tocar el contrato del array de
  mensajes ni los adapters de proveedor (deferred).
- **`creator_notes` nunca aparece** en ninguna sección (test de fuga = 0).
- **Macros (decisión M1, ver gate):** se propone expandir `{{char}}` y
  `{{user}}` al construir el prompt (no al guardar): `{{char}}` →
  `CharacterVersion.name`, `{{user}}` → `playerCharacter.name` (fallback: label
  localizado «User»). Se expanden solo en los campos nuevos `system_prompt`,
  `post_history_instructions` y `mes_example`; `description`, `instructions` y
  `greeting` conservan el macro crudo para no alterar la paridad S129. El valor
  guardado conserva el macro crudo (round-trip limpio). Otros `{{macro}}` se
  conservan verbatim. Si M1 no se aprueba, no se expande nada y se documenta la
  limitación.
- **`mes_example`:** se inyecta verbatim (tras la expansión M1, si se aprueba);
  no se interpretan separadores `<START>` ni se convierten a mensajes en S132.
- **Cap por campo inyectado.** Cada campo de prompt (`description`, `personality`,
  `scenario`, `mes_example`, `instructions`, `system_prompt`,
  `post_history_instructions`) tiene `MAX_PROMPT_FIELD_CHARS = 20_000`. En la
  **importación de cards**, un campo que lo supere se **rechaza** con error claro
  `INVALID_CARD_FIELD_TOO_LARGE` (nombrando el campo) — sin truncado silencioso.
  Una edición de un personaje existente **no** rechaza valores ya guardados por
  encima del cap (backward compatibility); la UI solo aplica `maxLength` a los
  campos nuevos que se tecleen. La compactación **no** encoge el system prompt,
  así que el cap vive en el borde de import, no en el de envío.
- **Presupuesto:** todo el contenido inyectado (incluido `system_prompt` dentro
  de `character`) cuenta en `estimatedInputTokens` del manifiesto; las secciones
  nuevas `lorebook.*` y `card-overrides.post-history` llevan su propio
  `estimateTextTokens`. No se truncan per-se en S132.
- **Paridad send/preview:** `get-prompt-context` y `send-message` comparten
  `ConversationContextLoader` + `ContextCompiler` + builder; el lorebook y los
  overrides se resuelven en el loader y entran por el mismo camino, así que
  preview y envío producen el mismo `systemPrompt` para la misma entrada.

### Semántica del lorebook

**Carga:** `ConversationContextLoader` resuelve además `lorebook` + `entries`
por personaje (el lorebook se vincula al `character_id` de la versión fijada a la
conversación) y las expone en `ConversationContextLoadResult`.

**Match de keys (literal, sin regex):** `P` = al menos una key primaria matchea
(OR); `m` = nº de `secondary_keys` que matchean (0..n). Match = substring literal
(whole-word opcional) con `case_sensitive` opcional.

**Activación de una entrada (condiciones en orden):**

1. `content` vacío/whitespace → **nunca se inyecta** (independiente del resto).
2. `enabled = false` → excluida.
3. `use_regex = true` (preservado en `unknown_fields`) → **no auto-activa** en
   S132: sus keys son regex y no las parseamos; la spec además dice que
   `constant` se ignora cuando `use_regex` es true. Se advierte en import y la
   entrada queda preservada para export. (No hay ruta de regex de usuario.)
4. `constant = true` → se inyecta siempre (ignora keys, secondary y selective).
5. `selective = false` → activa si `P` (**`secondary_keys` ignoradas**).
6. `selective = true`:
   - `secondary_keys` vacío → activa si `P` (sin filtro secundario).
   - `secondary_keys` no vacío → activa si `P` **y** se cumple la `selective_logic`.

**Tabla de verdad de `selective_logic`** (requiere `P`):

| `selective_logic` | Nombre            | Activa (con `P`)                                 |
| ----------------- | ----------------- | ------------------------------------------------ |
| 0                 | AND ANY (default) | `m ≥ 1` (alguna secundaria matchea)              |
| 1                 | NOT ALL           | `m < n` (al menos una secundaria **no** matchea) |
| 2                 | NOT ANY           | `m == 0` (ninguna secundaria matchea)            |
| 3                 | AND ALL           | `m == n` (todas las secundarias matchean)        |

(Caso degenerado `n=1`: NOT ALL y NOT ANY coinciden; se documenta.)

**Orden e inyección:**

- **Orden de inyección** (posición dentro del prompt): entradas activadas
  ordenadas por `insertion_order` asc, desempate por `order` (estable).
- **Posición:** `position = "before_char"` → `lorebook.before`;
  `position = "after_char"` → `lorebook.after`. El `raw_position` numérico
  (0..6 de ST nativo) se mapea: `0`→before, `1`→after, `2`/`3` (author note top/
  bottom)→after (warning), `4` (at depth)→after (warning), `5` (example top)→
  before, `6` (example bottom)→after. El valor original se **conserva** en
  `raw_position` para re-emitir en export.

**Presupuesto (`token_budget`, nivel libro):**

- Se cuenta con `estimateTextTokens` (mismo estimador del manifiesto S129).
- **Trim:** si el total activado supera el presupuesto, se descartan primero las
  de **menor `priority`**, desempate `insertion_order` asc; luego se recortan en
  ese orden hasta caber. Las descartadas se cuentan en el manifiesto
  (`lorebook.overBudget`). `priority` es **nativa y activa** (no solo
  preservada). `0` = sin presupuesto.
- La **inclusión** (qué sobrevive) usa `priority` desc → `insertion_order` asc;
  el **orden final de inyección** sigue siendo `insertion_order` asc → `order`
  asc. Ambas se documentan y se testean.

**Scan depth y recursión:**

- `scan_depth` (libro, CCv3): nº de mensajes más recientes (user+assistant) de
  la ventana a escanear para keys; `0` desactiva el escaneo por keys (solo
  sobreviven las entradas `constant`); se clampa a la ventana disponible.
  `scanDepth` per-entry (ST nativo) se **preserva sin activar** (warning): solo
  opera el nivel de libro en S132.
- `recursive_scanning` (libro): tras inyectar, re-escanear **solo el contenido
  de las entradas recién inyectadas** para activar otras entradas, sin duplicar
  contenido ya inyectado y sin reactivar entradas descartadas por presupuesto,
  hasta `MAX_LOREBOOK_RECURSION_DEPTH = 3` (constante;
  `excludeRecursion`/`preventRecursion` se preservan, no se activan).
- Texto de escaneo: concatenación del contenido de los últimos `scan_depth`
  mensajes (incluido el pendiente), sin regex.

**Decoradores en `content`:** las líneas que empiezan por `@@`/`@@@` se eliminan
de la **copia que se inyecta** (y se recortan los newlines sobrantes), pero el
`content` guardado y exportado las conserva **verbatim**. No se interpreta ningún
decorador en S132 (ni `@@position`, ni `@@depth`, ni `@@activate_*`). Test:
`@@depth 4\n...` no aparece en el prompt y sí en el export.

**Preservado pero NO activado:** timed effects (`cooldown`, `delay`, `sticky`,
`delay_until_recursion`), `probability`, `group`/`group_override`/`group_weight`,
decoradores (dentro de `content`, ver arriba), `vectorized`, `use_regex`,
`depth`/`role`/`automation_id`, `scanDepth` per-entry,
`excludeRecursion`/`preventRecursion`, y cualquier campo desconocido →
`unknown_fields` (JSON) de la entrada o del libro, re-emitidos en export.

### Superficie de API

Endpoints nuevos (cableados en `app-container.ts`; Zod + límites). **Orden de
montaje:** las rutas de card/lorebook se registran **antes** de las rutas
`/characters/:id` para evitar que `cards`/`lorebook` colisionen con `:id`.

**Import/export de card:**

- `POST /api/characters/cards/preview` — body `{ format: "json"|"png", payload:
string }` (`payload` = texto JSON, o base64 del PNG). Devuelve
  `SillyTavernCardPreview` (campos mapeados, tags, creator, nº de entradas de
  lorebook, warnings: «regex ignorado», «timed effects preservados sin activar»,
  «imagen ausente», «V1», «first_mes vacío → fallback»). **No persiste.**
- `POST /api/characters/cards/import` — body `{ format: "json"|"png", payload:
string }` (**payload crudo, re-parseado en el backend**; el preview es solo de
  visualización y no se reenvía). Crea `Character` + `CharacterVersion` +
  `Lorebook` y devuelve `CharacterSummary`. `INVALID_CARD_*` en 400/413.
- `POST /api/characters/:id/cards/export` — body `{ format: "json"|"png", spec:
"v2"|"v3" }`. Devuelve JSON (`application/json`) o PNG (`image/png`).

**Lorebook standalone:**

- `POST /api/lorebooks/preview` — body `{ format: "json", payload: string }`
  (CCv3 standalone o ST nativo). Devuelve `LorebookPreview` (forma detectada, nº
  de entradas, warnings). **No persiste.**
- `POST /api/characters/:id/lorebook/import` — body `{ format: "json", payload:
string, replace?: boolean }`. Importa un lorebook standalone (CCv3 o ST nativo)
  y lo vincula al personaje. Si ya existe un lorebook y `replace !== true` →
  `409 LOREBOOK_ALREADY_EXISTS`; con `replace: true` se reemplazan ajustes y
  entradas (borrado + alta en una transacción). Devuelve `LorebookDTO`.
- **Crear personaje con lorebook:** `POST /api/characters` (y
  `CreateCharacterInput`) acepta `lorebook?: { format: "ccv3"|"st-native",
  payload: string }`; el use case `CreateCharacter` crea personaje, versión y
  lorebook en la misma transacción. Así la pestaña Lorebook del modal `Crear`
  funciona antes de que exista el personaje.
- `POST /api/characters/:id/lorebook/export` — body `{ format: "ccv3"|
"st-native" }`. Devuelve el lorebook standalone (ver `Formas de lorebook`).

**Lorebook CRUD/link:**

- `GET /api/characters/:id/lorebook` → `LorebookDTO` (con entradas). **Si el
  personaje no tiene lorebook → `404` (`LOREBOOK_NOT_FOUND`)**; la UI lo trata
  como «crear nuevo».
- `PUT /api/characters/:id/lorebook` → upsert de ajustes del libro (`name`,
  `description`, `scanDepth`, `tokenBudget`, `recursiveScanning`).
- `POST /api/characters/:id/lorebook/entries` → crea entrada.
- `PUT /api/characters/:id/lorebook/entries/:entryId` → edita entrada.
- `DELETE /api/characters/:id/lorebook/entries/:entryId` → elimina.
- `PUT /api/characters/:id/lorebook/entries` → reordena (array de ids).

**Límites de body:** las rutas de card y lorebook se montan **antes** del
`express.json` global de 1 MB, con `express.json({ limit: "15mb" })` (el PNG
viaja como base64 dentro del JSON; 10 MiB de PNG ≈ 13,4 MB de base64 + envelope).
No se usa `express.raw`: el contrato de estas rutas es siempre JSON
`{ format, payload }`. La ruta existente `/characters/imports` conserva su
`limit: "25mb"`.

DTOs nuevos en `shared/src/types`: `LorebookDTO`, `LorebookEntryDTO`
(ambos con `extensions` y `unknownFields` para el round-trip interno),
`CreateLorebookEntryInput`, `UpdateLorebookEntryInput`,
`SillyTavernCardPreview`, `SillyTavernCardExportInput`, `LorebookPreview`.
Zod: strings acotados, arrays de strings, enums (`position`, `spec`, `format`,
`selectiveLogic` 0..3), enteros con `min/max` (`scanDepth` 0..64,
`tokenBudget` 0..100000, `insertionOrder` 0..10000, `priority` −10000..10000), y
límite de entradas por import (`MAX_LOREBOOK_ENTRIES = 1000`).

### Flujo de UI

- **Import de card (dialog).** Acepta `.json` y `.png` (extensión + magic bytes
  `89 50 4E 47`). Llama `preview` → muestra nombre, tags, creator, nº de
  entradas de lorebook y warnings; botón «Importar» reenvía el **payload crudo**
  a `import`.
- **Export de card (dialog).** Selector `JSON`/`PNG` y `V2`/`V3` (default V3 con
  chunk `chara` V2 en PNG); descarga con nombre slug.
- **Lorebook standalone (puntos de entrada).** (a) Menú contextual/barra del
  listado de personajes: «Importar lorebook» → elegir personaje destino; (b)
  panel de lorebook del personaje: «Importar»/«Exportar» (CCv3/ST nativo).
- **Formulario de personaje.** Nuevas pestañas/campos: `personality`, `scenario`,
  `mes_example`, `alternate_greetings`, `creator_notes` (panel con aviso explícito
  «nunca se envía al modelo»), `tags`, `creator`, `character_version`
  (display-only), `gender`/`pronouns` (chips) y `tagline` (display-only).
  `tagline` se muestra en la card del listado y en el detalle, nunca se edita
  como prompt; `tags` se muestran como chips de solo lectura en la card.
- **Modal `Crear`.** El botón «Crear» del listado abre un **modal** con pestañas
  `Personaje` / `Lorebook` (es lo que pide el alcance). La pestaña Lorebook
  permite crear/editar entradas **o** importar un lorebook standalone («Importar
  lorebook»); al guardar, el payload parseado viaja en `CreateCharacterInput.lorebook`
  y el backend crea personaje + versión + lorebook en una transacción.
  `/characters/new` **se mantiene** como ruta de deep-link que abre el mismo
  formulario (no se rompen enlaces existentes); no es la única entrada.
- **Ficheros (500 líneas, aislamiento):** todo bajo `components/character/` para
  no violar el aislamiento de features (el lorebook es conocimiento del
  personaje): `creator-notes-panel.tsx`, `tags-input.tsx`,
  `alternate-greetings-input.tsx`, `gender-pronouns-chips.tsx`,
  `sillytavern-import-dialog.tsx`, `sillytavern-export-dialog.tsx`,
  `lorebook-editor.tsx`, `lorebook-entry-form.tsx`,
  `lorebook-import-dialog.tsx`, `lorebook-export-dialog.tsx`, `use-lorebook.ts`,
  `use-sillytavern-card.ts`. `character-form.tsx` delega; nada supera 500 líneas.
- **i18n (ES/EN):** claves `characters.lorebook.*`, `characters.sillytavern.*`,
  `characters.creatorNotes*`, `characters.tags*`, `characters.alternateGreetings*`,
  `characters.gender*`, `characters.pronouns*`, `characters.tagline*`. Neutral
  (tuteo), términos técnicos en inglés (card, lorebook, token, prompt).
- **Accesibilidad/estados vacíos:** labels + `aria-*` en chips y entradas; estados
  vacíos («Sin entradas de lorebook», «Sin tags», «Sin saludos alternativos»);
  foco en el primer campo tras abrir el modal; contadores de caracteres.

### Tabla de seguridad

| Amenaza                                                             | Control                                                                                        | Test                                                           |
| ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| JSON/PNG sobredimensionado                                          | Caps de bytes/tamaño por chunk/nº chunks/JSON decodificado → 413/400                           | Fixture grande → rechazo con código correcto.                  |
| PNG malformado (CRC, longitud, truncado, chunk crítico desconocido) | `zlib.crc32`, validación de longitud y firma, rechazo de críticos desconocidos                 | Fixtures corruptos → `INVALID_CARD_PNG`.                       |
| Bomba base64/compresión (IDAT)                                      | Cap de tamaño descomprimido de IDAT                                                            | Fixture inflado → rechazo.                                     |
| HTML/script en textos importados                                    | Todos los campos de card se renderizan como texto plano (React escapa); no se usa `dangerouslySetInnerHTML` ni se interpreta Markdown/HTML en S132. Si se añade renderizado rico, sanitizar con allowlist. | `creator_notes`/tags/personality se muestran como texto plano. |
| ReDoS por regex de usuario                                          | **Sin regex**: matching literal (case + whole-word)                                            | Test de que no hay ruta regex; entrada `use_regex` se ignora.  |
| Bomba de recursión del lorebook                                     | Cap `MAX_LOREBOOK_RECURSION_DEPTH = 3` + `token_budget`                                        | Fixture recursivo → parada y presupuesto respetado.            |
| Decoradores `@@` inyectados como texto                              | Se eliminan de la copia del prompt; `content`/export los conserva verbatim                     | `@@depth` no aparece en el prompt y sí en el export.            |
| Llamadas de red durante import/export                               | Parseo local puro; placeholder generado en memoria                                             | Aserto de que no hay `fetch`; placeholder sin red.             |
| Fuga de secretos en export                                          | El card exporta solo datos del personaje; nunca settings/providers/API keys                    | Card exportado no contiene claves ni providers.                |
| `creator_notes` en el prompt                                        | Excluido del builder/compilador por contrato                                                   | Snapshot del prompt sin `creator_notes` (fuga = 0).            |
| Campo de prompt sobredimensionado                                   | `MAX_PROMPT_FIELD_CHARS` → rechazo en import                                                   | Campo > cap → `INVALID_CARD_FIELD_TOO_LARGE`.                  |
| Macro crudo en el prompt (solo si M1 se aprueba)                     | `{{char}}`/`{{user}}` expandidos en campos nuevos; resto verbatim (documentado)                | Snapshot con macro expandido, sin `{{char}}` crudo.            |

### Política de compatibilidad y legal

- **Clean-room.** Se implementa desde las specs públicas de `chara_card_v2`/
  `chara_card_v3`/lorebook, **no** copiando código, prompts, UI, assets ni tests
  de SillyTavern. La spec V3 es MIT; SillyTavern es AGPL-3.0 y este repo es
  AGPL-3.0-or-later: licencias compatibles en espíritu, pero la implementación
  se mantiene independiente para no asumir contenido ajeno.
- **Nominativo.** Uso de «compatible con SillyTavern» solo como descripción
  factual; sin logos, marcas ni endoso implícito.
- **Nota en docs.** Este RFC incluye la nota; el slice añade la misma nota corta
  en `README`/docs de usuario al documentar la feature.

### Decisiones de colocación (D1–D3, resueltas)

- **D1 — `system_prompt` vs `instructions` nativo.** Se mantiene el
  `instructions` nativo y `system_prompt` sustituye **solo el bloque de persona**
  (`roleplay`, `fiction`, `stayInCharacter`, `mature`) dentro de `character`. El
  scaffolding de agencia del usuario, idioma y longitud, la seguridad, el
  formato, las tools y el `instructions` nativo **no** se tocan.
  `post_history_instructions` va al final como sección propia.
- **D2 — posición del lorebook.** Tras `cards` y antes de `player` para
  `after_char` (default); `before_char` va al inicio. Ver `Contrato de
  colocación`.
- **D3 — `gender`/`pronouns`.** Display-only en S132 (sin inyección en prompt);
  la inyección se deja para otro slice.

### Decisiones para el gate

- **M1 — macros básicas.** El alcance no menciona macros. Se propone expandir
  `{{char}}`/`{{user}}` solo en los campos nuevos (`system_prompt`,
  `post_history_instructions`, `mes_example`), conservando el valor crudo en
  BD. Si el usuario prefiere no incluirlo en S132, se dejan verbatim y se
  documenta la limitación (el resto del RFC no cambia).

### Riesgos y mitigaciones

- **Superficie de propagación** (16 columnas + 2 tablas nuevas por entidad, DTO,
  repo, use-cases, export/import y UI). Mitigación: mapeo centralizado en
  `toVersion`/DTO y tests de round-trip de repositorio.
- **Paridad de prompt.** Cualquier sección nueva que se emita para caracteres
  existentes rompe snapshots S129. Mitigación: las secciones/líneas nuevas solo
  se emiten cuando el dato no está vacío; snapshots S129 como anclas de no-regresión.
- **Fidelidad del lorebook.** El subset (sin regex, sin timed/prob/groups, scan
  depth solo a nivel de libro) no es 1:1 con ST. Mitigación: preservar campos
  desconocidos y advertir en import; documentar el subset.
- **Proyección V2.** Exportar V3 a V2 pierde campos V3-only por diseño.
  Mitigación: emitir `ccv3` siempre (V3 completo) y `chara` como proyección V2
  válida; documentar la pérdida.
- **Parseo PNG en casa.** Riesgo de bugs de formato/CRC. Mitigación: fixtures
  sintéticos V2/V3 + round-trip + validación CRC; constantes de tamaño en tests.
- **Colisión de nombres** (`character_version` de ST vs `versionNumber`).
  Mitigación: columna `card_character_version`.
- **Fuga de `creator_notes`.** Mitigación: contrato explícito + snapshot.
- **Round-trip de desconocidos.** Si un campo desconocido se guarda en
  `extensions`, cambia la forma del card. Mitigación: separar `extensions`
  (verbatim) de `unknown_fields`/`unknown_root_fields`; tests de round-trip de
  raíz, `data`, libro y entrada.
- **Estimador heurístico** del presupuesto del lorebook. Mitigación: usar el
  mismo estimador del manifiesto; documentar que no es tokenizer real (diferido
  a un slice posterior).

### Fuera de alcance

- **Chats/JSONL y CHARX** (excluidos explícitamente del slice).
- Port del prompt por defecto de ST (solo overrides de compatibilidad).
- Regex de usuario, timed effects, probabilidad, grupos, decoradores y
  `vectorized` (preservados, no activados).
- Mensaje `system` post-historia para `post_history_instructions` (se emula al
  final del system prompt; el slot real queda deferred).
- Inyección de `gender`/`pronouns` en el prompt (display-only en S132).
- `scanDepth` per-entry (solo opera el nivel de libro; preservado con warning).
- Tokenizer real por proveedor (slice posterior; el presupuesto del lorebook usa
  el estimador heurístico).
- Persistencia/auto-refresco de un catálogo remoto de cards (sin red por diseño).

## Plan de eval

Obligatorio: el slice toca prompts/contexto (overrides de card + lorebook) e
import/export. Sin red.

**Fixtures deterministas (todas sin red; entidades/repos mockeados):**

1. **Round-trip de card V2/V3 JSON.** Importar un card V2 y uno V3 sintéticos →
   verificar campos mapeados → exportar → comparar `data` relevante (round-trip
   field loss = 0).
2. **Round-trip PNG V2/V3.** Generar PNG con `chara`/`ccv3` → importar → exportar
   PNG → re-importar; verificar chunks, base64 y payload.
3. **Proyección V2 + chunks duales.** Export V3 → `ccv3` = V3 completo, `chara` =
   proyección V2 (sin campos V3-only: `assets`, `nickname`,
   `group_only_greetings`, `creator_notes_multilingual`, `source`, fechas,
   lorebook V3-only).
4. **Precedencia `ccv3`.** PNG con ambos chunks distintos → importa `ccv3`.
5. **Duplicados de chunk.** Dos `tEXt` `chara` (o `ccv3`) → gana el último (sin error).
6. **Múltiples IDAT.** Dos chunks `IDAT` → se concatenan antes de inflate.
7. **V1.** Card sin `spec`/`data` (flat `name/description/personality/scenario/
first_mes/mes_example`) → mapea; keys V1 raíz desconocidas → `unknown_root_fields`;
   import-only (no export V1).
8. **`first_mes` vacío.** Card con `first_mes` vacío/whitespace y
   `alternate_greetings[0]` → se usa ese saludo; sin alternativas → fallback
   localizado + warning (invariante de entidad intacto). `description` vacía →
   `DEFAULT_CARD_DESCRIPTION` + warning; `name` vacío → `INVALID_CARD_NAME`.
9. **Tres formas de lorebook.** (a) `data.character_book` embebido; (b)
   `{spec:"lorebook_v3", data}` standalone; (c) ST nativo `{entries}` como
   objeto keyed-by-uid **y** como array → todos mapean a la misma tabla; aliases
   `key`/`keysecondary`/`disable`/`caseSensitive`/`matchWholeWords`/`order`/
   `position` numérico/`priority`/`id`→`source_id`.
10. **Selective logic.** Para `selective=true` con `secondary_keys`, verificar
    los 4 valores (0/1/2/3) con la tabla de verdad; `selective=false` ignora
    `secondary_keys`; `secondary_keys` vacío cae a `P`; `constant` ignora todo;
    `content` vacío no inyecta.
11. **Lorebook — activación y presupuesto.** Fixture de entradas (constante, key,
    secondary, selective, before/after, case, whole-word, priority) + mensajes de
    escaneo → incluidas/excluidas, orden por `insertion_order`, trim por
    `priority` desc, sección `before`/`after`, `overBudget = 0` cuando cabe y
    `> 0` cuando no. Un `content` con `@@depth 4` se inyecta sin el decorador y
    se exporta con él.
12. **Recursión.** Lorebook recursivo → respeta `MAX_LOREBOOK_RECURSION_DEPTH = 3`.
13. **Overrides de card.** `system_prompt` presente → sustituye el **bloque de
    persona** dentro de `character` (mantiene el scaffolding de agencia/idioma/
    longitud, `instructions` nativo, seguridad/formato/tools);
    `post_history_instructions` presente → sección `card-overrides.post-history`
    al final; ambos vacíos → salida byte a byte idéntica a la actual (snapshots
    S129). **Si M1 se aprueba:** `{{char}}`/`{{user}}` expandidos en
    `system_prompt`/`post_history_instructions`/`mes_example`; `{{otro}}`
    verbatim.
14. **Fuga de `creator_notes`.** Snapshot del `systemPrompt` sin `creator_notes`
    (fuga = 0).
15. **Paridad send/preview.** Misma conversación con lorebook y overrides →
    `get-prompt-context` y `send-message` producen el mismo `systemPrompt`.
16. **Campos sobredimensionados.** Campo de prompt > `MAX_PROMPT_FIELD_CHARS` →
    `INVALID_CARD_FIELD_TOO_LARGE` en import (sin truncado).
17. **Preservación de desconocidos.** Card con `extensions`, keys de `data` V3
    (`assets`, `nickname`, `group_only_greetings`) y keys de raíz desconocidas, y
    entries con decoradores/probabilidad/timed effects → importar → exportar →
    reaparecen verbatim (`extensions` aparte; `unknown_fields` vs
    `unknown_root_fields` aparte).
18. **Seguridad.** PNG corrupto, chunk sobredimensionado, bomba IDAT, JSON
    sobredimensionado, `use_regex` ignorada, sin `fetch` (aserto).
19. **API/UI.** Standalone lorebook preview/import/export; `GET .../lorebook`
    404 sin lorebook; import JSON/PNG con preview + warnings; export JSON/PNG;
    panel de notas del creador, tags, saludos alternativos, chips; modal `Crear`
    con pestaña Lorebook; estados vacíos.

**Métricas:** `creator_notes` en prompt = 0; round-trip field loss = 0 (raíz,
`data`, libro, entrada); `lorebook.overBudget` respetado; paridad send/preview
exacta; snapshots S129 intactos; cero llamadas de red; tamaños/límites rechazados
con código correcto; 4 valores de `selective_logic` verdes.

**Baseline:** comportamiento actual — solo export/import interno
`character-export`, sin card de ST, sin lorebook, sin overrides. Capturado con
los tests existentes de `import-character`/`export-character`/`get-prompt-context`
y los snapshots de `pnpm --filter @workspace/backend eval`.

**Umbral:** 100 % de fixtures nuevos en verde; cero regresiones; `pnpm check`,
`pnpm build` y `pnpm audit --prod` en verde; snapshots S129 intactos.

**Comandos:**

- `pnpm --filter @workspace/backend test`
- `pnpm --filter @workspace/backend eval`
- `pnpm --filter @workspace/frontend exec vitest run`
- `pnpm check` (incluye `check:arch`, typecheck, lint)
- `pnpm build`

## Criterios de aceptación

- [x] Migración `0019_…` añade las 16 columnas de `character_versions` y las
      tablas `lorebooks`/`lorebook_entries` (snapshot + journal; `db:generate`+
      `db:migrate` correctos; `scripts/package.mjs` copia la carpeta completa).
- [x] Importa cards V1/V2/V3 desde JSON y PNG (tEXt `chara`/`ccv3`, preferido
      `ccv3`); payload base64 UTF-8 JSON validado.
- [x] Exporta V2/V3 en JSON y PNG escribiendo ambos chunks: `ccv3` = V3,
      `chara` = V2 (o proyección V2 al exportar V3, sin campos V3-only).
- [x] Preserva `extensions`, `unknown_fields` y `unknown_root_fields` por
      separado (round-trip loss = 0).
- [x] `name` vacío → `INVALID_CARD_NAME`; `first_mes` vacío → primer saludo
      alternativo o fallback localizado + warning; `description` vacía →
      fallback localizado + warning; el invariante de entidad no se relaja.
- [x] `CharacterVersion` expone los campos nuevos; entidad/DTO/repo/use-cases
      los propagan; filas existentes quedan `null`/`[]` sin cambio de prompt;
      una edición copia los campos de card salvo cambio explícito.
- [x] `system_prompt` sustituye **solo el bloque de persona** dentro de
      `character` (mantiene scaffolding de agencia/idioma/longitud,
      `instructions` nativo, seguridad/formato/tools);
      `post_history_instructions` va como sección `card-overrides.post-history`
      al final; `personality`/`scenario`/`mes_example` en su posición;
      vacío/whitespace = sin sección (paridad S129).
- [x] **M1 no aprobado:** `{{char}}`/`{{user}}` se preservan verbatim en los
      campos nuevos; el valor guardado conserva los macros y la limitación queda
      documentada.
- [x] Campo de prompt > `MAX_PROMPT_FIELD_CHARS` → rechazo en import
      (`INVALID_CARD_FIELD_TOO_LARGE`).
- [x] `creator_notes` nunca llega al prompt (fuga = 0, snapshot).
- [x] Lorebook normalizado vinculado al personaje; tres formas de entrada (card
      embebido, CCv3 standalone, ST nativo `{entries}` objeto/array) detectadas
      y mapeadas; aliases ST nativos mapeados; campos desconocidos preservados.
- [x] `selective_logic` (0..3) con tabla de verdad; `secondary_keys` solo filtra
      con `selective=true`; `constant`/`content` vacío/`use_regex` con las reglas
      definidas.
- [x] Posición numérica 0..6 mapeada a before/after con warning; `raw_position`
      preservado para export. Decoradores `@@`/`@@@` eliminados de la copia del
      prompt y conservados en `content`/export.
- [x] Presupuesto con trim por `priority` desc; orden de inyección por
      `insertion_order`; `scan_depth` a nivel de libro; recursión cap 3.
- [x] Paridad send/preview con lorebook + overrides (mismo `systemPrompt`).
- [x] Endpoints de card (preview/import/export), lorebook standalone
      (preview/import/export) y CRUD/link con Zod y límites; `GET .../lorebook`
      404 sin lorebook; rutas montadas antes de `:id`; `POST /api/characters`
      acepta `lorebook` para crearlo en la misma transacción; un lorebook por
      personaje (`UNIQUE(character_id)`) y `409` si se importa sin `replace`.
- [x] Export interno: sección `lorebook` (padre `definition`, incluida por
      defecto con `definition`); exports viejos importan sin lorebook.
- [x] UI: import JSON/PNG con preview, export JSON/PNG, import/export de lorebook
      standalone, panel de notas del creador, tags, saludos alternativos, chips
      de género/pronombres, tagline display-only, modal `Crear` con pestañas
      Personaje/Lorebook; `/characters/new` se mantiene.
- [x] Seguridad: límites, sanitización HTML, sin regex de usuario, cap de
      recursión, cap de chunks, sin red, sin secretos, placeholder sin imagen.
- [x] Nota de compatibilidad/legal (clean-room, nominativo) en el RFC y en
      `README`/docs de usuario.
- [x] `pnpm check`, `pnpm build` y `pnpm audit --prod` en verde; sin archivos >500 líneas; aislamiento de features respetado.

## Red tests

- **Comando:**
  - `pnpm --filter @workspace/backend test`
  - `pnpm --filter @workspace/frontend exec vitest run`
- **Fallo esperado:** los módulos S132 aún no existen (shared card/lorebook
  helpers, PNG adapter, mapper, use cases, rutas, entidades, componentes) y la
  migración `0019`/campos nuevos/overrides/lorebook no están implementados.
- **Salida relevante (2026-11-07):**
  - backend: `20 failed | 129 passed` archivos, `24 failed | 807 passed` tests.
    Fallos representativos: journal `0019` ausente; columnas nuevas y tablas
    `lorebooks`/`lorebook_entries` ausentes; `Cannot find package
    @workspace/shared/lib/lorebook-activation`; `Cannot find package
    @workspace/shared/lib/sillytavern-card`; `Cannot find module
    ./png-card.adapter`; `Cannot find module ./sillytavern-card.mapper`; use
    cases/rutas S132 ausentes; export interno sin sección `lorebook`; prompt sin
    overrides/lorebook; `preview.systemPrompt` sin lorebook.
  - frontend: `9 failed | 70 passed` archivos, `3 failed | 410 passed` tests.
    Fallos: componentes S132 ausentes; el formulario no tiene pestañas
    `Personaje`/`Lorebook`; el botón «Crear personaje» no abre el modal.
  - Los tests existentes de S129/S130/S131 siguen pasando (807 backend / 410
    frontend), así que el rojo es de S132 y no una regresión.
- **Plan:** `docs/10-slices/S132-test-plan.md`.

## Decisiones

- **Creación transaccional.** `CharacterRepository.createWithFirstVersion(character,
  version, { book, entries })` acepta un lorebook opcional y crea personaje +
  primera versión + libro + entradas en una sola transacción SQLite. El bloque lo
  construye `create-character` con `buildLorebookEntities`; un fallo intermedio no
  deja personaje huérfano ni lorebook parcial. `CreateCharacterInput.lorebook` es
  `{ format: "ccv3"|"st-native", payload: string }` y se parsea en el backend.
- **PNG: base64 estricto.** `decodeCardText` solo acepta base64 estándar (alfabeto
  y padding válidos) de JSON UTF-8; cualquier fallo es `INVALID_CARD_PNG`, sin
  fallback a JSON crudo. Cierra el bypass que permitía meter JSON directo en un
  `tEXt` (nota N2 de la review).
- **Buckets de desconocidos separados.** `extensions` se guarda verbatim tal cual
  llega en la card; `unknownFields` recoge las keys no mapeadas de `data` (incluidos
  `assets`, `nickname`, `group_only_greetings`, `creator_notes_multilingual`,
  `source` y fechas de V3); `unknownRootFields` recoge las keys no mapeadas de la
  raíz del envelope o de un V1 plano. Cada bucket se re-emite en su nivel al
  exportar. `tagline` vive en `extensions.rm.tagline` con merge (no borra el resto
  de `extensions`).
- **`selective_logic` 0–3.** Se implementa la tabla de verdad completa (AND ANY,
  NOT ALL, NOT ANY, AND ALL) contando cuántas `secondary_keys` matchean. Con
  `selective=false` las secundarias se ignoran; con `secondary_keys` vacío se cae
  a la key primaria; `constant` gana salvo `use_regex`; `content` vacío o
  `enabled=false` nunca se inyectan.
- **`scan_depth=0` + recursión.** `scan_depth=0` deja el texto de escaneo inicial
  vacío, así que solo sobreviven las entradas `constant`; si `recursive_scanning`
  está activo, la recursión sigue operando sobre el contenido de esas constantes.
  La recursión re-escanea solo el contenido recién incluido, no duplica y se corta
  a `MAX_LOREBOOK_RECURSION_DEPTH = 3`; `scanDepth` por entrada y
  `excludeRecursion`/`preventRecursion` se preservan sin activar.
- **Manifiesto `lorebook.overBudget`.** `ContextManifestDTO.lorebook?: {
  overBudget: number }` expone cuántas entradas activadas se descartaron por
  `token_budget`; lo emite `ContextCompiler` desde el resultado de activación.
- **D1 — reemplazo del bloque de persona.** Con `system_prompt` no vacío se omiten
  en su sitio `prompt.roleplay`, `prompt.roleplayFiction`,
  `prompt.roleplayStayInCharacter` y `prompt.roleplayMature` y se inserta el label
  `prompt.systemPrompt` + el valor en la posición de la primera. El scaffolding
  (`prompt.roleplayUserAgency`, `prompt.roleplayLanguage`,
  `prompt.roleplayLength`), el `instructions` nativo, la seguridad, el formato y
  las tools se mantienen. Sin `system_prompt` la salida es byte a byte igual que
  antes (snapshots S129 intactos). `post_history_instructions` se emite como
  sección final `card-overrides.post-history`.
- **M1 no aprobado — macros verbatim.** No se expanden `{{char}}`/`{{user}}`;
  `system_prompt`, `post_history_instructions` y `mes_example` se inyectan con los
  macros crudos y el valor guardado los conserva. La limitación se documenta.
- **Campos display-only.** `gender`, `pronouns`, `tagline` y `cardCharacterVersion`
  se muestran (chips/etiqueta) pero no se inyectan en el prompt ni se editan;
  `tags` y `alternate_greetings` se editan pero no se inyectan; `creator_notes`
  nunca entra en el prompt.
- **Presupuesto y decoradores.** El trim del presupuesto ordena por `priority`
  desc y desempata por `insertionOrder` asc; la inyección final ordena por
  `insertionOrder` asc y desempata por `order`. Las líneas `@@`/`@@@` se eliminan
  de la copia inyectada con `stripDecorators` pero se conservan verbatim en
  `content` y en el export.

## Verificación

- **Backend:** `pnpm --filter @workspace/backend test` → 149 archivos / 964
  tests en verde.
- **Frontend:** `pnpm --filter @workspace/frontend exec vitest run` → 80
  archivos / 435 tests en verde.
- **`pnpm check`:** pasa (`check:arch` 7/7, typecheck 5/5, lint 5/5).
- **`pnpm build`:** pasa; solo aparecen avisos preexistentes.
- **`pnpm audit --prod`:** sin vulnerabilidades conocidas.
- **`git diff --check`:** limpio.
- **Release dry-run:** no ejecutado; el slice no toca empaquetado, módulos
  nativos ni lockfile.
- **Prueba manual:** no ejecutada; recomendada antes del merge (import
  JSON/PNG, lorebook con claves y presupuesto, overrides de card y modal
  `Crear`).

## Review

- **Estado:** PASS WITH NOTES
- **Informe:** `docs/10-slices/S132-review.md`
- **Bloqueantes resueltos:** ninguno pendiente; sin bloqueantes ni importantes.
  B1 (límite de 15 MB anulado por el global de 1 MB), I1 (pérdida de metadatos
  al editar un lorebook), I2 (UI standalone), N1 (`lorebook.overBudget`), N2
  (base64 estricto) y N5 (display-only) quedaron resueltos con tests.

## Deferred

- **R1 — Entrada de lorebook standalone en el listado.** El import/export solo
  está en la pestaña Lorebook del formulario; falta el punto de entrada en el
  menú contextual/barra del listado. Requiere un diálogo de selección de
  personaje destino y cableado en `character-list`/`character-context-menu`.
- **R2 — Export ST-native no expuesto en UI.** `handleLorebookExport` solo emite
  `ccv3`; el endpoint `st-native` existe pero la UI no ofrece el formato.
  Requiere un selector de formato en el diálogo de export.
- **R3 — Fallback localizado en inglés.** El mapper usa `translate("en", …)` para
  `cardFallbackDescription`/`cardFallbackGreeting`, así que el fallback persistido
  queda en inglés para usuarios en español. Requiere pasar el locale del request
  al mapper o resolverlo en el caso de uso.
- **R4 — Modal con tres pestañas.** `character-form` usa
  Personaje/Tarjetas/Lorebook frente a las dos pestañas del RFC. Requiere decidir
  si «Tarjetas» es una pestaña propia o se integra en Personaje.
- **R5 — Borrado de lorebook con nombre vacío.** `hasLorebookContent` exige
  entradas o nombre no vacío, así que vaciar ambos no persiste el borrado.
  Requiere un flag explícito de libro vacío o un endpoint de borrado.
- **R6 — `MAX_CARD_JSON_BYTES` sin uso en producción.** Solo se aserta en tests;
  el límite real es `maxDecodedCardJsonBytes`. Requiere conectar la constante al
  parseo o retirarla.
- **R7 — `spec_version` de lorebook CCv3.** Se captura en `unknownFields` del
  libro y se re-emite dentro de `data`, no en la raíz. Requiere un campo de raíz
  específico si se quiere fidelidad exacta.
- **R8 — `reorderEntries` sin validación de pertenencia.** Reordena por ids
  arbitrarios sin comprobar que pertenezcan al libro del personaje. Requiere
  validar contra `lorebook_id` o documentar la confianza en la frontera local.
- **R9 — Normalización duplicada.** `parseLorebookPayload` del frontend
  reimplementa `normalizeLorebook`; si derivan, el editor puede mostrar algo
  distinto de lo que persiste el backend. Requiere extraer un helper compartido
  o aceptar la deriva (el backend re-normaliza al guardar).

## Commits

1. `docs(slice): add S132 RFC` (aaf0f43)
2. `docs(slice): revise S132 RFC` (dbd1e5e)
3. `docs(slice): approve S132 RFC` (8d11acc)
4. `docs(slice): add S132 test plan` (506ed4b)
5. `test(s132): add red tests for SillyTavern cards and lorebooks` (ea1cd91)
6. `test(s132): align fixtures and red tests with approved contracts` (82f9985)
7. `feat(shared): add SillyTavern card and lorebook contracts` (d36eeba)
8. `feat(backend): persist card fields and character lorebooks` (6db4506)
9. `feat(backend): import and export SillyTavern cards and lorebooks` (b4e807e)
10. `feat(backend): apply card overrides and lorebook context` (3418c84)
11. `feat(frontend): add SillyTavern card and lorebook UI` (da086a0)
12. `fix(backend): mount the 15 MB card parser before the global limit` (88332d3)
13. `fix(backend): require base64 card payloads in PNG chunks` (56b9496)
14. `fix(frontend): preserve lorebook metadata and add standalone import/export` (c11b62a)
15. `test(s132): cover lorebook edit round-trip` (5089592)
16. `docs(slice): record S132 independent review` (3913904)
17. `docs(slice): close S132 documentation and release checks` (este commit)
