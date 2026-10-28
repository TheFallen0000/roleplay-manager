# S103 — Rendimiento del chat

**Estado:** Completado (pendiente de release batched)
**Inicio:** 2026-10-28
**Fin:** 2026-10-28

## Descripción

Reduce el coste de renderizado durante el streaming en conversaciones largas:

- `ChatContent` ya no se suscribe al store completo de zustand; usa selectores
  por campo.
- `StreamingBubble` y `RegeneratingBubble` viven en
  `chat-streaming-bubbles.tsx` y tienen su propia suscripción a
  `streamingContent`. Cada token re-renderiza solo la burbuja que está
  creciendo, no el chat entero.
- `MessageBubble` está memoizado y `parseMessage` se calcula con `useMemo` por
  contenido, así los mensajes existentes no se vuelven a parsear.
- Los callbacks de editar/borrar/rebobinar son referencias estables, para que
  `memo` pueda saltarse los mensajes que no cambian.
- `chat.tsx` baja de 577 a **484 líneas**, dentro del límite de 500.

No hay cambios de comportamiento ni de API.

## Decisiones

- **Suscripción separada para el streaming:** el streaming es el único estado
  que cambia muchas veces por segundo; aislarlo evita re-renderizar header,
  input, lista y diálogos en cada token.
- **`React.memo` + callbacks estables:** el `message` de cada fila conserva su
  referencia en zustand (`addMessage`/`replaceMessage` no clonan los demás), así
  que `memo` evita renders y parses innecesarios.
- **`useMemo(parseMessage)`:** el parser recorre el contenido; memorizarlo evita
  repetirlo cuando cambia el estado del padre pero no el mensaje.
- **Extracción a `chat-streaming-bubbles.tsx`:** mantiene `chat.tsx` por debajo
  de 500 líneas y separa la lógica de streaming de la composición del chat.
- **Sin virtualización adicional:** `MessageScrollerItem` ya usa
  `content-visibility: auto` y el scroller tiene su propio observer de resize;
  medir antes de añadir una librería de virtualización.
- **Fuera de alcance:** dividir el bundle de i18n, paginar listas y optimizar
  backups (S104).

## Criterios de aceptación

- [x] `ChatContent` usa selectores, no `useChatStore()` completo.
- [x] El streaming solo re-renderiza su burbuja.
- [x] `MessageBubble` memoizado y `parseMessage` memorizado.
- [x] Callbacks estables en la lista de mensajes.
- [x] `chat.tsx` ≤ 500 líneas.
- [x] Test de memoización de `MessageBubble`.
- [x] Tests, `pnpm check`, build, smoke test, API y Playwright en verde.
- [x] `CHANGELOG.md` actualizado en `[Unreleased]`.

## Verificación

- Backend: **644** tests (112 archivos).
- Frontend: **336** tests (57 archivos), incluido el test de memoización.
- `pnpm check`: arquitectura 7/7, typecheck y lint verdes.
- `pnpm build`: backend, frontend y website en verde.
- Paquete Linux y smoke test: PASS.
- API del paquete: **21/21**.
- Playwright/Chromium: home, personajes, proveedores, tutoriales, updates
  (backup desde la UI) y chat; **0 errores de consola, 0 violaciones CSP**.
- `chat.tsx`: 484 líneas; `chat-streaming-bubbles.tsx`: 102.

## Commits

1. `851e5b3 perf(chat): isolate streaming renders and memoize messages`
2. `67f0a67 test(chat): cover message bubble memoization`
3. `docs(slice): document S103 chat rendering` (this commit)
