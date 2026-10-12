# S68 — Modo pantalla completa para el chat

**Estado:** Completado
**Inicio:** 2026-10-12
**Fin:** 2026-10-12

## Descripción

El chat gana un **modo de foco a pantalla completa**: se superpone a todo el
shell (sidebar, encabezado y padding), la imagen de fondo se extiende de borde a
borde y queda solo lo esencial — mensajes (en cualquiera de sus estilos), sus
menús contextuales y el compositor. Se entra desde el menú del botón de ajustes
de la conversación («Pantalla completa») y se sale con el botón flotante o
`Esc`.

## Decisiones

- **Solo overlay interno** (elegido): nada de Fullscreen API. El chat pasa a
  `fixed inset-0 z-50 bg-background`, lo que tapa el shell sin depender del
  navegador y funciona también en iOS.
- **Entrada en el menú de ajustes** (como pidió el usuario): un ítem más con
  separador, en vez de un botón extra en el encabezado (que se aplastaba con
  títulos largos) o enterrarlo en Personalización.
- **Salidas**: `Esc` + botón flotante discreto arriba a la derecha
  (imprescindible en móvil, donde no hay tecla). El modo **no se persiste**.
- **Pie translúcido** (elegido): en pantalla completa el compositor usa
  `bg-background/80 + backdrop-blur`, de modo que el fondo llega hasta abajo.
- **El encabezado se oculta** (`hidden`) en lugar de desmontarse: conserva el
  estado del título y simplifica el diff.
- **Extracción de `chat-header.tsx`**: al añadir el modo, `chat.tsx` pasó de
  las 500 líneas (regla de `check:arch`), así que el encabezado (título
  editable, menú contextual y botón de ajustes) vive ahora en su componente.
  De paso, el `aria-label` del enlace al personaje (que estaba hardcodeado en
  español) pasó a i18n.
- **Hook propio** `use-fullscreen-focus` (estado + `Esc`), testeable aislado.

## Criterios de aceptación

- [x] «Pantalla completa» aparece en el menú solo cuando hay handler y entra al
      modo.
- [x] En pantalla completa el chat ocupa exactamente el viewport, el encabezado
      se oculta, el fondo cubre el área de mensajes y el compositor sigue
      visible.
- [x] Se sale con `Esc` y con el botón flotante; los mensajes conservan sus
      menús contextuales.
- [x] Fuera del modo, todo queda como antes (sidebar, encabezado, sin botón).
- [x] Gates + tests + smoke en verde; PR con CI verde y release v1.41.0.

## Verificación

Playwright contra el **paquete empaquetado**, con una conversación real y una
imagen de fondo, en dos viewports:

| Métrica | Desktop 1280×800 | Móvil 320×640 |
|---|---|---|
| Raíz en pantalla completa | 0,0→1280,800 `fixed` z-50 | 0,0→320,640 `fixed` z-50 |
| Encabezado del chat | `display: none` | `display: none` |
| Fondo cubre el área de mensajes | 1280×723 ✓ | 320×563 ✓ |
| Compositor visible | ✓ | ✓ |
| `Esc` / botón de salida | vuelven al modo normal ✓ | ✓ |

- En modo normal: raíz estática dentro del shell, encabezado visible, sin botón
  de salida y fondo a 974×564 (desktop) / 286×420 (móvil).
- Tests: 14 focalizados (hook + menú) y suites completas (backend 486,
  frontend 270). `pnpm check` 7/7 tras extraer el encabezado.
- Capturas `desktop-fullscreen.png` / `mobile-fullscreen.png` revisadas.

## Commits

1. `feat(frontend): add the chat fullscreen focus mode`
2. `docs(slice): add S68 progress`
3. `release: bump to v1.41.0 and add changelog entry`
