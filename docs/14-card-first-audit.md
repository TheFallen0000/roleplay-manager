# 14 — Auditoría card-first (seguimiento de S132)

**Estado:** Draft
**Fecha:** 2026-11-11
**Alcance:** medir qué parte de Character Card V1/V2/V3 y de los lorebooks
usa realmente Roleplay Manager, separar los gaps de datos de los gaps de UI y
proponer una dirección card-first sin reescribir el motor.
**Referencias:** `docs/10-slices/S132-progress.md`,
`docs/10-slices/S132-review.md`, `PRODUCT.md`, `docs/00-vision.md`.

---

## 1. Resumen ejecutivo

La card de SillyTavern es un **formato de definición de personaje**, no un
modelo de aplicación. RM ya usa los campos que alimentan el prompt y el
lorebook; lo que falta es una capa **card-first** en la interfaz y unos pocos
comportamientos. El problema principal no es el almacenamiento: es que la app
sigue presentando «personaje + tarjetas + lorebook» en vez de «card».

Conclusiones:

1. **No hace falta reescribir el núcleo.** El esquema normalizado es mejor para
   versionar, activar lorebooks, consultar y mantener integridad que guardar el
   JSON de la card como única fuente de verdad.
2. **Sí hace falta una frontera card-first.** La card debe ser el contrato
   canónico de intercambio y edición de personaje; el motor de contexto sigue
   siendo de RM.
3. **El «desperdicio» es más estrecho de lo que parece.** Los campos de prompt
   ya están activos. Los gaps reales son saludos alternativos, ajustes de
   lorebook en la UI, metadatos visibles y los campos nativos de RM que no
   viajan en la card.
4. **Perseguir un clon de ST no es la estrategia.** ST gana en amplitud
   (grupos, extensiones, prompt manager, assets, comunidad). RM debe ganar en
   continuidad, transparencia de contexto y app local empaquetada.

Recomendación: **card-first, motor RM**. Dos slices medianos, sin tocar el
schema de conversaciones, memoria, resúmenes ni el compilador S129.

---

## 2. Método y convenciones

Se revisaron el schema, los mappers, el compilador de prompt, la activación de
lorebook y la UI de S132:

- `packages/backend/src/infrastructure/adapters/secondary/drizzle/schema/character-versions.schema.ts`
- `packages/backend/src/domain/entities/character-version.entity.ts`
- `packages/backend/src/application/use-cases/character/sillytavern-card.mapper.ts`
- `packages/backend/src/application/use-cases/character/export-sillytavern-card.use-case.ts`
- `packages/shared/src/lib/lorebook-activation.ts`
- `packages/backend/src/application/services/lorebook-activation.service.ts`
- `packages/backend/src/infrastructure/adapters/secondary/prompt-context-builder/prompt-context-builder.impl.ts`
- `packages/frontend/src/components/character/character-card-fields.tsx`
- `packages/frontend/src/components/character/lorebook-editor.tsx`
- `packages/frontend/src/components/character/lorebook-entry-form.tsx`
- `packages/frontend/src/components/character/export-dialog.tsx`
- `packages/backend/src/application/use-cases/conversation/create-conversation.use-case.ts`

Columnas de las matrices:

- **Almacenamiento:** columna, JSON normalizado, `unknown_fields`,
  `unknown_root_fields`, `extensions` o «no se guarda».
- **UI:** editable, solo lectura o no visible.
- **Prompt:** activo, no activo o solo fallback.
- **Export:** card JSON/PNG, backup interno o ambos.
- **Veredicto:** correcto, gap, diferido o decisión pendiente.

---

## 3. Cobertura de Character Card

### 3.1 Identidad y campos de prompt

| Campo                       | Almacenamiento                                 | UI                 | Prompt                       | Export        | Veredicto                               |
| --------------------------- | ---------------------------------------------- | ------------------ | ---------------------------- | ------------- | --------------------------------------- |
| `name`                      | `character_versions.name`                      | Editable           | Activo (intro)               | Card + backup | Correcto                                |
| `description`               | `character_versions.description`               | Editable           | Activo (intro)               | Card + backup | Correcto; fallback si está vacío        |
| `personality`               | `character_versions.personality`               | Editable           | Activo (sección)             | Card + backup | Correcto                                |
| `scenario`                  | `character_versions.scenario`                  | Editable           | Activo (sección)             | Card + backup | Correcto                                |
| `first_mes`                 | `character_versions.greeting`                  | Editable           | Activo (saludo + estilo)     | Card + backup | Correcto; normalización si está vacío   |
| `mes_example`               | `character_versions.mes_example`               | Editable           | Activo (estilo)              | Card + backup | Correcto                                |
| `system_prompt`             | `character_versions.system_prompt`             | Editable           | Activo (override de persona) | Card + backup | Correcto (D1)                           |
| `post_history_instructions` | `character_versions.post_history_instructions` | Editable           | Activo (final)               | Card + backup | Correcto                                |
| `character_book`            | `lorebooks` + `lorebook_entries`               | Editable (parcial) | Activo (core)                | Card + backup | Correcto; faltan ajustes de libro en UI |

### 3.2 Saludos y metadatos

| Campo                 | Almacenamiento                                         | UI                             | Prompt                                          | Export        | Veredicto                                                             |
| --------------------- | ------------------------------------------------------ | ------------------------------ | ----------------------------------------------- | ------------- | --------------------------------------------------------------------- |
| `alternate_greetings` | `character_versions.alternate_greetings` (JSON)        | Editable                       | **No**; solo fallback si `first_mes` está vacío | Card + backup | **Gap P1**: no se pueden elegir al crear un chat                      |
| `creator_notes`       | `character_versions.creator_notes`                     | Solo lectura (panel con aviso) | No (por diseño)                                 | Card + backup | Correcto                                                              |
| `tags`                | `character_versions.tags` (JSON)                       | Editable en el formulario      | No                                              | Card + backup | **Gap P2**: no se ve en el listado ni en una cabecera de solo lectura |
| `creator`             | `character_versions.creator`                           | Editable en el formulario      | No                                              | Card + backup | **Gap P2**: no se ve en el listado ni en una cabecera de solo lectura |
| `character_version`   | `character_versions.card_character_version`            | Solo lectura en el formulario  | No                                              | Card + backup | **Gap P2**: no se ve en el listado ni en una cabecera de solo lectura |
| `gender`              | `character_versions.gender`                            | Solo lectura                   | No (D3)                                         | Card + backup | Correcto; inyección diferida                                          |
| `pronouns`            | `character_versions.pronouns`                          | Solo lectura                   | No (D3)                                         | Card + backup | Correcto; inyección diferida                                          |
| `tagline`             | `character_versions.tagline` + `extensions.rm.tagline` | Solo lectura                   | No                                              | Card + backup | Correcto; patrón para extensiones RM                                  |

### 3.3 Campos V3-only y envelope

| Campo                                 | Almacenamiento                                   | UI         | Prompt | Export                                              | Veredicto                                       |
| ------------------------------------- | ------------------------------------------------ | ---------- | ------ | --------------------------------------------------- | ----------------------------------------------- |
| `spec` / `spec_version`               | No se guardan como dato; se detectan al importar | No visible | No     | Se re-emiten como `chara_card_v2` / `chara_card_v3` | Menor: no se preserva el `spec_version` literal |
| `nickname`                            | `unknown_fields`                                 | No visible | No     | Card                                                | **Oportunidad P2**: alias de display            |
| `group_only_greetings`                | `unknown_fields`                                 | No visible | No     | Card                                                | Diferido: requiere group chats                  |
| `assets`                              | `unknown_fields`                                 | No visible | No     | Card                                                | Diferido: requiere render de assets V3          |
| `creator_notes_multilingual`          | `unknown_fields`                                 | No visible | No     | Card                                                | Oportunidad P3: notas por locale                |
| `source`                              | `unknown_fields`                                 | No visible | No     | Card                                                | Metadato; baja prioridad                        |
| `creation_date` / `modification_date` | `unknown_fields`                                 | No visible | No     | Card                                                | Metadato; baja prioridad                        |
| Otras keys de `data`                  | `unknown_fields`                                 | No visible | No     | Card                                                | Correcto: preservadas                           |
| Keys desconocidas de la raíz          | `unknown_root_fields`                            | No visible | No     | Card                                                | Correcto: preservadas                           |

### 3.4 Campos nativos de RM que no viajan en la card

Estos campos existen en `CharacterVersion` y en el backup interno, pero
`versionFieldsToCardData` no los escribe en la card:

| Campo RM                         | Almacenamiento                      | Prompt                           | Card export     | Veredicto                                    |
| -------------------------------- | ----------------------------------- | -------------------------------- | --------------- | -------------------------------------------- |
| `subtitle`                       | `character_versions.subtitle`       | Activo (línea de subtítulo)      | **No**          | **Gap P1**: se pierde al compartir una card  |
| `instructions`                   | `character_versions.instructions`   | Activo (sección propia)          | **No**          | **Gap P1**: se pierde al compartir una card  |
| `cards` (fichas de conocimiento) | `character_cards`                   | Activo (sección de conocimiento) | **No**          | **Gap P1**: se pierden al compartir una card |
| `versionNumber`                  | `character_versions.version_number` | No                               | **No**          | **Gap P2**: metadato de versión RM           |
| `profileImageAssetId`            | asset                               | No                               | PNG sí; JSON no | Correcto: el JSON de ST no embebe imagen     |

La card tiene un sitio natural para esto: `data.extensions.rm`. Ya se usa para
`tagline`; el resto debería seguir el mismo patrón. ST ignora las extensiones
desconocidas, así que la compatibilidad se mantiene.

---

## 4. Cobertura de lorebook

### 4.1 Nivel de libro

| Campo                | Almacenamiento                 | UI              | Activación | Export            | Veredicto            |
| -------------------- | ------------------------------ | --------------- | ---------- | ----------------- | -------------------- |
| `name`               | `lorebooks.name`               | Editable        | No         | Card + standalone | Correcto             |
| `description`        | `lorebooks.description`        | **No editable** | No         | Card + standalone | **Gap P1** de UI     |
| `scan_depth`         | `lorebooks.scan_depth`         | **No editable** | Sí         | Card + standalone | **Gap P1** de UI     |
| `token_budget`       | `lorebooks.token_budget`       | **No editable** | Sí         | Card + standalone | **Gap P1** de UI     |
| `recursive_scanning` | `lorebooks.recursive_scanning` | **No editable** | Sí         | Card + standalone | **Gap P1** de UI     |
| `extensions`         | `lorebooks.extensions`         | No editable     | No         | Card + standalone | Correcto: preservado |
| `unknown_fields`     | `lorebooks.unknown_fields`     | No editable     | No         | Card + standalone | Correcto: preservado |

Los cuatro ajustes existen en la entidad y en el endpoint
`PUT /api/characters/:id/lorebook`, pero el editor solo expone `name`. El
usuario no puede tocar la profundidad, el presupuesto ni la recursión sin
importar un JSON o llamar a la API.

### 4.2 Nivel de entrada

| Campo                                                                                                                                                                                                                             | Almacenamiento                 | UI                      | Activación       | Export            | Veredicto                            |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ | ----------------------- | ---------------- | ----------------- | ------------------------------------ |
| `keys`                                                                                                                                                                                                                            | `lorebook_entries.keys` (JSON) | Editable                | Sí               | Card + standalone | Correcto                             |
| `secondary_keys`                                                                                                                                                                                                                  | `secondary_keys` (JSON)        | Editable                | Sí               | Card + standalone | Correcto                             |
| `selective`                                                                                                                                                                                                                       | `selective`                    | Editable                | Sí               | Card + standalone | Correcto                             |
| `selective_logic`                                                                                                                                                                                                                 | `selective_logic`              | Editable                | Sí (0–3)         | Card + standalone | Correcto                             |
| `constant`                                                                                                                                                                                                                        | `constant`                     | Editable                | Sí               | Card + standalone | Correcto                             |
| `content`                                                                                                                                                                                                                         | `content`                      | Editable                | Sí               | Card + standalone | Correcto                             |
| `enabled`                                                                                                                                                                                                                         | `enabled`                      | Editable                | Sí               | Card + standalone | Correcto                             |
| `insertion_order`                                                                                                                                                                                                                 | `insertion_order`              | Editable                | Sí (orden)       | Card + standalone | Correcto                             |
| `position`                                                                                                                                                                                                                        | `position` + `raw_position`    | Editable (before/after) | Sí               | Card + standalone | Correcto; `raw_position` se preserva |
| `case_sensitive`                                                                                                                                                                                                                  | `case_sensitive`               | Editable                | Sí               | Card + standalone | Correcto                             |
| `whole_words`                                                                                                                                                                                                                     | `whole_words`                  | Editable                | Sí               | Card + standalone | Correcto                             |
| `priority`                                                                                                                                                                                                                        | `priority`                     | Editable                | Sí (presupuesto) | Card + standalone | Correcto                             |
| `name`                                                                                                                                                                                                                            | `name`                         | Editable                | No               | Card + standalone | Correcto                             |
| `comment`                                                                                                                                                                                                                         | `comment`                      | Editable                | No               | Card + standalone | Correcto                             |
| `source_id`                                                                                                                                                                                                                       | `source_id`                    | No editable             | No               | Standalone ST     | Correcto: preservado                 |
| `order`                                                                                                                                                                                                                           | `order`                        | No editable             | Sí (desempate)   | Card + standalone | Correcto                             |
| `extensions`                                                                                                                                                                                                                      | `extensions`                   | No editable             | No               | Card + standalone | Correcto: preservado                 |
| `unknown_fields`                                                                                                                                                                                                                  | `unknown_fields`               | No editable             | No               | Card + standalone | Correcto: preservado                 |
| `use_regex`                                                                                                                                                                                                                       | `unknown_fields`               | No editable             | No (se omite)    | Card + standalone | Deliberado: sin regex de usuario     |
| `probability`, `group`, `group_override`, `group_weight`, `vectorized`, `cooldown`, `delay`, `sticky`, `delay_until_recursion`, `depth`, `role`, `automation_id`, `excludeRecursion`, `preventRecursion`, `scanDepth` por entrada | `unknown_fields`               | No editable             | No               | Card + standalone | Diferido: preservado, no activado    |

---

## 5. Gaps priorizados

### P1 — Lo que más se nota al usar cards

1. **Saludos alternativos muertos.** Se guardan y se editan, pero
   `CreateConversationUseCase` siempre usa `version.greeting`. El usuario no
   puede empezar una historia con un saludo alternativo. Es el gap más visible
   y el que más se parece a «desperdiciar la card».
2. **Ajustes de lorebook no editables.** `scan_depth`, `token_budget`,
   `recursive_scanning` y `description` existen, activan y se exportan, pero no
   hay controles en el editor. El usuario avanzado tiene que importar JSON.
3. **Datos nativos de RM fuera de la card.** `subtitle`, `instructions`,
   `cards` y `versionNumber` se pierden al exportar una card. Si la card es el
   formato de intercambio, RM necesita un namespace `extensions.rm`.

### P2 — Superficie card-first

4. **Editor con cara de RM, no de card.** Los campos están, pero el orden y las
   etiquetas son las de RM; no hay insignia V2/V3 ni inspector del JSON.
5. **Metadatos invisibles.** `tags`, `creator` y `character_version` solo
   aparecen dentro del formulario; no hay una cabecera de solo lectura ni chips
   en el listado. `nickname` no aparece en ninguna parte.
6. **«Tarjetas» se llama igual que las cards.** La pestaña «Tarjetas» son las
   fichas de conocimiento de RM; confunde con la character card. Renombrarla a
   «Fichas» (ES) / «Knowledge» (EN).
7. **No hay contrato canónico de card.** Solo import/export; no hay
   `GET/PUT /api/characters/:id/card` para leer y escribir la card como objeto.

### P3 — Detalles y deuda documentada

8. **El selector de spec no aplica a PNG.** El PNG siempre escribe `chara` y
   `ccv3`; el toggle V2/V3 solo cambia el JSON. La UI debería ocultarlo o
   explicarlo.
9. **Round-trip no exacto en campos vacíos.** `description` vacía se sustituye
   por un fallback en inglés; `first_mes` vacío consume el primer saludo
   alternativo. Es una decisión para respetar los invariantes de entidad, pero
   debe documentarse o guardar el original en `extensions.rm`.
10. **`spec_version` literal no se preserva.** Se re-emite `2.0`/`3.0` según el
    spec elegido. Aceptable, pero no es round-trip byte a byte.
11. **`creator_notes` sin límite al importar.** La API de edición limita a 500
    caracteres; una card importada puede traer más y luego fallar al editar.
12. **`raw_position` 2–6 se pierde al editar la posición.** El editor solo
    ofrece before/after y escribe 0/1. Es una simplificación deliberada del
    core, pero conviene avisar.

### Diferido explícito

- `assets` V3 (expresiones, fondos, audio) y CHARX.
- `group_only_greetings` y group chats.
- Lorebook avanzado: timed effects, probabilidad, grupos, decoradores,
  `vectorized`.
- Prompt manager/presets de ST.
- Edición raw de la card como fuente de verdad (mejor inspector de solo
  lectura).

---

## 6. Qué ofrece RM que ST no

La comparación honesta no es «RM hace más», sino «RM hace otra cosa». ST es una
plataforma amplia; RM es un gestor de continuidad.

| Dimensión              | SillyTavern                                                                | Roleplay Manager                                                         |
| ---------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Formato de personaje   | Nativo; estándar de facto                                                  | Compatible; card-first como objetivo                                     |
| Amplitud               | Group chats, extensiones, TTS, imágenes, prompt manager, assets, comunidad | Foco en conversaciones, contexto y memoria                               |
| Gestión de contexto    | Presets/extensiones; prompt viewer                                         | Núcleo: ventana de trabajo, compactación, manifiesto, preview            |
| Memoria y resúmenes    | Extensiones                                                                | Núcleo: memoria con decaimiento, propuestas y resúmenes                  |
| Versiones de personaje | Una card por personaje; el versionado no es el foco                        | Versiones inmutables por personaje, conversaciones fijadas a una versión |
| Ramas                  | Funciones de chat orientadas a la sesión                                   | Ramas que heredan ajustes; versiones y ajustes en el mismo flujo         |
| Distribución           | Servidor Node que el usuario mantiene                                      | App empaquetada, updater, PWA y acceso por Tailscale/LAN                 |
| Datos                  | Local                                                                      | SQLite local + BYO provider                                              |
| UX                     | Densa, power-user                                                          | Curada, bilingüe, orientada a escribir                                   |
| Extensibilidad         | Ecosistema enorme                                                          | No es un objetivo a corto plazo                                          |

Lo que ST hace mejor y RM no debe intentar copiar a corto plazo: group chats,
extensiones, prompt manager, TTS, generación de imágenes, assets V3 y la
comunidad de presets.

Lo que RM puede defender: **usar tus cards de ST en historias largas, con un
motor de contexto que entiendes y controlas.**

---

## 7. Posicionamiento propuesto

**Una frase:**

> Tus cartas de SillyTavern, con un motor de contexto pensado para historias
> largas.

**Elevator pitch:**

> Roleplay Manager importa tus character cards y lorebooks de SillyTavern y los
> convierte en conversaciones locales de largo recorrido: memoria, resúmenes,
> compactación automática, versiones y ramas, con el modelo que tú elijas. La
> card es el formato; la continuidad es el producto.

**Qué no decir:**

- «El mejor editor de character cards»: ST ya tiene ese terreno y no es el
  diferencial.
- «Un clon de SillyTavern»: invita a comparar amplitud y pierde.
- «Compatible al 100% con todas las extensiones de ST»: no es el objetivo.

**Qué sí decir:**

- «Compatible con Character Card V2/V3 y lorebooks».
- «Local-first, BYO provider».
- «Contexto transparente y controlable».
- «Pensado para historias que duran semanas».

---

## 8. Propuesta card-first (sin rewrite)

### 8.1 Principios

1. La card es el **contrato canónico de intercambio y edición** de personaje.
2. La base de datos normalizada sigue siendo la fuente operativa: versiones,
   lorebooks, activación, consultas e integridad.
3. Lo específico de RM viaja en `data.extensions.rm` y se restaura al
   importar. ST lo ignora; RM no pierde nada.
4. El prompt sigue siendo el compilador transparente de RM; los overrides de
   card (`system_prompt`, `post_history_instructions`) se respetan como hasta
   ahora.
5. Cada campo de la card debe estar en uno de estos estados, documentado:
   prompt-activo, mostrado, metadato o diferido.
6. El backup interno (`character-export`) sigue siendo el formato sin pérdidas;
   la card es el formato portátil para compartir.

### 8.2 Slice A — contrato y editor card-first

- `GET /api/characters/:id/card?spec=v2|v3` devuelve la card canónica.
- `PUT /api/characters/:id/card` acepta una card, valida, crea una versión
  nueva y actualiza el lorebook en la misma operación.
- `data.extensions.rm` transporta `subtitle`, `instructions`, `cards`,
  `versionNumber` y `tagline`; el import los restaura.
- Inspector de card en la UI: JSON de solo lectura, copiar/descargar, insignia
  V2/V3 y warnings de importación.
- Editor con etiquetas y orden de ST; renombrar «Tarjetas» a «Fichas» /
  «Knowledge».
- Mostrar `tags`, `creator`, `character_version` y `nickname` en el detalle y,
  si cabe, en el listado.

### 8.3 Slice B — comportamiento y ajustes

- Selector de saludo al crear conversación: `first_mes` + alternativas;
  `CreateConversationInput` acepta el índice/texto elegido y valida contra la
  versión.
- Controles de lorebook a nivel de libro: descripción, `scan_depth`,
  `token_budget`, `recursive_scanning`; aviso de `use_regex` preservado.
- Aclarar el export PNG: siempre escribe `chara` + `ccv3`; el selector V2/V3
  solo afecta al JSON (o se oculta para PNG).
- Documentar las normalizaciones de campos vacíos y `raw_position`.

### 8.4 Criterios de aceptación

- Una card V2/V3 real con campos conocidos y desconocidos sobrevive el
  round-trip salvo las normalizaciones documentadas.
- `GET /card` devuelve un envelope válido; `PUT /card` crea una versión nueva
  y no rompe conversaciones existentes.
- `extensions.rm` conserva `subtitle`, `instructions`, `cards` y
  `versionNumber` al exportar e importar.
- Se puede empezar una conversación con cualquier saludo alternativo y el
  mensaje 0 es el elegido.
- `scan_depth`, `token_budget` y `recursive_scanning` se pueden editar desde la
  UI y el cambio se refleja en la siguiente respuesta.
- Etiquetas, creador, versión de card y nickname se ven sin abrir el
  formulario.
- Sin regresiones en S129–S132: `pnpm check`, tests backend/frontend, build y
  audit en verde.

### 8.5 Fuera de alcance

- Assets V3, CHARX y expresiones.
- Group chats y `group_only_greetings`.
- Lorebook avanzado (timed effects, probabilidad, grupos, decoradores,
  `vectorized`).
- Prompt manager/presets de ST.
- Edición raw de la card como fuente de verdad.

### 8.6 Riesgos y mitigaciones

| Riesgo                                                              | Mitigación                                                                                                     |
| ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Duplicar fuentes de verdad (columnas vs `extensions.rm`)            | Las columnas siguen siendo la fuente editable; `extensions.rm` solo serializa/restaura. Tests de round-trip.   |
| Romper conversaciones existentes al crear versión desde `PUT /card` | Misma semántica que la edición actual: versión nueva, conversaciones antiguas fijadas a su versión.            |
| Divergencia entre card y backup interno                             | El backup interno sigue siendo el formato completo; la card es el portátil. Documentar la diferencia en la UI. |
| Scope creep hacia un clon de ST                                     | Lista explícita de fuera de alcance y revisión en el RFC de cada slice.                                        |
| Complejidad de `extensions.rm`                                      | Namespace pequeño y versionado (`rm.version: 1`), con tests de campos desconocidos.                            |

### 8.7 Esfuerzo

Dos slices medianos, no un rewrite:

- **Slice A:** backend de card + `extensions.rm` + inspector/editor + metadatos.
- **Slice B:** saludos alternativos + ajustes de lorebook + claridad de export.

El schema de conversaciones, memoria, resúmenes, compactación y proveedores no
se toca. El compilador S129 solo necesita el saludo elegido y los ajustes de
lorebook que ya existen.

---

## 9. Decisiones abiertas

1. **¿`nickname` y `creator_notes_multilingual` pasan a columnas?**
   Recomendación: `nickname` sí (alias de display); notas multilingües después.
2. **¿Inspector de card de solo lectura o editor raw?**
   Recomendación: solo lectura + formulario; evitar dos fuentes de verdad.
3. **¿`extensions.rm` incluye las fichas de conocimiento?**
   Recomendación: sí, para que compartir una card no pierda datos de RM.
4. **¿Se preserva el `description`/`first_mes` vacío original?**
   Recomendación: mantener los invariantes de entidad y documentar la
   normalización; si hace falta fidelidad exacta, guardar el original en
   `extensions.rm.original`.
5. **¿Se renombra «Tarjetas» a «Fichas»?**
   Recomendación: sí; «Tarjetas» queda para las cards de ST.
6. **¿Se mantiene el export interno?**
   Recomendación: sí, como backup completo; la card es el formato de
   intercambio.

---

## 10. Recomendación

Aprobar la dirección **card-first, motor RM** y convertirla en dos slices
después de cerrar S132 (o repriorizar si el usuario quiere que salga antes que
S133–S135). No reescribir el núcleo ni portar el prompt manager de ST.

El orden sugerido:

1. Cerrar y mergear S132.
2. Revisar esta auditoría y decidir las cuestiones abiertas.
3. RFC del Slice A (contrato y editor).
4. Implementación y tests.
5. RFC del Slice B (saludos y lorebook).
6. Reposicionar README/website con la frase propuesta.

El resultado esperado no es «RM se convierte en ST», sino «RM deja de deberle
nada al formato de ST y puede presumir de lo que sí es suyo: continuidad,
contexto transparente y una app local que funciona».
