# S132 — Character cards y lorebooks de SillyTavern (JSON + PNG)

**Estado:** Draft
**Inicio:** 2026-11-06
**Fin:** —

> `Draft` → `Aprobado` → `En progreso` → `Completado`.
> Solo el usuario cambia `Draft` a `Aprobado`.

## Descripción

Importa y exporta **character cards de SillyTavern** (spec `chara_card_v2` y
`chara_card_v3`, en JSON y en PNG con chunks `tEXt` `chara`/`ccv3`) y añade
soporte nativo para **lorebooks** vinculados al personaje, integrándolos como
fuente de contexto en el compilador de S129. Amplía `CharacterVersion` con los
campos de la card (personality, scenario, mensajes de ejemplo, saludos
alternativos, notas del creador, tags, creator, versión de card, `gender`/
`pronouns`, `tagline`) y aplica `system_prompt`/`post_history_instructions`
como **overrides de card** con colocación determinista. No toca chats/JSONL ni
CHARX. Es la base de lorebook que S129/S130 dejaron anotada como «S132».

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
  SillyTavern no puede usarlo.
- `creator_notes` no existe, así que tampoco existe la garantía explícita de que
  **nunca** llegue al prompt.

**Consecuencia observable:** un usuario con una librería de cards de SillyTavern
(JSON o PNG) no puede importarlas, y el material de rol (personalidad, escenario,
ejemplos, lorebook) no se conserva ni se inyecta. Es una barrera de adopción
directa frente a la comunidad de SillyTavern.

### Restricciones

- **Arquitectura hexagonal.** El mapeo card→entidad, la activación de lorebook y
  el ensamblado viven en código sin I/O (`domain/`/`application/` puro o `shared`
  lib); el parseo de PNG/chunks vive en un adaptador de infraestructura o en un
  lib puro sin red; el caso de uso orquesta. Nada de Drizzle/Express en
  dominio/aplicación, salvo la excepción `error-handler` ya documentada.
- **`shared/` puro.** Los tipos de card/lorebook y los helpers puros (match de
  keys, presupuesto) no pueden importar `react`, `express`, `drizzle-orm`,
  `zod` (tipos sí, runtime no) ni `sharp`. `pnpm check:arch` lo verifica.
- **Sin red en runtime** para import/export: el parseo de PNG/tEXt es local; la
  imagen de placeholder se genera en memoria (nunca se descarga).
- **Sin dependencias pesadas.** PNG se parsea/escribe en casa reutilizando
  `zlib` de Node (`zlib.crc32`, `zlib.inflateSync`/`deflateSync`); no se añade
  `pngjs` ni similar. La decodificación/re-encode de la imagen de perfil reutiliza
  el pipeline de imágenes existente (`characterAssetImageProcessor`).
- **No cambiar el prompt para caracteres existentes.** Para una `CharacterVersion`
  sin `system_prompt`, `post_history_instructions` ni lorebook activo, el
  `systemPrompt` debe ser byte a byte idéntico al actual (snapshots S129
  intactos). Los overrides/lorebook son **aditivos y opcionales**.
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

| # | Opción | Ventajas | Costes | ¿Elegida? |
| --- | --- | --- | --- | --- |
| **A** | Columnas nativas para los campos de card + **tablas normalizadas** `lorebooks`/`lorebook_entries` vinculadas al personaje. | Editable por entrada; activación limpia sin parsear JSON; FK/cascade; futuras features (probabilidad, efectos temporizados) se añaden como columnas; el lorebook vive fuera de la versión del personaje. | Migración + entidad + puerto + repo + use-cases; más superficie. | **Sí** |
| **B** | Una columna JSON (`lorebook_json` en una tabla `lorebooks`, o embebida en `character_versions`). | Migración mínima; round-trip trivial. | La activación parsea JSON en cada envío; sin edición por entrada; difícil indexar/consultar; el lorebook queda atado a la versión si va en `character_versions`. | No |
| **C** | JSON embebido en `character_versions` (espejo 1:1 del card de ST). | Round-trip perfecto del card. | Lorebook re-versionado en cada edición del personaje; sin ciclo de vida propio; contradice «link lorebook al personaje» y la edición independiente. | No |

**Descarte de B/C:** el requisito «link lorebook al personaje», «integrar como
fuente de contexto» y «editar/crear entradas» exige filas consultables y con
ciclo de vida propio; B/C aplazan ese coste al camino caliente de cada envío
(parsear JSON) y dificultan las features diferidas (probabilidad, grupos,
efectos temporizados).

#### Matching de activación del lorebook

| # | Opción | Ventajas | Costes | ¿Elegida? |
| --- | --- | --- | --- | --- |
| **A** | Matching **literal** de substrings (case-insensitive por defecto, opción whole-word). | Sin ReDoS por construcción; determinista y testeable; cubre el subset pedido. | No soporta los `use_regex` de ST (se preservan, no se activan). | **Sí** |
| **B** | Regex de usuario (`use_regex`) con una librería safe-regex. | Fidelidad con ST para cards que usan regex. | Superficie de ReDoS/validación; nueva dependencia; comportamiento no portable entre motores. | No |
| **C** | Regex de usuario sin validación. | Máxima fidelidad. | ReDoS trivial contra una entrada importada; inaceptable (guardrail de seguridad). | No |

#### Parseo/escritura de PNG

| # | Opción | Ventajas | Costes | ¿Elegida? |
| --- | --- | --- | --- | --- |
| **A** | Parser/escritor PNG **en casa** (chunks `IHDR`/`tEXt`/`IDAT`/`IEND`, CRC con `zlib.crc32`, inflate/deflate con `zlib`). | Sin dependencia nueva; control total de límites y errores; CRC/len validables. | Hay que implementar el formato mínimo (firma, chunks, CRC, tEXt, IDAT). | **Sí** |
| **B** | Dependencia `pngjs`/`fast-png`. | Menos código. | Dependencia nueva (superficie de `pnpm audit`, bundle, build); los guardrails desaconsejan dependencias pesadas. | No |
| **C** | Solo JSON (sin PNG). | Cero código de imagen. | El alcance aprobado exige PNG (`chara`/`ccv3`); no cumple. | No |

### Decisión

Se elige **A** en las tres tablas: campos nativos + lorebook normalizado, matching
literal sin regex, y parser PNG en casa sobre `zlib`. Resumen del alcance:

1. **Import/export de cards.** Importar cards V1/V2/V3 desde JSON y PNG (tEXt
   `chara` para V2, `ccv3` para V3; **preferido `ccv3`** cuando ambos existen).
   Exportar V2/V3 en JSON y PNG escribiendo **ambos** chunks `chara` y `ccv3`.
   Preservar `extensions` y campos top-level desconocidos para round-trip.
2. **Campos nativos** en `CharacterVersion` (ver `Plan de migración`).
3. **Overrides de card** en el compilador S129 (ver `Contrato de colocación`).
4. **Lorebook** normalizado + subset de activación (ver `Semántica del lorebook`).
5. **UI** de import/export JSON+PNG, panel de notas del creador, tags, saludos
   alternativos, chips de género/pronombres, tagline display-only, y modal
   `Crear` con pestañas Personaje / Lorebook.
6. **Seguridad** y **política legal** (secciones dedicadas más abajo).

### Plan de migración

**Migración `0019_character_cards.sql`** (idx 19, version 6 del journal; el tag
lo genera `db:generate` salvo que se nombre a mano, como `0016_context_window`).

1. **`character_versions` — columnas nuevas (todas nullable, sin `DEFAULT`):**
   - `personality` text
   - `scenario` text
   - `mes_example` text (mensajes de ejemplo)
   - `alternate_greetings` text (JSON array de strings)
   - `creator_notes` text
   - `tags` text (JSON array de strings)
   - `creator` text
   - `card_character_version` text (label de versión de la card de ST; el
     nombre evita chocar con nuestro `versionNumber` entero)
   - `gender` text
   - `pronouns` text
   - `tagline` text (display-only)
   - `system_prompt` text (override de card)
   - `post_history_instructions` text (override de card)
   - `extensions` text (JSON, verbatim: `extensions` del card)
   - `unknown_fields` text (JSON, verbatim: keys top-level de `data` no mapeadas)

2. **`lorebooks`** (nueva tabla):
   - `id` text PK
   - `character_id` text NOT NULL → `characters.id` `onDelete: "cascade"`
   - `name` text (opcional)
   - `scan_depth` integer NOT NULL default `4`
   - `token_budget` integer NOT NULL default `400`
   - `recursive_scanning` integer boolean NOT NULL default `0`
   - `extensions` text (JSON, campos desconocidos a nivel de libro)
   - `created_at`/`updated_at` timestamp NOT NULL
   - índice `lorebooks_character_idx` sobre `character_id`

3. **`lorebook_entries`** (nueva tabla):
   - `id` text PK
   - `lorebook_id` text NOT NULL → `lorebooks.id` `onDelete: "cascade"`
   - `keys` text NOT NULL (JSON array)
   - `secondary_keys` text NOT NULL (JSON array, default `[]`)
   - `content` text NOT NULL
   - `comment` text (opcional)
   - `constant` integer boolean NOT NULL default `0`
   - `selective` integer boolean NOT NULL default `0`
   - `insertion_order` integer NOT NULL default `100`
   - `position` text NOT NULL default `"after_char"` (`before_char`|`after_char`)
   - `enabled` integer boolean NOT NULL default `1`
   - `case_sensitive` integer boolean NOT NULL default `0`
   - `whole_words` integer boolean NOT NULL default `0` (nuestra extensión)
   - `order` integer NOT NULL (orden estable de presentación/creación)
   - `extensions` text (JSON, campos ST desconocidos: `use_regex`, probabilidad,
     grupos, decoradores, timed effects, `vectorized`, `depth`, `role`, etc.)
   - `created_at`/`updated_at` timestamp NOT NULL
   - índices `lorebook_entries_lorebook_idx` (`lorebook_id`, `order`)

4. **Backward compatibility.** Las filas existentes de `character_versions`
   quedan con las columnas nuevas en `NULL`; `toVersion`/DTO las exponen como
   `null`/`[]`/`undefined` y nada cambia en el prompt. Ningún personaje existente
   recibe lorebook (sin backfill). La migración es aditiva: `ALTER TABLE
   character_versions ADD COLUMN ...` y `CREATE TABLE` para lorebooks/entries.
   `scripts/package.mjs` copia la carpeta de migraciones completa, así que la
   nueva entra sin cambios en el empaquetado.

5. **Entidad de dominio.** `CharacterVersion` gana getters para los campos
   nuevos (con default `null`/`[]`); `Lorebook` y `LorebookEntry` como entidades
   nuevas con factories `create`/`reconstruct` y `withX()` (inmutables). Los
   invariantes: `content` no vacío; `keys`/`secondary_keys` arrays de strings;
   `position` dentro del enum; `insertion_order`/`order` enteros; `scan_depth`
   ≥ 0; `token_budget` ≥ 0.

6. **Puerto y repo.** `LorebookRepository` (findByCharacterId, upsertBook,
   createEntry, updateEntry, deleteEntry, reorderEntries) en `domain/ports/`;
   `DrizzleLorebookRepository` en `drizzle/repositories/`. El
   `CharacterRepository` se amplía para leer/escribir los campos nuevos de la
   versión en `createWithFirstVersion`/`saveVersion`/`findVersionById`/
   `findVersionsByCharacterId` (el mapeo `toVersion` ya centraliza la
   conversión).

### Plan de export interno

- **`EXPORT_SCHEMA_VERSION` sigue en 1.** Los campos nuevos viajan **dentro** del
  `CharacterVersionDTO` existente (secciones `definition`/`versions`) como
  propiedades opcionales (`personality?`, `scenario?`, …). Un export viejo sin
  esas claves importa con `null`/`[]` (sin cambio); un export nuevo se lee en
  versiones antiguas ignorando las claves (JSON extra). No hay bump porque no
  hay cambio de forma obligatorio.
- **Lorebook en el export interno.** `CharacterExport` gana `lorebook?:
  LorebookDTO` (opcional, aditivo). `export-character` lo incluye cuando se
  pide la sección `definition` (o una nueva sección `lorebook`); `import-
  character` lo crea si está presente. Ausente en exports viejos → no se crea
  lorebook.
- **Card de SillyTavern ≠ export interno.** El card (`spec: chara_card_v2|v3`)
  es un formato de intercambio **distinto** del `character-export` interno. Se
  implementan convertidores puros (no en el use-case de export interno):
  `characterVersion → card data` y `card data → CharacterVersion`. Un personaje
  existente se exporta a card mediante un endpoint dedicado (ver `Superficie de
  API`), mapeando los campos nativos a los de ST.
- **Round-trip de campos desconocidos.** `extensions` y `unknown_fields` viajan
  en el export interno (JSON verbatim) **y** en el card de ST (se re-emiten tal
  cual), de modo que importar→exportar un card no pierde datos que no
  entendemos.

### Contrato PNG

- **Firma:** 8 bytes `89 50 4E 47 0D 0A 1A 0A`.
- **Chunks usados:** `IHDR` (obligatorio), `tEXt` (keywords `chara` y `ccv3`),
  `IDAT` (imagen), `IEND`. Se ignoran (se descartan al re-escribir) los chunks
  auxiliares `tEXt`/`iTXt`/`zTXt` no reconocidos y `pHYs`/`sRGB`/etc.; se
  **rechaza** cualquier chunk crítico desconocido (bit ancillario a 0) que no
  sepamos interpretar.
- **`tEXt`:** keyword Latin-1 terminada en `\0`, después el payload. `chara` =
  V2, `ccv3` = V3. Ambos payloads son **base64 de UTF-8 JSON**. Al leer, si
  ambos existen **gana `ccv3`** (V3) y `chara` se conserva solo como fallback;
  al escribir se emiten **ambos** (V2 `chara` + V3 `ccv3`).
- **Validación:** longitud declarada vs bytes disponibles por chunk; CRC de cada
  chunk con `zlib.crc32`; total de bytes del archivo ≤ `MAX_CARD_PNG_BYTES`;
  número de chunks ≤ `MAX_PNG_CHUNKS`; tamaño de cada chunk `tEXt` ≤
  `MAX_TEXT_CHUNK_BYTES`; JSON decodificado ≤ `MAX_DECODED_CARD_JSON_CHARS`;
  IDAT descomprimido ≤ `MAX_IDAT_DECOMPRESSED_BYTES` (bomba de compresión).
- **Malformado/duplicado:** chunk `tEXt` `chara`/`ccv3` duplicado → gana el
  último (o se rechaza; se fija en tests: **gana el último**, documentado). CRC
  incorrecto, longitud inconsistente o `IHDR`/`IEND` ausentes → error
  `INVALID_CARD_PNG` (400). No hay llamadas de red.
- **Imagen embebida (import):** el IDAT se decodifica con el pipeline de imagen
  existente y se guarda como asset de perfil (mime/bytes). Si no hay imagen o
  falla la decodificación, se importa sin imagen (no bloquea).
- **Imagen en export:** si el personaje tiene imagen de perfil, se re-encode a
  PNG y se embebe en `IDAT`; si **no** tiene, se emite un PNG placeholder
  **generado en memoria** (sin red): 1×1 (o neutro) RGBA con los chunks
  `chara`/`ccv3` correctos.
- **Constantes propuestas** (se fijan en tests): `MAX_CARD_JSON_BYTES = 5 MiB`,
  `MAX_CARD_PNG_BYTES = 10 MiB`, `MAX_PNG_CHUNKS = 512`,
  `MAX_TEXT_CHUNK_BYTES = 4 MiB`, `MAX_DECODED_CARD_JSON_CHARS = 5 M chars`,
  `MAX_IDAT_DECOMPRESSED_BYTES = 50 MiB`.

### Tabla de mapeo de campos

Columna «Prompt» indica si/usar el campo en el ensamblado; «Export card» indica
a qué clave de `data` de ST se mapea al exportar (y si es verbatim).

| Campo ST (V2/V3 `data`) | Campo entidad/DTO | Prompt | Export card |
| --- | --- | --- | --- |
| `name` | `CharacterVersion.name` / `Character.name` | `prompt.intro`/`prompt.name` | `name` |
| `description` | `CharacterVersion.description` | `prompt.intro` + `prompt.personality` | `description` |
| `personality` | `CharacterVersion.personality` (nuevo) | Sección `personality` (nueva, tras `description`) | `personality` |
| `scenario` | `CharacterVersion.scenario` (nuevo) | Sección `scenario` (nueva, en `character`) | `scenario` |
| `first_mes` | `CharacterVersion.greeting` | `prompt.styleExample` (saludo de ejemplo) | `first_mes` |
| `mes_example` | `CharacterVersion.mesExample` (nuevo) | Sección `style` (ejemplo, opcional) | `mes_example` |
| `system_prompt` | `CharacterVersion.systemPrompt` (nuevo) | Override de card (sección propia) | `system_prompt` |
| `post_history_instructions` | `CharacterVersion.postHistoryInstructions` (nuevo) | Override de card (final del system prompt) | `post_history_instructions` |
| `alternate_greetings` | `CharacterVersion.alternateGreetings` (JSON array) | No (display-only) | `alternate_greetings` |
| `creator_notes` | `CharacterVersion.creatorNotes` (nuevo) | **Nunca** | `creator_notes` |
| `tags` | `CharacterVersion.tags` (JSON array) | No (display-only) | `tags` |
| `creator` | `CharacterVersion.creator` (nuevo) | No (display-only) | `creator` |
| `character_version` | `CharacterVersion.cardCharacterVersion` (nuevo, string) | No (display-only) | `character_version` |
| `gender` | `CharacterVersion.gender` (nuevo) | No (display-only en S132) | `gender` |
| `pronouns` | `CharacterVersion.pronouns` (nuevo) | No (display-only en S132) | `pronouns` |
| `tagline` (nuestro) | `CharacterVersion.tagline` (nuevo) | No (display-only) | `extensions.rm.tagline` (namespaced) |
| `extensions` | `CharacterVersion.extensions` (JSON verbatim) | No | `extensions` (verbatim) |
| `character_book` | `Lorebook` + `LorebookEntry` (vinculado al personaje) | Entradas activadas (sección `lorebook.*`) | `character_book` |
| claves `data` no mapeadas | `CharacterVersion.unknownFields` (JSON verbatim) | No | verbatim |

### Contrato de colocación del prompt

Orden numerado de las secciones del `systemPrompt` final (compilador S129 +
builder). Las secciones `lorebook.*` y `card-overrides.*` son nuevas; el resto
queda byte a byte como hoy cuando no hay override ni lorebook activo.

0. `lorebook.before` — entradas activadas con `position = "before_char"` (solo si las hay).
1. `character` — intro, reglas de rol, personalidad, nombre, subtitle (sin cambios).
2. `character.instructions` — `instructions` nativo (sin cambios; ver decisión pendiente D1).
3. `card-overrides.system-prompt` — **solo si `system_prompt` no vacío**, etiquetado como override autoritativo.
4. `cards` — tarjetas de conocimiento activas (sin cambios).
5. `lorebook.after` — entradas activadas con `position = "after_char"` (default; solo si las hay).
6. `player` — personaje del jugador (sin cambios).
7. `memories` — memorias elegibles (sin cambios).
8. `summary` — último resumen (sin cambios).
9. `proposals` — formato de propuestas de memoria (sin cambios).
10. `style` — estilo + ejemplo de saludo (`mes_example` opcional aquí) (sin cambios salvo el ejemplo).
11. `format` — reglas de formato de respuesta (sin cambios).
12. `ooc` — solo si `filterOocFromHistory` (sin cambios).
13. `card-overrides.post-history` — **solo si `post_history_instructions` no vacío**, al final absoluto.

**Reglas de interacción:**

- `system_prompt` y `post_history_instructions` son **overrides de
  compatibilidad**, no un port del prompt de ST: se inyectan como secciones
  etiquetadas dentro de **nuestro** system prompt, sin alterar el andamiaje de
  seguridad/formato/tools. No reproducen el prompt por defecto de ST.
- **Vacío = sección ausente** → la salida es idéntica a la actual (paridad
  S129, backward compatible). Se verifica con snapshots.
- **Precedencia frente a `instructions` nativo:** por defecto se emiten ambos;
  el override se coloca *después* de `character.instructions` para que, en la
  práctica, su posición más tardía domine. La supresión del `instructions`
  nativo cuando `system_prompt` existe es la **decisión pendiente D1**.
- **`post_history_instructions`** se emula al **final del system prompt** (la
  app no tiene slot de mensaje post-historia); la alternativa de un mensaje
  `system` tras el historial se descarta para no tocar el contrato del array de
  mensajes ni los adapters de proveedor (deferred).
- **`creator_notes` nunca aparece** en ninguna sección (test de fuga = 0).
- **Presupuesto:** los overrides cuentan en `estimatedInputTokens` del manifiesto
  como secciones con `source: "card-override"` y su propio `estimateTextTokens`.
  No se truncan per-se en S132: el presupuesto lo gestiona la compactación
  existente (umbral + resumen), sin lógica nueva de recorte de override.
- **Paridad send/preview:** `get-prompt-context` y `send-message` comparten
  `ConversationContextLoader` + `ContextCompiler` + builder; el lorebook y los
  overrides se resuelven en el loader y entran por el mismo camino, así que
  preview y envío producen el mismo `systemPrompt` para la misma entrada.

### Semántica del lorebook

**Carga:** `ConversationContextLoader` resuelve además `lorebook` +
`entries` por personaje (el lorebook se vincula al `character_id` de la versión
fijada a la conversación) y las expone en `ConversationContextLoadResult`.

**Subset de activación (implementado):**

| Campo | Default | Regla de match / comportamiento |
| --- | --- | --- |
| `keys` (primarias) | `[]` | OR: la entrada activa si **alguna** key primaria matchea (literal, ver `case_sensitive`/`whole_words`). |
| `secondary_keys` | `[]` | AND adicional: si no vacío, además debe matchear **alguna** key secundaria. |
| `constant` | `false` | Siempre se inyecta (ignora keys), dentro de presupuesto. |
| `selective` | `false` | Activa solo por match de key; una entrada selective **sin keys no se auto-inyecta** (requeriría inyección forzada, fuera de alcance). |
| `insertion_order` | `100` | Orden de inyección entre activadas: `insertion_order` asc, desempate por `order` (orden estable). |
| `position` | `after_char` | `before_char` → sección `lorebook.before`; `after_char` (o `@D`/desconocido) → `lorebook.after`. |
| `enabled` | `true` | `false` → excluida. |
| `case_sensitive` | `false` | `false` = match case-insensitive; `true` = case-sensitive. |
| `whole_words` (nuestra ext.) | `false` | `false` = substring; `true` = límites de palabra (`\b`-style, sin regex). |
| `scan_depth` (libro) | `4` | Nº de mensajes más recientes (user+assistant) de la ventana a escanear para keys; `0` desactiva el escaneo; se clampa a la ventana disponible. |
| `token_budget` (libro) | `400` | Tokens totales (estimador `estimateTextTokens`) del contenido inyectado; entradas que caben en orden hasta agotarlo; excedentes descartadas (contadas en manifiesto). `0` = sin presupuesto. |
| `recursive_scanning` (libro) | `false` | Tras inyectar, re-escanear el contenido inyectado para más matches, hasta el cap de recursión. |

- **Multi-key:** OR sobre `keys`; `secondary_keys` añaden una capa AND.
- **Texto de escaneo:** concatenación del contenido de los últimos `scan_depth`
  mensajes de la ventana (incluido el pendiente), mismo texto para todos los
  campos (sin regex).
- **Cap de recursión:** `MAX_LOREBOOK_RECURSION_DEPTH = 3` (constante, ignora
  flags `exclude_recursion`/`prevent_recursion` más allá del cap).
- **Presupuesto:** se contabiliza con `estimateTextTokens` (mismo estimador del
  manifiesto S129); el manifiesto expone `lorebook: { total, included, excluded,
  overBudget }` para que el inspector muestre cuántas entradas se descartaron.
- **Preservado pero NO activado:** timed effects (`cooldown`, `delay`, `sticky`,
  `delay_until_recursion`), `probability`, `group`/`group_override`/`group_weight`,
  decoradores, `vectorized`, `use_regex`, `depth`/`role`/`automation_id`, y
  cualquier campo desconocido → se guardan en `extensions` (JSON) de la entrada
  o del libro y se re-emiten en export. `use_regex` se **ignora** (matching
  literal siempre); si una entrada solo tiene `use_regex` sin `keys` literales,
  no activa (se advierte en import).

### Superficie de API

Endpoints nuevos (en `character.routes.ts` o un `card.routes.ts`/`lorebook.routes.ts`
nuevo, cableados en `app-container.ts`); todos con Zod y límites.

- **Import de card:**
  - `POST /api/characters/cards/preview` — body `{ format: "json"|"png", payload: string }`
    (`payload` = texto JSON, o base64 del PNG). Devuelve
    `SillyTavernCardPreview` (campos mapeados, tags, creator, nº de entradas de
    lorebook, warnings: «regex ignorado», «timed effects preservados sin
    activar», «imagen ausente»). **No persiste.**
  - `POST /api/characters/cards/import` — body = preview normalizada (o el payload
    crudo). Crea `Character` + `CharacterVersion` + `Lorebook` y devuelve
    `CharacterSummary`. Tamaño limitado; `INVALID_CARD_*` en 400/413.
- **Export a card:**
  - `POST /api/characters/:id/cards/export` — body `{ format: "json"|"png", spec: "v2"|"v3" }`.
    Devuelve JSON (`application/json`) o PNG (`image/png`, descarga). Mapea el
    personaje actual (+ lorebook) a card.
- **Lorebook CRUD/link:**
  - `GET /api/characters/:id/lorebook` → `LorebookDTO` (con entradas).
  - `PUT /api/characters/:id/lorebook` → upsert de ajustes del libro
    (`scanDepth`, `tokenBudget`, `recursiveScanning`, `name`).
  - `POST /api/characters/:id/lorebook/entries` → crea entrada.
  - `PUT /api/characters/:id/lorebook/entries/:entryId` → edita entrada.
  - `DELETE /api/characters/:id/lorebook/entries/:entryId` → elimina.
  - `PUT /api/characters/:id/lorebook/entries` → reordena (array de ids).

DTOs nuevos en `shared/src/types`: `LorebookDTO`, `LorebookEntryDTO`,
`CreateLorebookEntryInput`, `UpdateLorebookEntryInput`,
`SillyTavernCardPreview`, `SillyTavernCardExportInput`. Zod: strings acotados,
arrays de strings, enums (`position`, `spec`, `format`), enteros con `min/max`
(`scanDepth` 0..64, `tokenBudget` 0..100000, `insertionOrder` 0..10000), y
límite de entradas por import (`MAX_LOREBOOK_ENTRIES = 1000`).

### Flujo de UI

- **Import (dialog).** Acepta `.json` y `.png` (detección por extensión + magic
  bytes `89 50 4E 47`). Llama `preview` → muestra nombre, tags, creator, nº de
  entradas de lorebook y warnings; botón «Importar» llama `import`.
- **Export (dialog).** Selector `JSON`/`PNG` y `V2`/`V3` (default V3 con chunk
  `chara` V2 en PNG); descarga con nombre slug.
- **Formulario de personaje.** Nuevas pestañas/campos: `personality`, `scenario`,
  `mes_example`, `alternate_greetings`, `creator_notes` (panel con aviso explícito
  «nunca se envía al modelo»), `tags`, `creator`, `gender`/`pronouns` (chips) y
  `tagline` (display-only).
- **Modal `Crear`.** Pestañas `Personaje` / `Lorebook`; la pestaña Lorebook
  permite crear/editar entradas y queda vinculada al personaje en la creación.
- **Ficheros (500 líneas, aislamiento):** todo bajo `components/character/` para
  no violar el aislamiento de features (el lorebook es conocimiento del
  personaje): `creator-notes-panel.tsx`, `tags-input.tsx`,
  `alternate-greetings-input.tsx`, `gender-pronouns-chips.tsx`,
  `sillytavern-import-dialog.tsx`, `sillytavern-export-dialog.tsx`,
  `lorebook-editor.tsx`, `lorebook-entry-form.tsx`, `use-lorebook.ts`,
  `use-sillytavern-card.ts`. El `character-form.tsx` delega; nada supera 500
  líneas.
- **i18n (ES/EN):** claves `characters.lorebook.*`, `characters.sillytavern.*`,
  `characters.creatorNotes*`, `characters.tags*`, `characters.alternateGreetings*`,
  `characters.gender*`, `characters.pronouns*`, `characters.tagline*`. Neutral
  (tuteo), términos técnicos en inglés (card, lorebook, token, prompt).
- **Accesibilidad/estados vacíos:** labels + `aria-*` en chips y entradas; estados
  vacíos («Sin entradas de lorebook», «Sin tags», «Sin saludos alternativos»);
  foco en el primer campo tras abrir el modal; contadores de caracteres.

### Tabla de seguridad

| Amenaza | Control | Test |
| --- | --- | --- |
| JSON/PNG sobredimensionado | Caps de bytes/tamaño por chunk/nº chunks/JSON decodificado → 413/400 | Fixture grande → rechazo con código correcto. |
| PNG malformado (CRC, longitud, truncado, chunk crítico desconocido) | `zlib.crc32`, validación de longitud y firma, rechazo de críticos desconocidos | Fixtures corruptos → `INVALID_CARD_PNG`. |
| Bomba base64/compresión (IDAT) | Cap de tamaño descomprimido de IDAT | Fixture inflado → rechazo. |
| HTML/script en textos importados | Los campos se renderizan como texto (sin `dangerouslySetInnerHTML`); sanitización en el render | `creator_notes`/tags/personality se muestran como texto plano. |
| ReDoS por regex de usuario | **Sin regex**: matching literal (case + whole-word) | Test de que no hay ruta regex; entrada `use_regex` se ignora. |
| Bomba de recursión del lorebook | Cap `MAX_LOREBOOK_RECURSION_DEPTH = 3` + `token_budget` | Fixture recursivo → parada y presupuesto respetado. |
| Llamadas de red durante import/export | Parseo local puro; placeholder generado en memoria | Aserto de que no hay `fetch`; placeholder sin red. |
| Fuga de secretos en export | El card exporta solo datos del personaje; nunca settings/providers/API keys | Card exportado no contiene claves ni providers. |
| `creator_notes` en el prompt | Excluido del builder/compilador por contrato | Snapshot del prompt sin `creator_notes` (fuga = 0). |

### Política de compatibilidad y legal

- **Clean-room.** Se implementa desde las specs públicas de `chara_card_v2`/
  `chara_card_v3` y del lorebook, **no** copiando código, prompts, UI, assets ni
  tests de SillyTavern. La spec V3 es MIT; SillyTavern es AGPL-3.0 y este repo
  es AGPL-3.0-or-later: licencias compatibles en espíritu, pero la
  implementación se mantiene independiente para no asumir contenido ajeno.
- **Nominativo.** Uso de «compatible con SillyTavern» solo como descripción
  factual; sin logos, marcas ni endoso implícito.
- **Nota en docs.** Este RFC incluye la nota; el slice añade la misma nota corta
  en `README`/docs de usuario al documentar la feature.

### Decisiones pendientes

- **D1 — Supresión del `instructions` nativo ante `system_prompt`.** Por defecto
  se emiten ambos (override después). ¿Debería suprimirse `instructions` nativo
  cuando existe `system_prompt`? Afecta al prompt (paridad y calidad). Se resuelve
  en el gate de aprobación.
- **D2 — Posición exacta del lorebook.** Se propone `lorebook.after` tras `cards`
  y antes de `player` (y `lorebook.before` al inicio). Si el usuario prefiere
  inyectar el lorebook antes de `memories`/`summary`, se ajusta el orden numerado.
- **D3 — Inyección de `gender`/`pronouns` en el prompt.** Se propone display-only
  en S132 (no al prompt) para no alterar la paridad S129; si se quieren inyectar
  como una línea de personalidad, se añade en un slice posterior.

### Riesgos y mitigaciones

- **Superficie de propagación** (16 columnas + 2 tablas nuevas por entidad, DTO,
  repo, use-cases, export/import y UI). Mitigación: mapeo centralizado en
  `toVersion`/DTO y tests de round-trip de repositorio.
- **Paridad de prompt.** Cualquier sección nueva que se emita para caracteres
  existentes rompe snapshots S129. Mitigación: las secciones nuevas solo se
  emiten cuando el dato no está vacío; snapshots S129 como anclas de no-regresión.
- **Fidelidad del lorebook.** El subset (sin regex, sin timed/prob/groups) no es
  1:1 con ST. Mitigación: preservar campos desconocidos y advertir en import;
  documentar el subset.
- **Parseo PNG en casa.** Riesgo de bugs de formato/CRC. Mitigación: fixtures
  sintéticos V2/V3 + round-trip + validación CRC; constantes de tamaño en tests.
- **Colisión de nombres** (`character_version` de ST vs `versionNumber`).
  Mitigación: columna `card_character_version`.
- **Fuga de `creator_notes`.** Mitigación: contrato explícito + snapshot.
- **Redondeo de presupuesto del lorebook.** El estimador `chars/3` es heurístico;
  el presupuesto es informativo. Mitigación: usar el mismo estimador del
  manifiesto; documentar que no es tokenizer real (deferido S133).

### Fuera de alcance

- **Chats/JSONL y CHARX** (excluidos explícitamente del slice).
- Port del prompt por defecto de ST (solo overrides de compatibilidad).
- Regex de usuario, timed effects, probabilidad, grupos, decoradores y
  `vectorized` (preservados, no activados).
- Mensaje `system` post-historia para `post_history_instructions` (se emula al
  final del system prompt; el slot real queda deferred).
- Inyección de `gender`/`pronouns` en el prompt (display-only en S132).
- Tokenizer real por proveedor (S133); el presupuesto del lorebook usa el
  estimador heurístico.
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
3. **Precedencia `ccv3`.** PNG con ambos chunks `chara` (V2) y `ccv3` (V3)
   distintos → importa `ccv3`.
4. **Preservación de desconocidos.** Card con `extensions` y claves top-level
   desconocidas → importar → exportar → las claves reaparecen verbatim
   (`unknown_fields` + `extensions`).
5. **Lorebook — activación y presupuesto.** Fixture de entradas (constante, por
   key, secondary key, selective, before/after, case, whole-word) + mensajes de
   escaneo → verificar incluidas/excluidas, orden por `insertion_order`, sección
   `lorebook.before`/`lorebook.after`, y `overBudget = 0` cuando el presupuesto
   cubre, `overBudget > 0` cuando no.
6. **Recursión.** Lorebook recursivo → inyección respeta `MAX_LOREBOOK_RECURSION_DEPTH = 3`.
7. **Overrides de card.** `system_prompt`/`post_history_instructions` presentes →
   secciones `card-overrides.*` en el orden numerado; vacíos → salida byte a byte
   idéntica a la actual (snapshots S129).
8. **Fuga de `creator_notes`.** Snapshot del `systemPrompt` sin el texto de
   `creator_notes` (fuga = 0).
9. **Paridad send/preview.** Para la misma conversación con lorebook y overrides,
   `get-prompt-context` y `send-message` producen el mismo `systemPrompt`.
10. **Seguridad.** PNG corrupto, chunk sobredimensionado, bomba IDAT, JSON
    sobredimensionado, entrada `use_regex` ignorada, sin `fetch` (aserto).
11. **UI.** Import JSON/PNG con preview + warnings; export JSON/PNG; panel de
    notas del creador, tags, saludos alternativos, chips de género/pronombres;
    modal `Crear` con pestaña Lorebook; estados vacíos.

**Métricas:** `creator_notes` en prompt = 0; round-trip field loss = 0;
`lorebook.overBudget` respetado (0 cuando cabe); paridad send/preview exacta;
snapshots S129 intactos; cero llamadas de red; tamaños/límites rechazados con
código correcto.

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

- [ ] Migración `0019_…` añade las columnas de `character_versions` y las tablas
      `lorebooks`/`lorebook_entries` (snapshot + journal; `db:generate`+
      `db:migrate` correctos; `scripts/package.mjs` copia la carpeta completa).
- [ ] Importa cards V1/V2/V3 desde JSON y PNG (tEXt `chara`/`ccv3`, preferido
      `ccv3`); payload base64 UTF-8 JSON.
- [ ] Exporta V2/V3 en JSON y PNG escribiendo ambos chunks `chara` y `ccv3`.
- [ ] Preserva `extensions` y campos top-level desconocidos (round-trip loss = 0).
- [ ] `CharacterVersion` expone los campos nuevos; entidad/DTO/repo/use-cases
      los propagan; filas existentes quedan `null`/`[]` sin cambio de prompt.
- [ ] `system_prompt` y `post_history_instructions` se inyectan como secciones
      `card-overrides.*` en el orden numerado; vacío = sin sección (paridad S129).
- [ ] `creator_notes` nunca llega al prompt (fuga = 0, snapshot).
- [ ] Lorebook normalizado vinculado al personaje; subset de activación (keys,
      secondary keys, selective, constant, insertion order, position, enabled,
      case, whole words, scan depth, token budget, recursión cap 3) implementado;
      campos ST desconocidos preservados.
- [ ] Paridad send/preview con lorebook + overrides (mismo `systemPrompt`).
- [ ] Endpoints de import preview/commit, export a card y lorebook CRUD/link con
      Zod y límites de tamaño.
- [ ] UI: import JSON/PNG con preview, export JSON/PNG, panel de notas del
      creador, tags, saludos alternativos, chips de género/pronombres, tagline
      display-only, modal `Crear` con pestañas Personaje/Lorebook.
- [ ] Seguridad: límites, sanitización HTML, sin regex de usuario, cap de
      recursión, cap de chunks, sin red, sin secretos, placeholder sin imagen.
- [ ] Nota de compatibilidad/legal (clean-room, nominativo) en el RFC y en
      `README`/docs de usuario.
- [ ] `pnpm check`, `pnpm build` y `pnpm audit --prod` en verde; sin archivos
      >500 líneas; aislamiento de features respetado.

## Red tests

- **Comando:** pendiente (etapa de tests).
- **Fallo esperado:** pendiente.
- **Salida relevante:** pendiente.

## Decisiones

Pendiente de la etapa de implementación. Si cambia el RFC, se explica aquí.

## Verificación

- Tests: pendiente.
- `pnpm check`: pendiente.
- `pnpm build`: pendiente.
- `pnpm audit --prod`: pendiente.
- Release dry-run: pendiente.
- Prueba manual: pendiente.

## Review

- **Estado:** pendiente
- **Informe:** `docs/10-slices/S132-review.md`
- **Bloqueantes resueltos:** pendiente.

## Deferred

Pendiente (nits y no bloqueantes de la etapa de review).

## Commits

Pendiente.
