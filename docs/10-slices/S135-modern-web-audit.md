# S135 — Modern web audit

**Fecha:** 2026-11-21
**Herramienta:** Modern Web Guidance 1.0.1 (`pnpx modern-web-guidance@latest`)
**Alcance:** `packages/frontend/src`, `packages/website/src`

## Resumen

`legacy-scan` encontró **7 patrones deterministas** en el frontend y **0** en la
web. Los 7 están corregidos y el escaneo posterior devuelve 0 en ambas áreas.
La revisión manual añadió cinco mejoras progresivas (movimiento reducido,
tipografía, nombre accesible del chat e imágenes) y dejó seis puntos diferidos
con un disparador claro.

| Área | Antes | Después |
| ---- | ----- | ------- |
| `packages/frontend/src` | 7 hallazgos | 0 |
| `packages/website/src` | 0 hallazgos | 0 |

Comandos:

```sh
pnpx modern-web-guidance@latest legacy-scan packages/frontend/src --json
pnpx modern-web-guidance@latest legacy-scan packages/website/src --json
```

## Hallazgos deterministas

| Guía | Archivo | Hallazgo | Decisión | Cambio |
| ---- | ------- | --------- | -------- | ------ |
| `ime-safe-enter-submit` | `components/conversation/message-input.tsx:74` | `Enter` enviaba sin comprobar la composición IME | Fix | `nativeEvent.isComposing` + `keyCode === 229` tras `preventDefault()`. |
| `js/copying-array-methods` | `components/character/sections/versions-section.tsx:92` | `[...versions].reverse()` | Fix | `versions.toReversed()`. |
| `js/copying-array-methods` | `components/conversation/summary-viewer.tsx:68` | `[...summaries].sort(...)` | Fix | `summaries.toSorted(...)`. |
| `js/copying-array-methods` | `components/lorebook/lorebook-page.tsx:186` | `[...versions].reverse()` | Fix | `versions.toReversed()`. |
| `js/copying-array-methods` | `components/lorebook/lorebook-versions-section.tsx:42` | `[...versions].reverse()` | Fix | `versions.toReversed()`. |
| `js/copying-array-methods` | `lib/sort-characters.ts:42` | `[...characters].sort(...)` | Fix | `characters.toSorted(...)`. |
| `js/copying-array-methods` | `lib/stores/chat.store.ts:46` | `[...messages].sort(...)` | Fix | `messages.toSorted(...)`. |

`toSorted`/`toReversed` son seguros aquí: el frontend usa `target: ESNext`
(`astro/tsconfigs/base`) y los receptores son arrays reales, no `Set`,
`NodeList` ni strings. No se altera la identidad del array original.

El `keyCode` del fallback IME es deliberado: la guía recomienda
`isComposing || keyCode === 229` porque Safari puede entregar el `keydown` de
confirmación después de `compositionend`. El aviso de deprecación de TypeScript
se acepta y queda documentado en el código.

## Revisión manual

| Patrón | Estado actual | Decisión | Razón |
| ------ | ------------- | -------- | ----- |
| `prefers-reduced-motion` | Solo en la web | **Fix** | Bloque global en `card-first.css`: animaciones y transiciones a 0.01 ms, `scroll-behavior: auto`. |
| `text-wrap: balance` / `pretty` | Solo en la web | **Fix** | `h1, h2, h3` con `balance`; párrafos con `pretty`. |
| Nombre accesible del chat | Solo placeholder | **Fix** | `aria-label` en el `Textarea` del chat. |
| Imágenes | `character-card` y web ya tenían `lazy`/`async` | **Fix parcial** | `character-rail`, preview de perfil y fondo de conversación con `loading="lazy"`/`decoding="async"`; cover con `fetchPriority="high"` y `decoding="async"`. |
| `field-sizing` | `Textarea` de `@workspace/ui` ya usa `field-sizing-content` | Mantener | El chat ya crece con el contenido. |
| `scrollbar-gutter` | `MessageScrollerViewport` ya usa `scrollbar-gutter-stable` | Mantener | Evita el salto al aparecer la barra durante el streaming. |
| `:has()` | `card-first.css:513` ya lo usa para el layout de campos | Mantener | No hay que duplicarlo con JS. |
| `color-scheme` | `@workspace/ui/globals.css` y web | Mantener | Claro/oscuro nativos. |
| `safe-area-inset` | Shell, chat y tarjetas | Mantener | Móvil con notch. |
| `srcset`/`sizes` | Fondo de conversación y web | Mantener | Ya hay variantes de asset. |
| `inert` / popover / dialog | Base UI/shadcn | Mantener | Gestiona foco, `inert` y top layer; no se reescribe. |
| `@container` | No se usa; hay 37 media queries | **Defer** | Requiere revisar qué componentes deben responder al contenedor, no al viewport. |
| `content-visibility: auto` | No se usa | **Defer** | Riesgo de saltos con el anclaje de scroll del chat y las listas. |
| `AbortSignal.timeout` / `any` | No se usa | **Defer** | Necesita una política de timeouts y excepciones para SSE y descargas. |
| View Transitions / `ClientRouter` | No se usa | **Defer** | Cambio de UX global; decisión de producto. |
| Fechas con `Intl` | Hay `.slice(0, 10)` y `toLocaleDateString()` sueltos | **Defer** | Es una pasada de i18n, no de plataforma web; `summary-viewer` ya usa `dateLocale`. |

## Verificación

- `legacy-scan` frontend: **7 → 0**.
- `legacy-scan` website: **0 → 0**.
- `pnpm --filter @workspace/frontend typecheck`: 0 errores (2 hints
  preexistentes: `keyCode` y `document.execCommand`).
- `pnpm --filter @workspace/frontend exec vitest run`: 94 archivos / 495 tests.
- Nuevo `message-input.test.tsx`: nombre accesible, Enter, IME nativo, fallback
  Safari y Shift+Enter.
- Revisión visual manual pendiente en la etapa de review (desktop y móvil).

## Disparadores para reabrir lo diferido

- `@container`: cuando un componente de tarjeta o panel deba cambiar de layout
  dentro de una sidebar o un diálogo estrecho sin depender del viewport.
- `content-visibility`: cuando una lista de personajes, mensajes o libros
  supere varios cientos de nodos y el profiling muestre coste de render.
- `AbortSignal`: cuando se añada una política de timeout a `apiRequest` o se
  detecten peticiones colgadas.
- View Transitions: cuando se decida una navegación animada entre pantallas.
- Fechas: cuando se unifique el formato de fecha por locale en toda la UI.
