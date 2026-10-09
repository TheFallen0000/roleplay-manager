# S59 — Fundación «Ink & Violet»

**Estado:** Completado
**Inicio:** 2026-10-09
**Fin:** 2026-10-09

## Descripción

Primer slice del rediseño visual (plan en `docs/redesign-plan.md`): sustituye
el mundo visual del frontend por **«Tinta y Violeta»** — papel frío y tinta
violeta con el color de la mascota como acento — sobre la dirección aprobada
en los prototipos de Fase 0 (`docs/prototypes/`). Entrega la fundación: tokens
de color con cinco mundos (claro y oscuro completos), tipografías nuevas
servidas en local y el rediseño de la pantalla de bienvenida, que ahora es la
portada del producto (nombre, mascota, promesa) más las tres decisiones de
primer arranque como placas de tinta.

## Decisiones

- **Tokens antes que pantallas.** Todo el sistema vive en
  `packages/ui/src/styles/globals.css`; el resto de pantallas (shell, chat)
  se rediseñan en S60/S61 heredando estos tokens sin cambios estructurales.
- **Cinco mundos con ids estables**: `default` (Tinta y violeta), `sakura`,
  `forest`, `ocean` y `midnight`; se conservan los ids existentes para no
  romper el `localStorage` de nadie. Los bloques `[data-theme="…"]`
  redefinen el juego completo de tokens, también en oscuro.
- **Tipografía**: Dela Gothic One para el nombre y momentos grandes, Zen Maru
  Gothic para títulos, Zen Kaku Gothic New para el cuerpo (la prueba que el
  usuario pidió validar en el prototipo), con Geist como reserva. Fontsource
  con subconjuntos `latin`, servidos en local.
- **Grano de papel, no degradados.** El detector de `impeccable` marcó las
  aguadas violeta de fondo como «tell» de UI generada por IA (gradiente
  violeta). Se sustituyeron por un grano de papel apenas visible
  (`.rm-paper-grain`) y la portada se apoya en tipografía y mascota: más
  fiel al mundo y más limpio.
- **Tokens nuevos listos para S61**: `--primary-soft`, `--spark` y los
  colores de diálogo (`--dialogue-char` / `--dialogue-user`, por mundo y
  modo) quedan definidos aunque el chat aún no los consuma.
- **Copy del welcome**: nuevas claves i18n (`tagline`, `world`, `worldHint`,
  `privacy`); el CTA pasa a «Empezar a escribir» / «Start writing» y el
  nombre de la marca no se traduce. El destello dorado dura ~420 ms antes de
  recargar y respeta `prefers-reduced-motion`.
- **Arte de la mascota diferido** (plan §7.1): la bienvenida y el estado
  vacío usan el arte existente; el componente caerá a la pose neutral cuando
  lleguen las variantes.
- **Superficies del navegador** afinadas desde la paleta: selección, cursor
  de texto, barras de desplazamiento y anillo de foco.

## Criterios de aceptación

- [x] `globals.css` con 5 mundos × claro/oscuro completos y mapeo en
      `@theme` (`--font-display`, `--font-heading`, `--color-primary-soft`,
      `--color-spark`, `--color-dialogue-*`).
- [x] Tipografías (Dela Gothic One, Zen Maru Gothic, Zen Kaku Gothic New)
      instaladas en `@workspace/ui` e importadas por subsets `latin`.
- [x] Selector de temas (welcome y menubar) con los 5 mundos y muestras
      actualizadas; ids existentes intactos.
- [x] Welcome rediseñado: portada, mascota, placas de idioma/mundo/modo,
      grano de papel, destello de un solo uso y aviso local-first.
- [x] i18n es/en con las claves nuevas; tests del registro de temas y del
      welcome actualizados.
- [x] `pnpm check` en verde y suite completa del frontend en verde.

## Verificación

- `pnpm check:arch` 7/7; `pnpm typecheck` y `pnpm lint` sin errores.
- `pnpm --filter @workspace/frontend exec vitest run`: 42 archivos,
  259 tests ✓.
- Detector de `impeccable` con **render real** sobre el welcome servido en
  dev (`http://localhost:4321/`), escritorio 1280×800 y móvil 390×844:
  sin hallazgos tras cambiar las aguadas por el grano.
- SSR comprobado: sin cookie renderiza el welcome (inglés por defecto); con
  `rm_onboarded=1` renderiza el shell con los tokens nuevos.

## Commits

1. `feat(ui): add the Ink & Violet tokens, fonts and five worlds`
2. `feat(frontend): redesign the welcome and add the new worlds`
3. `docs(slice): add S59 progress`
4. `release: bump to v1.37.0 and add changelog entry`
