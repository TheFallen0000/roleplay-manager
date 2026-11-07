# S132 — Review

**Estado:** PASS WITH NOTES
**Revisor:** slice-reviewer
**Fecha:** 2026-11-07

> Revisión de los fixes `88332d3`, `56b9496`, `c11b62a`, `5089592`. Los cinco hallazgos bloqueantes/importantes previos (B1, I1, I2, N1, N2) y N5 quedan resueltos. Quedan solo notas menores. Verifiqué los archivos directamente con `read`/`grep`/`glob` (sin `shell`).

## Hallazgos

### Bloqueantes

Ninguno. Los dos hallazgos que bloqueaban en la revisión anterior están resueltos y cubiertos por tests:

- **B1 (límite 15 MB anulado por el global de 1 MB) — resuelto.** `server.ts:98-104` ahora monta `cardJsonParser` (15 MB) para `/api/characters/cards`, `/api/characters/:id/cards`, `/api/lorebooks` y `/api/characters/:id/lorebook` **antes** del global `express.json({ limit: "1mb" })`. El test `server-routes.s132.test.ts:36-43` aserta el orden de fuente (`largeParser < globalParser`), y `:32-34` aserta el límite de 15 MB.
- **I1 (pérdida de metadatos al editar lorebook) — resuelto.** `LorebookEditorValue`/`LorebookEditorEntry` ahora llevan `description`, `scanDepth`, `tokenBudget`, `recursiveScanning`, `extensions`, `unknownFields`, `sourceId`, `order` (`lorebook-editor.tsx:12-44`). `serializeLorebook` (`character-form-fields.ts:362-403`) propaga `bookUnknown` a nivel `data`, emite settings reales del libro, e inyecta por entrada `id: sourceId`, posición numérica y `extensions`/`unknownFields`. El test `character-form-fields.test.ts:52-75` demuestra que `scan_depth=8`, `token_budget=900`, `recursive_scanning=true`, `book_custom`, `use_regex`, `cooldown`, `delay`, `group`, `probability` y `sourceId="7"` sobreviven a una edición. Test sustantivo, no tautológico.

### Importantes

Ninguno pendiente. **I2** (UI standalone) queda funcionalmente resuelto: `LorebookEditor` tiene edición inline por entrada vía `lorebook-entry-form.tsx` (claves, secundarias, contenido, posición, prioridad, selective_logic, flags) y botones «Importar»/«Exportar»; `use-character-form.ts:254-285` conecta import (`previewLorebook` para personajes existentes + `parseLorebookPayload` local para nuevos) y export (`exportLorebook` ccv3 + fallback a `serializeLorebook`); `character-form.tsx:338-342` cablea `onImportFile`/`onExport`. **N1** resuelto: `ContextManifestDTO.lorebook?: { overBudget }` (`context.ts:63-65`) y `ContextCompiler` lo emite (`context-compiler.service.ts:159-162`). **N2** resuelto: `decodeCardText` exige base64 estricto sin fallback a JSON (`png-card.adapter.ts:120-122`) con test de regresión (`png-card.adapter.test.ts:158`). **N5** resuelto: `character_version`/`gender`/`pronouns`/`tagline` son display-only (`character-card-fields.tsx:111-122`).

### Notas / nits

- **R1 — Falta el punto de entrada de lorebook standalone a nivel de listado.** El RFC (§"Flujo de UI") prevé «(a) Menú contextual/barra del listado: Importar lorebook → elegir personaje destino». `character-list.tsx` y `character-context-menu.tsx` siguen sin referenciar lorebook (solo card import/export); el import/export de lorebook solo es accesible desde la pestaña Lorebook del formulario de un personaje. Funcionalidad cubierta, punto de entrada (a) pendiente.
- **R2 — Export ST-native no expuesto en UI.** `handleLorebookExport` (`use-character-form.ts:270-285`) solo exporta `"ccv3"`. El RFC pide «Importar/Exportar (CCv3/ST nativo)». El endpoint `st-native` existe pero la UI no ofrece el formato.
- **R3 — Fallback localizado hardcodeado a inglés (sin cambio).** `sillytavern-card.mapper.ts:168,179` siguen usando `translate("en", …)` para `cardFallbackDescription`/`cardFallbackGreeting`, persistiendo el fallback en inglés para usuarios en español. No estaba en el alcance de los fixes.
- **R4 — Modal con 3 pestañas (sin cambio).** `character-form.tsx` usa `character`/`cards`/`lorebook` («Personaje»/«Tarjetas»/«Lorebook») frente a las 2 pestañas «Personaje/Lorebook» del RFC. El test solo aserta presencia.
- **R5 — Borde de borrado de lorebook.** En edición, `hasLorebookContent = entries.length > 0 || name.trim() !== ""` (`use-character-form.ts:347-348`): si el usuario vacía el nombre **y** borra todas las entradas, no se llama `importLorebook` y el borrado no se persiste (el libro queda intacto en BD).
- **R6 — `MAX_CARD_JSON_BYTES` sin uso en producción (sin cambio).** Solo se aserta su valor en `png-card.adapter.test.ts:215`; el límite real se controla con `maxDecodedCardJsonBytes`.
- **R7 — `spec_version` de lorebook standalone CCv3 (sin cambio).** Se captura en `unknownFields` del libro y se re-emite en `data`, no en la raíz (`lorebook.mapper.ts`).
- **R8 — `reorderEntries` no valida pertenencia (sin cambio).** `drizzle-lorebook.repository.ts` reordena por `entryIds` arbitrarios sin comprobar que pertenezcan al lorebook del personaje (integridad bajo frontera local de confianza).
- **R9 — Duplicación de lógica de normalización lorebook.** `parseLorebookPayload` (`character-form-fields.ts:322-360`) re-implementa el `normalizeLorebook` del backend. Si ambos derivan, el valor del editor puede diferir de lo que el backend persistirá (mitigado porque el guardado re-serializa y re-normaliza en backend). Mantenibilidad, no corrección.

## Verificación

- **B1:** orden de parsers corregido y asertado por `server-routes.s132.test.ts` (test de fuente). Confirmado en `server.ts:98-104`.
- **I1:** `serializeLorebook`/`lorebookToEditorValue`/`buildLorebookSnapshot` propagan settings de libro, `unknownFields` de libro/entrada, `sourceId`, `extensions` y posición numérica; `character-form-fields.test.ts` lo demuestra con fixture real.
- **I2:** edición inline de entradas (`lorebook-entry-form.tsx`), import vía `previewLorebook`+parse local y export vía `exportLorebook` con fallback, cableados en `character-form.tsx`.
- **N1/N2/N5:** verificados en código y con tests de regresión.
- **Sin regresiones aparentes:** el cambio de orden de middlewares en `server.ts` no altera `/api/characters/imports` (25 MB, línea 93, sigue antes del 1 MB) ni el montaje de routers card/lorebook antes de `/characters/:id` (líneas 153-155). El `CharacterVersionDTO`/form preserva los valores de `gender`/`pronouns`/`tagline`/`cardCharacterVersion` como display-only (siguen viajando en `cardFieldsToInput`).

## Riesgos residuales

- R1/R2 dejan fuera del alcance visual los dos formatos/entradas que el RFC enumera, aunque la funcionalidad de import/export de lorebook está disponible por el formulario.
- R3 persiste un fallback no localizado persistido en BD para cards con `description`/`first_mes` vacíos.
- R5/R8 son bordes de integridad menores (borrado con nombre vacío; reorden sin validación de pertenencia) sin impacto en la confianza local del producto.

No se corrigió nada (solo lectura). El slice queda aprobado con notas; no hay bloqueantes ni importantes pendientes.
