# S132 — Test plan (handoff para `slice-test-author`)

Contrato: `docs/10-slices/S132-progress.md` (RFC, Aprobado). Este plan fija
nombres/firmas exactos para que el autor de tests y el implementador acuerden.
No re-decide la API. Formato: `docs/10-slices/S130-test-plan.md` / `S131`.

## 1. Scope

Se prueban: migración `0019` + round-trip de repositorio; parser/escritor PNG en
casa (chunks `tEXt` `chara`/`ccv3`, CRC, límites); precedencia `ccv3` y
proyección V2/V3; detección V1 y política de campos vacíos; mapeo card↔entidad y
round-trip de campos desconocidos (`extensions`/`unknown_fields`/
`unknown_root_fields`); activación de lorebook (match literal, `selective_logic`
0..3, presupuesto/trim, `scan_depth`, recursión, decoradores, posición); overrides
de card con paridad S129; paridad send/preview; endpoints de card/lorebook +
Zod/límites; export interno sección `lorebook`; contrato mínimo de UI.

**NO se prueba (fuera de alcance):** M1 (macros) — **no aprobado**; no se
planifican tests de expansión de macros (ver §7 flag M1); chats/JSONL y CHARX;
port del prompt por defecto de ST; regex de usuario / timed effects / probabilidad
/ grupos / `vectorized` (solo se verifica que **se preservan y no se activan**);
`scanDepth` per-entry (preservado, no activado); inyección de `gender`/`pronouns`
en prompt (display-only en S132); tokenizer real por proveedor (se usa el
estimador heurístico existente); renderizado HTML/Markdown rico (todo texto plano).

## 2. Contrato a fijar

### Shared types — `packages/shared/src/types/sillytavern-card.ts` (nuevo)

```ts
export type SillyTavernCardSpec = "chara_card_v2" | "chara_card_v3"
export type SillyTavernLorebookSpec = "lorebook_v3"
export type SillyTavernCardFormat = "json" | "png"
export type SillyTavernCardExportSpec = "v2" | "v3"
export type LorebookExportFormat = "ccv3" | "st-native"

export interface CharaCardDataV2 { /* name, description, personality?, scenario?, first_mes, mes_example?, alternate_greetings?, creator_notes?, tags?, creator?, character_version?, system_prompt?, post_history_instructions?, character_book?, extensions? */ }
export interface CharaCardDataV3 extends CharaCardDataV2 { /* + assets?, nickname?, group_only_greetings?, … */ }
export interface SillyTavernCardEnvelope { spec: SillyTavernCardSpec; spec_version?: string; data: Record<string, unknown> }

export interface SillyTavernCardPreview {
  name: string
  description: string
  tags: string[]
  creator: string | null
  lorebookEntryCount: number
  cardVersion: "v1" | "v2" | "v3"
  warnings: SillyTavernCardWarning[]
}
export type SillyTavernCardWarning =
  | "REGEX_IGNORED" | "TIMED_EFFECTS_PRESERVED" | "IMAGE_ABSENT"
  | "V1_CARD" | "EMPTY_DESCRIPTION" | "EMPTY_GREETING"
  | "UNSUPPORTED_FIELDS_PRESERVED" | "SCAN_DEPTH_PER_ENTRY_IGNORED"

export interface SillyTavernCardExportInput { format: SillyTavernCardFormat; spec: SillyTavernCardExportSpec }

export interface LorebookDTO { id: string; characterId: string; name: string | null; description: string | null; scanDepth: number; tokenBudget: number; recursiveScanning: boolean; extensions: unknown; unknownFields: unknown; entries: LorebookEntryDTO[] }
export interface LorebookEntryDTO { id: string; name: string | null; sourceId: string | null; keys: string[]; secondaryKeys: string[]; comment: string | null; content: string; constant: boolean; selective: boolean; selectiveLogic: 0|1|2|3; insertionOrder: number; position: "before_char"|"after_char"; rawPosition: string | null; priority: number; enabled: boolean; caseSensitive: boolean; wholeWords: boolean; order: number; extensions: unknown; unknownFields: unknown }
export interface CreateLorebookEntryInput { /* keys, secondaryKeys?, content, comment?, constant?, selective?, selectiveLogic?, insertionOrder?, position?, priority?, enabled?, caseSensitive?, wholeWords? */ }
export interface UpdateLorebookEntryInput extends Partial<CreateLorebookEntryInput> { id?: string }
export interface LorebookPreview { detectedShape: "ccv3" | "st-native"; entryCount: number; warnings: SillyTavernCardWarning[] }

export type SillyTavernCardErrorCode =
  | "INVALID_CARD_NAME" | "INVALID_CARD_PNG" | "INVALID_CARD_JSON"
  | "INVALID_CARD_FIELD_TOO_LARGE" | "LOREBOOK_ALREADY_EXISTS" | "LOREBOOK_NOT_FOUND"
```

Re-export desde `src/index.ts`. Import primario en tests: subpath
`@workspace/shared/types/sillytavern-card`. `CharacterVersionDTO` gana los campos
nuevos opcionales (`personality?`, `scenario?`, `mesExample?`, `alternateGreetings?`,
`creatorNotes?`, `tags?`, `creator?`, `cardCharacterVersion?`, `gender?`,
`pronouns?`, `tagline?`, `systemPrompt?`, `postHistoryInstructions?`,
`extensions?`, `unknownFields?`, `unknownRootFields?`). `CreateCharacterInput` gana
`lorebook?: { format: LorebookExportFormat; payload: string }`. `CharacterExport`
gana `lorebook?: LorebookDTO`; `ExportSection` gana `"lorebook"` con
`EXPORT_SECTION_PARENTS["lorebook"] = "definition"`.

### Shared lib (puro, sin `node:zlib`) — `packages/shared/src/lib/sillytavern-card.ts`

```ts
export const MAX_PROMPT_FIELD_CHARS = 20_000
export const MAX_LOREBOOK_ENTRIES = 1_000

export function detectSillyTavernShape(root: unknown):
  | { shape: "card"; spec: "chara_card_v2" | "chara_card_v3" }
  | { shape: "lorebook_ccv3" }
  | { shape: "lorebook_st_native"; container: "object" | "array" }
  | { shape: "v1" }
  | { shape: "unknown" }

export function stripDecorators(content: string): string
// elimina líneas que empiezan por "@@"/"@@@" de la copia; no toca el original.

export function projectCardToV2(data: Record<string, unknown>): Record<string, unknown>
// omite assets/nickname/group_only_greetings/creator_notes_multilingual/source/fechas
// y campos V3-only de entradas de character_book; conserva extensions verbatim.

export function validateCardFieldSize(data: Record<string, unknown>): { ok: true } | { ok: false; field: string }
```

### Shared lib (puro) — `packages/shared/src/lib/lorebook-activation.ts`

```ts
export const MAX_LOREBOOK_RECURSION_DEPTH = 3

export function matchesKey(text: string, key: string, opts: { caseSensitive: boolean; wholeWords: boolean }): boolean
export function selectiveLogicActive(selectiveLogic: 0|1|2|3, matchedSecondaries: number, totalSecondaries: number): boolean

/** Plain structural type: shared must NOT import backend domain entities. */
export interface LorebookActivationEntry {
  id: string
  keys: string[]
  secondaryKeys: string[]
  content: string
  constant: boolean
  selective: boolean
  selectiveLogic: 0|1|2|3
  insertionOrder: number
  priority: number
  enabled: boolean
  caseSensitive: boolean
  wholeWords: boolean
  useRegex: boolean
  order: number
  position: "before_char"|"after_char"
}
export interface LorebookActivationInput {
  entries: LorebookActivationEntry[]
  scanText: string
  tokenBudget: number
  recursiveScanning?: boolean
}
export interface LorebookActivationResult {
  included: LorebookActivationEntry[]
  overBudgetCount: number
  skipped: number
}
export function activateLorebookEntries(input: LorebookActivationInput): LorebookActivationResult
```

El backend mapea `LorebookEntry` (entidad de dominio) a
`LorebookActivationEntry` antes de llamar al helper; `shared/` no importa
`domain/`. `useRegex` se extrae de `unknownFields.use_regex`/`useRegex` en ese
mapeo. `activateLorebookEntries` implementa: content vacío → nunca; `enabled=false` →
excluida; `use_regex` (en `unknownFields`) → no auto-activa; `constant` → siempre;
`selective`/`selective_logic` según tabla de verdad; orden por `insertionOrder` asc
(desempate `order`); trim por `priority` desc → `insertionOrder` asc hasta
`tokenBudget` (`0` = sin límite); recursión cap 3 (re-scan solo del contenido
inyectado, sin duplicar). Determinista y puro (el servicio de backend lo alimenta
con el `scanText` ya calculado). `position` before/after se resuelve en el builder.

### Entidades de dominio — `packages/backend/src/domain/entities/lorebook.entity.ts` + `lorebook-entry.entity.ts` (nuevos)

`Lorebook` (`create`/`reconstruct`, getters: `id`, `characterId`, `name`,
`description`, `scanDepth`, `tokenBudget`, `recursiveScanning`, `extensions`,
`unknownFields`, `createdAt`, `updatedAt`). `LorebookEntry` (getters `id`,
`lorebookId`, `name`, `sourceId`, `keys`, `secondaryKeys`, `comment`, `content`,
`constant`, `selective`, `selectiveLogic`, `insertionOrder`, `position`,
`rawPosition`, `priority`, `enabled`, `caseSensitive`, `wholeWords`, `order`,
`extensions`, `unknownFields`, `createdAt`, `updatedAt`). Invariantes: `content`
string (puede ser vacío), `keys`/`secondaryKeys` string[], `position` ∈
`before_char|after_char`, `selectiveLogic` 0..3, `scanDepth`/`tokenBudget` ≥ 0.

`CharacterVersion` (existente) gana getters: `personality`, `scenario`,
`mesExample`, `alternateGreetings` (string[]), `creatorNotes`, `tags` (string[]),
`creator`, `cardCharacterVersion`, `gender`, `pronouns`, `tagline`, `systemPrompt`,
`postHistoryInstructions`, `extensions`, `unknownFields`, `unknownRootFields`
(todos `null`/`[]` por defecto; **no** relajan el invariante `description`/`greeting`
no vacíos). `CharacterVersionProps` gana esos campos opcionales.

### Puerto — `packages/backend/src/domain/ports/lorebook.repository.ts` (nuevo)

```ts
export interface LorebookRepository {
  findByCharacterId(characterId: string): Promise<{ book: Lorebook; entries: LorebookEntry[] } | null>
  upsertBook(book: Lorebook): Promise<Lorebook>
  createEntry(entry: LorebookEntry): Promise<LorebookEntry>
  updateEntry(entry: LorebookEntry): Promise<LorebookEntry>
  deleteEntry(entryId: string): Promise<void>
  reorderEntries(entryIds: string[]): Promise<void>
  replaceBook(book: Lorebook, entries: LorebookEntry[]): Promise<void>  // transacción: delete + insert
}
```

`CharacterRepository` (existente) se amplía: `toVersion` lee/escribe los 16 campos
nuevos en `createWithFirstVersion`/`saveVersion`/`findVersionById`/
`findVersionsByCharacterId`. `ConversationContextLoaderDeps` gana
`lorebookRepository`; `ConversationContextLoadResult` gana `lorebook` +
`lorebookEntries`.

### Backend PNG adapter — `packages/backend/src/infrastructure/adapters/secondary/sillytavern/png-card.adapter.ts` (nuevo; usa `node:zlib`)

```ts
export const MAX_CARD_JSON_BYTES = 5 * 1024 * 1024
export const MAX_CARD_PNG_BYTES = 10 * 1024 * 1024
export const MAX_PNG_CHUNKS = 512
export const MAX_TEXT_CHUNK_BYTES = 8 * 1024 * 1024
export const MAX_DECODED_CARD_JSON_BYTES = 5 * 1024 * 1024
export const MAX_IDAT_DECOMPRESSED_BYTES = 50 * 1024 * 1024

export interface PngCardLimits { /* = los 6 caps, inyectables para tests */ }

export function parseCardPng(buffer: Buffer, limits?: Partial<PngCardLimits>): { cardJson: string; imageBuffer: Buffer | null }
export function buildCardPng(input: { charaJson?: string; ccv3Json?: string; imagePng?: Buffer | null }, limits?: Partial<PngCardLimits>): Buffer
```

`parseCardPng` lanza `DomainError("INVALID_CARD_PNG", …)` en firma/chunk crítico/
CRC/longitud/base64 inválida/caps superados/IHDR·IEND ausentes. `ccv3` gana sobre
`chara`; duplicados del mismo keyword → gana el último; `IDAT` múltiple se concatena
antes de inflate; `acTL`/`fcTL`/`fdAT`/chunks auxiliares ignorados. **Contract a
confirmar:** `limits` inyectable es lo que permite testear caps sin fabricar 10 MiB.

### Backend application (use cases + mappers + servicio)

- `application/use-cases/character/sillytavern-card.mapper.ts` (puro): `cardDataToVersionFields(data)`, `versionFieldsToCardData(version, lorebook)` — mapeo de la tabla de campos, política de vacíos (name→`INVALID_CARD_NAME`, description→fallback+`EMPTY_DESCRIPTION`, first_mes→`alternate_greetings[0]` o fallback+`EMPTY_GREETING`), `unknownFields`/`unknownRootFields` verbatim.
- `application/use-cases/character/import-sillytavern-card.use-case.ts` — `execute({ format, payload }): Promise<CharacterSummary>` (crea Character+Version+Lorebook en una transacción).
- `application/use-cases/character/preview-sillytavern-card.use-case.ts` — `execute({ format, payload }): Promise<SillyTavernCardPreview>` (**no persiste**).
- `application/use-cases/character/export-sillytavern-card.use-case.ts` — `execute({ characterId, format, spec }): Promise<{ format: "json"; body: unknown } | { format: "png"; body: Buffer }>`.
- `application/use-cases/character/lorebook/import-lorebook.use-case.ts`, `export-lorebook.use-case.ts`, `get-lorebook.use-case.ts`, `update-lorebook.use-case.ts`, `create-lorebook-entry.use-case.ts`, `update-lorebook-entry.use-case.ts`, `delete-lorebook-entry.use-case.ts`, `reorder-lorebook-entries.use-case.ts`, `preview-lorebook.use-case.ts` (o un `lorebook.use-case.ts` único si el implementador lo prefiere — **contract a confirmar** la granularidad; los endpoints son los del RFC §Superficie de API).
- `application/services/lorebook-activation.service.ts` — carga libro+entradas, calcula `scanText` (últimos `scan_depth` mensajes user+assistant, incluido el pendiente; `0` → solo `constant`), llama al helper puro y devuelve `{ before: LorebookEntry[], after: LorebookEntry[], overBudgetCount }`.

### Backend infra rutas — `sillytavern-card.routes.ts` + `lorebook.routes.ts` (nuevos)

Montadas **antes** de `/characters/:id`. `express.json({ limit: "15mb" })` local.
Schemas Zod: `SillyTavernCardPreviewSchema`/`ImportSchema` (`{ format: enum(["json","png"]), payload: string }`),
`SillyTavernCardExportSchema` (`{ format, spec: enum(["v2","v3"]) }`),
`LorebookImportSchema` (`{ format: enum(["json"]), payload, replace?: boolean }`),
`LorebookExportSchema` (`{ format: enum(["ccv3","st-native"]) }`),
`LorebookSettingsSchema` (`name/description/scanDepth 0..64/tokenBudget 0..100000/recursiveScanning`),
`LorebookEntrySchema` (`selectiveLogic` 0..3, `insertionOrder` 0..10000, `priority` −10000..10000, `position` enum), límite `MAX_LOREBOOK_ENTRIES` en import.

### Frontend

- `packages/frontend/src/lib/api/sillytavern-card.ts` (puro): `previewSillyTavernCard`, `importSillyTavernCard`, `exportSillyTavernCard`.
- `packages/frontend/src/lib/api/lorebook.ts` (puro): `getLorebook`, `updateLorebook`, `createLorebookEntry`, `updateLorebookEntry`, `deleteLorebookEntry`, `reorderLorebookEntries`, `importLorebook`, `exportLorebook`, `previewLorebook`.
- Componentes bajo `components/character/`: `sillytavern-import-dialog.tsx`, `sillytavern-export-dialog.tsx`, `lorebook-editor.tsx`, `lorebook-entry-form.tsx`, `lorebook-import-dialog.tsx`, `lorebook-export-dialog.tsx`, `creator-notes-panel.tsx`, `tags-input.tsx`, `alternate-greetings-input.tsx`, `gender-pronouns-chips.tsx`, hooks `use-lorebook.ts` / `use-sillytavern-card.ts`. Detección PNG por extensión + magic bytes `89 50 4E 47`.

### Compilador / builder (cambios)

`PromptContextBuilderImpl` y `ContextCompiler` ganan: `lorebook` (before/after),
`card-overrides.post-history`, y la sustitución del bloque de persona. `buildWithSections`
añade secciones `lorebook.before`, `lorebook.after`, `card-overrides.post-history`;
`character` incorpora `personality`/`scenario`/`mes_example`/`system_prompt`. Nuevas
claves i18n (ES/EN) — **contract a confirmar los nombres**: `prompt.scenario`,
`prompt.systemPromptOverride` (o similar), `prompt.postHistoryInstructions`. Los
snapshots S129 existentes son el ancla de no-regresión.

## 3. Matriz por área

Columna AC = criterio de aceptación del RFC; `(n)` = eval fixture nº n.

| # | Área / AC | Fichero (runner) | Qué demuestra | Aserciones clave |
| --- | --- | --- | --- | --- |
| 1 | Migración 0019 + round-trip | `.../drizzle/repositories/drizzle-character.repository.test.ts` (nuevo; backend) | 16 columnas nuevas persisten y vuelven a leer | `CharacterVersion.create({ ...personality, scenario, mesExample, systemPrompt, extensions:{...}, unknownFields:{...}, unknownRootFields:{...}, ... })` → `saveVersion` → `findVersionById` devuelve cada getter igual; fila legacy (sin campos) → `null`/`[]` |
| 2 | Migración 0019 + lorebook | `.../drizzle/repositories/drizzle-lorebook.repository.test.ts` (nuevo; backend) | tablas `lorebooks`/`lorebook_entries`, `UNIQUE(character_id)`, cascade | `upsertBook`+`createEntry`×N → `findByCharacterId` orden por `order`; segundo `upsertBook` mismo character → conflicto (o replace); `deleteCharacter` → libro+entradas desaparecen (cascade) |
| 3 | Journal/snapshot | `.../drizzle/repositories/drizzle-lorebook.repository.test.ts` (o test de migración dedicado) | migración registrada y empaquetable | `_journal.json` tiene entrada `idx:19, version:"6", breakpoints:true`; existe `0019_*.sql` + `0019_snapshot.json`; `runMigrations(db)` no lanza |
| 4 | PNG V2/V3 round-trip (2) | `.../secondary/sillytavern/png-card.adapter.test.ts` (nuevo; backend) | parse y build de `chara`/`ccv3`, base64 UTF-8 JSON | `parseCardPng(buildCardPng({charaJson, ccv3Json}))` → `cardJson` = JSON correcto; re-parse de un PNG sintético con `IDAT` 1×1 decodifica imagen |
| 5 | ccv3 precedence (4) | mismo | ambos chunks distintos → gana `ccv3` | `parseCardPng(png)` → `cardJson` = payload `ccv3`, no `chara` |
| 6 | Duplicados last-wins (5) | mismo | dos `tEXt` `chara` → gana el último | `cardJson` = payload del 2º chunk, sin error |
| 7 | Múltiples IDAT (6) | mismo | dos `IDAT` se concatenan antes de inflate | imagen descomprimida = concatenación correcta (comparar con el PNG de 1 solo IDAT) |
| 8 | APNG base frame | mismo | `acTL`/`fcTL`/`fdAT` ignorados | `imageBuffer` = frame base (`IDAT`), no vacío |
| 9 | PNG malformado (18) | mismo | rechazo determinista | firma incorrecta / chunk crítico desconocido (bit ancillario 0) / CRC malo / longitud inconsistente / `IHDR`·`IEND` ausentes / truncado → `DomainError("INVALID_CARD_PNG")` |
| 10 | base64 inválida | mismo | payload no-base64 rechazado | `tEXt` con padding malo o alfabeto no válido → `INVALID_CARD_PNG` (o `INVALID_CARD_JSON`) |
| 11 | Límites de tamaño (18) | mismo (con `limits` inyectados) | caps de bytes/chunks/JSON/IDAT | `MAX_CARD_PNG_BYTES`+1, `MAX_TEXT_CHUNK_BYTES`+1, `MAX_DECODED_CARD_JSON_BYTES`+1, IDAT inflado > `MAX_IDAT_DECOMPRESSED_BYTES` (bomba), nº chunks > `MAX_PNG_CHUNKS` → rechazo con código correcto |
| 12 | Placeholder + sin red (18) | mismo | export sin imagen y cero `fetch` | `buildCardPng({charaJson, ccv3Json, imagePng: null})` produce PNG válido con ambos chunks e `IDAT` 1×1 RGBA; spy `globalThis.fetch` nunca llamado (también en parse) |
| 13 | Proyección V2 + dual chunks (3) | `sillytavern-card.mapper.test.ts` (backend) + adapter | export V3: `ccv3`=V3 completo, `chara`=V2 sin campos V3-only | `projectCardToV2(data)` omite `assets`/`nickname`/`group_only_greetings`/`creator_notes_multilingual`/`source`/fechas y campos V3-only del `character_book`; `extensions` intacto; V2 export: `chara`=V2, `ccv3`=V3 |
| 14 | Round-trip de desconocidos (17) | mapper + import/export use case (backend) | `extensions`/`unknown_fields`/`unknown_root_fields` por separado, loss=0 | card con `extensions`, keys V3 de `data` y keys de raíz desconocidas + entradas con decoradores/probabilidad/timed → import→export → reaparecen verbatim y en el bucket correcto |
| 15 | Detección V1 (7) | `sillytavern-card.mapper.test.ts` | V1 plano → mapea; raíz desconocida → `unknown_root_fields`; no export V1 | `detectSillyTavernShape({name, description, personality, first_mes})` → `{shape:"v1"}`; mapeo V1 de la tabla |
| 16 | Política de vacíos (8) | mapper + import use case | name→rechazo, description/first_mes→fallback+warning | `name` `""` → `INVALID_CARD_NAME`; `description` `"  "` → `DEFAULT_CARD_DESCRIPTION` + warning `EMPTY_DESCRIPTION`; `first_mes` vacío + `alternate_greetings[0]` → ese saludo y se retira de la lista; sin alternativas → fallback + `EMPTY_GREETING`; entidad no lanza |
| 17 | Campo sobredimensionado (16) | mapper (`validateCardFieldSize`) | cap `MAX_PROMPT_FIELD_CHARS` sin truncado | campo (`system_prompt` etc.) de 20 001 chars → `{ok:false, field:"system_prompt"}` → use case lanza `INVALID_CARD_FIELD_TOO_LARGE` |
| 18 | Match literal de keys | `packages/backend/src/application/services/lorebook-activation.test.ts` (backend; importa `@workspace/shared/lib/lorebook-activation`) | substring, case-sensitivity, whole-word | `matchesKey("A dragon", "dragon", {caseSensitive:false})` true; `caseSensitive:true` false; `wholeWords` true → "dragonfly" no matchea "dragon" |
| 19 | selective_logic 0..3 (10) | mismo | tabla de verdad completa | con `P`: (0, m≥1)→activa; (1, m<n)→activa; (2, m==0)→activa; (3, m==n)→activa; contraparte falsa de cada uno → no activa |
| 20 | selective/constant/vacío (10) | mismo | reglas de activación | `selective=false` ignora `secondary_keys` (activa por `P`); `secondary_keys=[]` con `selective=true` → cae a `P`; `constant=true` activa siempre (ignora keys/selective); `content=""` nunca inyecta; `enabled=false` excluida |
| 21 | `use_regex` ignorado (18) | mismo | sin ruta de regex | entrada con `useRegex:true` en `unknownFields` → nunca auto-activa, **ni con `constant:true`** (se preserva en export) |
| 22 | Posición y `raw_position` | mapper + activation | numérico 0..6 → before/after; verbatim conservado | `0`→before, `1`→after, `2/3/4`→after (warning), `5`→before, `6`→after; `rawPosition` = valor original; export re-emite el valor original |
| 23 | Presupuesto + orden (11) | activation + servicio | trim por `priority` desc; orden `insertionOrder` asc | fixture con sobre-presupuesto → `included` ordenados por `insertionOrder` asc; descartadas = menor `priority`; `overBudgetCount > 0`; caben → `overBudgetCount === 0`; `tokenBudget: 0` → nada se descarta |
| 24 | scan_depth (11) | servicio (`lorebook-activation.service.test.ts`) | nivel libro; 0 desactiva; per-entry preservado | `scan_depth=2` escanea solo 2 últimos mensajes; `0` → solo `constant` sobrevive en el escaneo inicial; `scan_depth=0` + `recursive_scanning=1` → la recursión sí activa desde el contenido `constant` inyectado; `scanDepth` en `unknownFields` de entrada no cambia el resultado (preservado) |
| 25 | Recursión cap 3 (12) | activation | parada y sin duplicados | cadena A→B→C→A con keys que se activan → profundidad ≤ `MAX_LOREBOOK_RECURSION_DEPTH`; contenido no duplicado; respeta presupuesto |
| 26 | Decoradores (11) | activation (`stripDecorators`) | `@@` eliminado de la copia, conservado en content/export | `content = "@@depth 4\nTexto"` → inyecta solo `Texto`; el `content` guardado/exportado mantiene `@@depth 4` |
| 27 | Override system_prompt + paridad S129 (13) | `prompt-context-builder.impl.test.ts` (nuevo/extend, backend) | reemplaza solo bloque de persona, conserva scaffolding | sin `system_prompt` → `systemPrompt` byte-idéntico al snapshot actual; con `system_prompt` → no aparecen `prompt.roleplay`/`roleplayFiction`/`roleplayStayInCharacter`/`roleplayMature`, sí `roleplayUserAgency`/`roleplayLanguage`/`roleplayLength`, sí `instructions` nativo, y el texto de `system_prompt` tras label |
| 28 | post_history + posiciones (13) | mismo | `post_history_instructions` al final; `personality`/`scenario`/`mes_example` en su sitio; vacío=ausente | con `post_history_instructions` → sección final `card-overrides.post-history`; `personality` tras `## Personality`, `scenario` etiquetado, `mes_example` tras saludo de ejemplo; todos vacíos/whitespace → byte-idéntico a actual |
| 29 | creator_notes fuga=0 (14) | mismo | nunca en prompt | snapshot con `creatorNotes` no vacío → `systemPrompt` no contiene su texto (buscar substring exacto) |
| 30 | Macros verbatim (M1 no aprobado) | mismo | no hay expansión | `system_prompt = "Hola {{char}} y {{user}} y {{otro}}"` → `systemPrompt` contiene `{{char}}`/`{{user}}`/`{{otro}}` literales (un solo test; documentar limitación) |
| 31 | Paridad send/preview (15) | `get-prompt-context.parity.test.ts` (extend) | mismo `systemPrompt` con lorebook + overrides | conversación con `system_prompt`, `post_history_instructions` y lorebook activo → `preview.systemPrompt === send.context.systemPrompt` y `manifest` igual (fixtures con `CharacterVersion` extendido y `lorebookRepository` mock) |
| 32 | Export interno sección `lorebook` | `export-character.use-case.test.ts` + `import-character.use-case.test.ts` (extend) | sección hija de `definition`; compat | seleccionar `definition`+`lorebook` → `payload.lorebook` presente; `lorebook` sin `definition` → `INVALID_EXPORT_SELECTION`; export viejo (sin `lorebook`) importa sin libro; payload nuevo con `lorebook` → crea lorebook |
| 33 | Endpoints card (19) | `sillytavern-card.routes.test.ts` (nuevo, supertest) | preview/import/export JSON+PNG + códigos de error | `POST /api/characters/cards/preview` → `SillyTavernCardPreview` (sin persistir, spy `createCharacter` no llamado); `POST /api/characters/cards/import` → 201 `CharacterSummary` + personaje con lorebook; `POST /api/characters/:id/cards/export` → JSON/PNG; payload `name` vacío → 400 `INVALID_CARD_NAME` |
| 34 | Endpoints lorebook (19) | `lorebook.routes.test.ts` (nuevo, supertest) | standalone + CRUD + códigos | `POST /api/lorebooks/preview` detecta CCv3/ST nativo (objeto y array); `GET .../lorebook` sin libro → 404 `LOREBOOK_NOT_FOUND`; `POST .../lorebook/import` sin `replace` sobre existente → 409 `LOREBOOK_ALREADY_EXISTS`; `replace:true` reemplaza; CRUD entries; reorder |
| 35 | CreateCharacter con lorebook | `create-character.use-case.test.ts` (extend) + route | transacción personaje+versión+libro | `CreateCharacterInput.lorebook = {format:"ccv3", payload}` → crea los tres; spy `lorebookRepository.replaceBook`/`upsertBook` llamado; `lorebook` ausente → no crea libro |
| 36 | Zod + límites + orden de rutas | routes (33/34) | validación y montaje | `selectiveLogic:4`/`position:"x"`/`scanDepth:65`/`tokenBudget:100001`/`priority:-10001` → 400; > `MAX_LOREBOOK_ENTRIES` entradas → 400/413; rutas card/lorebook registradas antes de `/characters/:id` (aserto de que `GET /api/characters/cards/…` no cae en `:id`) |
| 37 | UI import/export card | `components/character/sillytavern-import-dialog.test.tsx` + `sillytavern-export-dialog.test.tsx` (RTL) | detección, preview, reenvío crudo, export | `.png` detectado por magic bytes → `previewSillyTavernCard` llamado; preview muestra name/tags/creator/nº entradas/warnings; «Importar» llama `importSillyTavernCard` con el payload crudo (no el preview); export con `{format:"png", spec:"v3"}` → `exportSillyTavernCard` llamado |
| 38 | UI panel/notas/chips | `components/character/creator-notes-panel.test.tsx` + `tags-input.test.tsx` + `gender-pronouns-chips.test.tsx` (RTL) | display-only + aviso | `creator-notes-panel` muestra el aviso «nunca se envía al modelo»; tags/saludos alternativos editables como chips; `gender`/`pronouns`/`tagline` solo lectura |
| 39 | UI modal Crear + editor lorebook | `components/character/character-form.test.tsx` (nuevo/extend; no existe hoy) + `lorebook-editor.test.tsx` (RTL) | pestañas Personaje/Lorebook + `/characters/new` | modal `Crear` con pestañas; pestaña Lorebook crea/edita/importa entradas y guarda en `CreateCharacterInput.lorebook`; estados vacíos; `/characters/new` sigue abriendo el formulario |

## 4. Fixtures (deterministas, sin red, en memoria)

- **Cards JSON sintéticas** (builders puros): `buildV2Card(overrides)`, `buildV3Card(overrides)`, `buildV1Card(overrides)` — cubren `data` completa (incl. `character_book`, `extensions`, keys V3-only), política de vacíos y desconocidos. Reutilizar para mapper, use cases y round-trip.
- **PNG sintético** (`buildCardPngFixture`, solo backend, `node:zlib`): firma + `IHDR` + N×`tEXt` (`chara`/`ccv3`, opcional corrupto CRC/longitud) + 1–2×`IDAT` (1×1 RGBA deflateado) + `IEND`; helpers `corruptCrc`, `dropIend`, `inflateBombIdat`. No archivos grandes; caps vía `limits` inyectados.
- **Lorebook standalone** (`buildLorebookCCv3(entries)`, `buildLorebookStNativeObject(entries)` keyed-by-uid, `buildLorebookStNativeArray(entries)`), y `buildLorebookEntry(overrides)` con keys/secondary/selective/selectiveLogic/position/priority/decorators/unknownFields.
- **Recursión**: `buildRecursionFixture()` — entradas A→B→C→A vía keys.
- **Snapshot de prompt**: reutilizar builders de `get-prompt-context.parity.test.ts` (`buildConversation`, `buildMessage`, `buildRepos`) y añadir `buildVersionWithCardFields(overrides)` (CharacterVersion con `systemPrompt`/`postHistoryInstructions`/`personality`/`scenario`/`mesExample`/`creatorNotes`). `buildRepos` gana `lorebookRepository` mock.
- **Campos sobredimensionados**: `"x".repeat(20_001)` en un campo de prompt.
- **Fixture `cardWithUnknownFields`**: `extensions`, `data` con `assets`/`nickname`/`group_only_greetings`, raíz con key extra, entradas con `probability`/`cooldown`/`use_regex`/decoradores → round-trip loss=0.

## 5. Comandos

- `pnpm --filter @workspace/backend test` — dominio, use cases, servicios, adaptadores, repos, rutas.
- `pnpm --filter @workspace/backend eval` — snapshots de ensamblado/contexto (fixtures legacy/raw; **relevante**: verifica que los snapshots S129 no cambian).
- `pnpm --filter @workspace/frontend exec vitest run` — componentes.
- `pnpm check` (arch + typecheck + lint), `pnpm build`.
- No correr `@workspace/shared test`: los helpers de shared se prueban desde backend vitest importando `@workspace/shared`.

## 6. Estrategia de mocking

- Helpers puros (`sillytavern-card.ts`, `lorebook-activation.ts`, `stripDecorators`) sin mocks, side-effect-free. Backend vitest importa `@workspace/shared` (subpaths).
- PNG adapter: `node:zlib` real (determinista), **sin `fetch`**; spy `globalThis.fetch = vi.fn()` para asertar cero llamadas (nunca debe definirse otro valor).
- Use cases: inyectar repos fake reutilizando `buildRepos`/`buildCharacterRepo` de `get-prompt-context` tests; `lorebookRepository` fake nuevo; asertar `createCharacter`/`upsertBook` no llamados en preview.
- Repositorio/migración: patrón de `drizzle-conversation.repository.test.ts` (`mkdtempSync` + `buildDatabase` + `runMigrations`).
- Frontend: mock de `@/lib/api/sillytavern-card` / `@/lib/api/lorebook` vía `vi.hoisted` (patrón existente en `import-character-dialog.test.tsx`); RTL, `jsdom`.
- Sin `vi.useFakeTimers`, sin red, sin `fetch` real, sin dependencias nuevas.

## 7. Decisiones del orquestador para desbloquear los flags

Estas decisiones son contrato para test-author e implementer; no se re-deciden.

1. **D1 — bloque de persona vs scaffolding (flag 1).** No se reordena nada. Sin
   `system_prompt`, la salida debe ser byte-idéntica a hoy. Con `system_prompt`, se
   **eliminan en su sitio** las cuatro líneas de persona (`prompt.roleplay`,
   `roleplayFiction`, `roleplayStayInCharacter`, `roleplayMature`) y se inserta el
   label + `system_prompt` en la posición de la primera de ellas. El scaffolding
   (`roleplayUserAgency`, `roleplayLanguage`, `roleplayLength`) permanece en su
   posición relativa actual. Así el resultado es: `system_prompt`, userAgency,
   language, length (y el resto del bloque `character` sin cambios).
2. **Labels `## Personality` / `Name:` (flag 2).** El label
   `prompt.personality` y `prompt.name` siguen siendo **incondicionales** (como
   hoy). Solo el **contenido** de `personality` es condicional. No cambiar el
   snapshot S129.
3. **Claves i18n (flag 3).** Nombres fijados:
   - `prompt.scenario` → `"## Scenario"` / `"## Escenario"`.
   - `prompt.systemPrompt` → `"## Character system prompt"` /
     `"## Prompt de sistema del personaje"`.
   - `prompt.postHistoryInstructions` → `"## Post-history instructions"` /
     `"## Instrucciones posteriores al historial"`.
   Los tests pueden importar `translate` y comparar con la clave, o congelar los
   literales; el implementador debe añadirlas en `en.ts` y `es.ts`.
4. **`limits` inyectables (flag 4).** Se aceptan `limits?: Partial<PngCardLimits>`
   en `parseCardPng`/`buildCardPng`; los defaults son las constantes del RFC.
5. **Unknown fields (flag 5).** DTO: `unknown` (verbatim); dominio: `unknown`;
   tests comparan por `JSON.parse`/`toEqual` profundo. No validar la forma interna.
6. **Sección `lorebook` (flag 6).** Se mantiene hija de `definition`, como fija el
   RFC. `lorebook` sin `definition` → `INVALID_EXPORT_SELECTION` (código existente).
7. **Use cases de lorebook (flag 7).** La granularidad interna es libre; los tests
   de API se escriben contra endpoints. Los tests de use case pueden cubrir los
   mínimos: import/export/get/update + CRUD de entradas.
8. **Base64 inválida (flag 8).** Cualquier fallo al decodificar el payload de un
   `tEXt` (`chara`/`ccv3`) es `INVALID_CARD_PNG`. `INVALID_CARD_JSON` queda para
   JSON de entrada con sintaxis/forma inválida (no para el chunk PNG).
9. **`scan_depth=0` + `recursive_scanning=1` (flag 9).** `scan_depth=0` desactiva
   el escaneo inicial del chat: solo las entradas `constant` se inyectan de
   entrada. La recursión **sí** sigue operando sobre el contenido ya inyectado, así
   que una entrada `constant` puede activar otras por recursión. Añadir este caso
   al test 24.
10. **`constant` + `use_regex`.** `use_regex=true` no auto-activa ni siquiera con
    `constant=true` (la spec dice que `constant` se ignora con regex). Añadirlo al
    test 21.
11. **`upsertBook` (test 2).** `upsertBook` sobre un personaje con libro existente
    **actualiza** el libro (no duplica); un INSERT directo duplicado choca con el
    `UNIQUE`. `replaceBook` es el camino de import con `replace:true`.
12. **M1 (flag 10).** No aprobado: sin expansión. El test 30 congela macros
    verbatim y la limitación se documenta en la etapa de docs.
13. **D3 (flag 11).** `gender`/`pronouns`/`tagline` display-only; no hay test de
    inyección en prompt.

## 8. Riesgos de ejecución

1. **Paridad S129 byte a byte:** si el snapshot cambia para una versión sin campos
   nuevos, el test está mal o la implementación reordenó el builder. Parar y
   corregir antes de seguir.
2. **Fixtures PNG:** construir en memoria con `node:zlib`; no commitear PNGs
   grandes ni binarios. Usar `limits` inyectables para los caps.
3. **Contrato de componentes UI:** si el implementador divide componentes o
   renombra props, el test author puede ajustar los tests de UI, pero no el
   contrato de API ni los tipos compartidos sin avisar.
4. **Rutas nuevas:** si Express monta `/characters/:id` antes que
   `/characters/cards/...`, el test 36 debe fallar; no ocultar con un mock.
5. **M1:** sin expansión. No introducir tests de macros expandidas por analogía.

## 9. Fuera de alcance (diferido)

Expansión de macros (M1); chats/JSONL y CHARX; port del prompt de ST; regex/timed/
probability/groups/`vectorized` (solo preservación); `scanDepth` per-entry;
inyección de género/pronombres; tokenizer real; slot de mensaje `system`
post-historia real; persistencia/catálogo remoto de cards.
