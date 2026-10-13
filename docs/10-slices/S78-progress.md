# S78 — Imagen en la plantilla de ajustes + anclaje del chat (PM.29 + PM.33)

**Estado:** Completado
**Inicio:** 2026-10-13
**Fin:** 2026-10-13

## Descripción

Cierra los dos últimos pendientes antes de la release: la **imagen personalizada
del chat viaja en la plantilla de ajustes** (PM.29), de modo que «Aplicar
ajustes…» también la recrea en el personaje destino, y el **chat ancla el
final** al abrir una conversación (PM.33), sin el hueco de ~400 px que dejaba el
espaciador del scroller. De paso, el E2E destapó y se corrigió un **bug de
datos**: `stop_sequences` se codificaba dos veces al guardar ajustes.

## Decisiones

### PM.29 — imagen en la plantilla

- **Formato**: `standaloneSettings.customProfileImageAssetId` (dentro de
  `ExportSettings`, que ahora lo declara) más `standaloneSettingsImage` (el
  binario en base64) en la raíz del export, con un tipo compartido `ExportImage`
  reutilizado por `conversationImages`.
- **Aplicar**: si el binario viaja, se recrea con el `StoreCharacterAssetService`
  (uso `profile`) y se asigna a todas las conversaciones; si la plantilla solo
  trae el id y el recurso existe localmente, se reutiliza; si no, se avisa
  (`CUSTOM_IMAGE_NOT_FOUND`, nuevo `SettingsTemplateWarning`) y se aplica el
  resto. `customProfileImageAssetId: null` quita la imagen del destino.
- **Frontend**: el parser devuelve también la imagen, el diálogo la anuncia como
  insignia y la envía al aplicar.

### PM.33 — anclaje del chat

- El final «crudo» del `MessageScroller` incluye el espaciador del primitivo: al
  abrir, el scroll al máximo dejaba el último mensaje ~400 px por encima del
  compositor (medido: viewport 558 px, espaciador 396 px).
- **Fix**: un `AnchorChatToEnd` dentro del provider usa
  `useMessageScroller().scrollToEnd({ align: "end", behavior: "instant" })` en un
  `requestAnimationFrame` cada vez que cambia el último mensaje persistido → gap
  **0** con conversación que desborda (antes +396 px). El `autoScroll` del
  streaming no se toca.

### Bug de datos destapado (Fixed)

- `DrizzleConversationRepository.updateSettings` hacía `JSON.stringify` sobre
  `stop_sequences`, pero la columna es `text({ mode: "json" })` → **doble
  codificación** (bug desde S5) que solo se disparaba al enviar `stopSequences`:
  el UI lo hace rara vez (solo al editarlas), pero «Aplicar ajustes» **siempre**
  → cada aplicación corrompía las conversaciones y el SSR del chat crasheaba
  (`stopSequences?.join is not a function`).
- **Fix**: quitar el `stringify` manual y **sanear en lectura**
  (`normalizeStopSequences`, que también deshace el doble encoding) — las filas
  corruptas se curan al leerse y cualquier guardado posterior las reescribe bien.
  Sin migración.

## Criterios de aceptación

- [x] La plantilla lleva id + binario de la imagen; sin imagen no añade nada.
- [x] Aplicarla recrea el recurso en el destino (servido como PNG) y lo asigna;
      un id local se reutiliza; ausente → aviso y sin romper.
- [x] `null` en la plantilla quita la imagen del destino.
- [x] El chat abre con el último mensaje junto al compositor (gap 0 medido).
- [x] `stop_sequences` ya no se doble-codifica; filas corruptas se curan al leer.
- [x] Gates, suites y E2E; CHANGELOG en `[Unreleased]`; PM.29 y PM.33 marcadas.

## Verificación

- Backend **517** tests (+5) y frontend **317** (+2); `pnpm check` 7/7; detector
  `impeccable` sin hallazgos.
- **E2E con el paquete** (datos sembrados por importación): el export de
  `standaloneSettings` incluye id + binario; aplicarlo al personaje destino
  devuelve `{applied: 1, warnings: []}`, la conversación queda con la imagen
  (PNG servido con 200) y `stopSequences: []`; una fila corrompida a mano en la
  BD se lee como `[]` (curación); y el chat abre con `scrollGapPx = 0` y el
  último mensaje sobre el compositor (captura revisada).

## Commits

1. `feat(backend): carry the custom chat image in settings templates`
2. `feat(frontend): apply the custom chat image from settings templates`
3. `fix(backend): stop double-encoding stop sequences on settings updates`
4. `fix(frontend): anchor the chat to the last message on load`
5. `docs(slice): add S78 progress and mark PM.29 and PM.33`
