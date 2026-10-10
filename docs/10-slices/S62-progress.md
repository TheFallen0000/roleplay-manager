# S62 — Delicia y cierre

**Estado:** Completado
**Inicio:** 2026-10-09
**Fin:** 2026-10-09

## Descripción

Cuarto y último slice del rediseño (`docs/redesign-plan.md` §9): la capa de
delicia (pincelada de streaming, entrada suave de mensajes y la mascota en
todos los estados), el pase `mobile-native` (plataforma táctil completa:
tap sin destello, sin pull-to-refresh, inputs sin zoom en iOS y safe-areas
del notch) y la auditoría de accesibilidad (reduced-motion global,
`aria-current` en la navegación y `theme-color` sincronizado con el modo
real de la app). Cierra el rediseño con **`DESIGN.md` +
`.impeccable/design.json`**, las capturas de verificación y el detector.

## Decisiones

- **Presupuesto de movimiento**: solo tres animaciones, todas con intención
  — la pincelada `.rm-caret` como único cursor de streaming (trazo con
  `clip-path`, pulso de 1.1 s), la entrada `rm-message-enter` para mensajes
  nuevos (160 ms, 4 px, una sola curva `cubic-bezier(0.22, 1, 0.36, 1)`) y
  el destello dorado de hito existente. Nada anima bordes ni adornos, todo
  va sobre `transform`/`opacity` y **`prefers-reduced-motion` global** lo
  amortigua (regla base que cubre también las animaciones futuras).
- **Mascota en todos los estados**: biblioteca vacía (ya existía), búsqueda
  sin resultados (`thinking`), chat sin mensajes (`sparkle`) y personaje no
  encontrado (`sorry`, con el contenedor alineado al lenguaje de estados
  vacíos). El arte de poses nuevas sigue **en producción por el usuario**
  (§7.1); `MascotPose` cae al arte neutral y las poses entrarán sin cambios
  de código.
- **Pase `mobile-native`** (skill aplicada punto por punto):
  - *Viewport*: `viewport-fit=cover` + `interactive-widget=resizes-content`.
  - *Safe-areas*: padding `env(safe-area-inset-*)` en el header del shell y
    el compositor del chat; la altura del chat (`100dvh − Xrem`) resta
    también `env(safe-area-inset-top)` para que el notch no desborde el
    layout — el cálculo desktop queda idéntico porque `env()` es 0.
  - *Tacto*: `-webkit-tap-highlight-color: transparent`,
    `touch-action: manipulation` y `user-select: none` en controles;
    `overscroll-behavior: none` en la raíz (el scroller del chat ya tenía
    `overscroll-contain`).
  - *Inputs*: 16 px con `pointer: coarse` para que iOS no haga zoom al
    enfocar; `-webkit-text-size-adjust: 100%` contra la inflación de texto.
- **a11y**: `aria-current="page"` en el elemento activo de la sidebar y
  `theme-color` que sigue al **modo real** (claro `#fbfafd` / oscuro
  `#17131f`) desde el script anti-flash y el provider — no a la preferencia
  del sistema, que puede discrepar cuando el usuario fuerza un modo.
- **`DESIGN.md`** escrito con el flujo de `impeccable` en modo scan desde
  las decisiones ya aprobadas y verificadas contra el código: north star
  «Tinta viva», frontmatter con tokens (colores, tipografía, radios,
  componentes), reglas con nombre (**The Ink-Before-Chrome**, **The One
  Sparkle**, **The Two-Modes**, **The Quiet Body**, **The Flat-by-Default**)
  y `.impeccable/design.json` con rampas tonales, sombras, motion,
  breakpoints y ocho componentes con HTML/CSS autocontenido. El detector ya
  lo carga como contexto y desactiva con él el falso positivo del violeta
  (marca declarada, no «tell» de IA).
- **Trade-off de S61 revisado**: un único hex por diálogo en ambos modos se
  mantiene; sin demanda del usuario, el aclarado del 18 % en oscuro sigue
  siendo la compensación y no se añaden colores por modo.

## Criterios de aceptación

- [x] Pincelada de streaming, entrada de mensajes y reduced-motion global.
- [x] Mascota en estados vacíos de biblioteca/búsqueda/chat y en
      «personaje no encontrado» (con fallback de pose).
- [x] Pase `mobile-native` completo (tap, scroll, inputs, safe-areas, meta).
- [x] `aria-current` en la navegación y `theme-color` sincronizado.
- [x] `DESIGN.md` + `.impeccable/design.json` con tokens verificados contra
      el código real (clamps, tamaños y familias).
- [x] Capturas de cierre: welcome, biblioteca vacía, búsqueda sin
      resultados, novela visual (colores personalizados) y chat vacío.
- [x] Tests: backend 486 (85 archivos), frontend 265 (42 archivos);
      `pnpm check` 4/4 (7 chequeos de arquitectura).
- [x] Detector limpio sobre los archivos tocados.
- [x] Release v1.40.0 + changelog.

## Verificación

- `pnpm check` 4/4; `pnpm --filter @workspace/backend test` 486 ✓;
  `pnpm --filter @workspace/frontend exec vitest run` 265 ✓.
- Capturas con Chrome headless contra un backend aislado (`DATABASE_PATH` +
  `DATA_DIR` temporales, `TURBO_ENV_MODE=loose`), personaje y conversaciones
  sembrados por API + SQLite: se revisaron welcome (es), biblioteca vacía
  con mascota, búsqueda `zzz` sin resultados con mascota, novela visual con
  colores personalizados (verde/rojo de prueba) y chat sin mensajes con
  mascota.
- Detector de `impeccable` sobre los componentes tocados: sin hallazgos;
  nota esperada «purple/violet check off» porque `DESIGN.md` declara el
  violeta de marca.
- **Nota de honestidad móvil**: las safe-areas (`env(safe-area-inset-*)`)
  valen 0 en headless y en navegador de escritorio, así que su efecto solo
  se puede confirmar en hardware real (iOS/Android con notch). El resto del
  pase táctil (tap, overscroll, inputs) tampoco se percibe en una captura:
  queda verificado por código y pendiente de la prueba del usuario en el
  teléfono, que ya usa la app en modo phone.
- **Caveat de captura conocido**: `content-visibility: auto` del scroller de
  mensajes produce *smearing* en capturas CDP hasta un scroll real; los
  scripts hacen un micro-scroll antes de disparar (documentado en S61).

## Commits

1. `feat(ui): add motion, touch and reduced-motion base styles`
2. `feat(frontend): mascot states, brush caret and mobile-native pass`
3. `docs: add DESIGN.md and design token sidecar`
4. `docs(slice): add S62 progress`
5. `release: bump to v1.40.0 and add changelog entry`
