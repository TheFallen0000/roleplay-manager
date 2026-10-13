# S77 — Capturas de instalación y atajos de la PWA (PM.32)

**Estado:** Completado
**Inicio:** 2026-10-13
**Fin:** 2026-10-13

## Descripción

Cierra PM.32 con lo que aporta valor visible: `screenshots` para el diálogo de
instalación «rico» de Chrome (biblioteca y chat en novela visual, más una
vertical del chat en el teléfono) y `shortcuts` en el icono instalado
(Tutoriales, Proveedores, Registro). `display_override` queda fuera por
decisión: sin una UI propia de `window-controls-overlay` no cambia nada.

## Decisiones

- **Arte real, datos sintéticos**: las capturas salen de la app empaquetada con
  contenido sembrado por la API de importación — dos personajes (Lyra con la
  mascota como imagen, Kael con su monograma) y una conversación de cuatro
  mensajes en novela visual con colores de diálogo. Provenance documentada en
  `docs/brand/README.md`.
- **Español** en capturas y atajos; el manifest es estático y no puede seguir el
  idioma de la UI (limitación anotada).
- **Formatos**: 1440x810 (anchas) y 720x1280 (vertical), dentro de los
  requisitos de Chrome (lados 320–3840 px, proporción ≤ 2.3:1 y mismo aspecto
  por `form_factor`).
- **Smoke ampliado**: declara capturas y atajos, y cada captura se sirve como
  PNG desde el paquete. Además, el primer smoke falló al limpiar el temporal
  (EPERM de Windows al soltar handles): la limpieza pasó a reintentarse de forma
  acotada.

## Criterios de aceptación

- [x] `screenshots` (2 anchas + 1 vertical) declaradas y servidas.
- [x] `shortcuts` (Tutoriales, Proveedores, Registro) declarados.
- [x] Capturas revisadas una a una (son arte que se publica).
- [x] Smoke del paquete **PASS** con las comprobaciones nuevas; `pnpm check` 7/7.
- [x] CHANGELOG en `[Unreleased]`; PM.32 marcada; hallazgo del scroll anotado
      como PM.33.

## Verificación

- `pnpm check` 7/7; smoke **PASS** (manifest + 3 capturas servidas + limpieza con
  reintentos); las suites las cubre la CI del PR (no hay código de app tocado).
- Sin tests unitarios nuevos: el arte es estático y el smoke lo cubre.

## Hallazgo → PM.33

Al capturar se midió que el contenido del `MessageScroller` termina con un
espacio final de ~400 px (el div sin clase que cierra el contenido), así que
**abrir una conversación deja el último mensaje muy por encima del compositor**
y el hueco se ve; con un scroll se normaliza. Anotado como PM.33 con las medidas
(viewport 558 px, spacer 396 px, `scrollTop` al máximo con el hueco visible)
para decidir si el final se ancla justo sobre el compositor.

## Commits

1. `feat(frontend): add PWA install screenshots and shortcuts`
2. `fix(tooling): retry the smoke cleanup when Windows keeps handles`
3. `docs(slice): add S77 progress and mark PM.32`
