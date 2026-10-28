# S116 — Pulido visual de la interfaz

**Estado:** En curso
**Inicio:** 2026-10-28

## Descripción

Revisión de detalles estéticos reportados por el usuario. El bloque se cierra
cuando estén todos; no hay release propio.

## Cambios

### Lista de tarjetas del editor de personaje

`character-form.tsx` limitaba la lista a `max-h-96` (384 px), así que en
pantallas grandes aparecía un scroll interno aunque hubiera espacio libre
debajo. Ahora el tope es `max(24rem, 100svh - 20rem)`: conserva los 384 px
como mínimo en pantallas pequeñas y usa el alto disponible bajo las pestañas
en pantallas grandes. El desplazamiento interno y el botón fijo de añadir
tarjeta se mantienen.

## Decisiones

- **Sin quitar el scroll interno**: el botón «Añadir tarjeta» es sticky; si la
  lista creciera sin tope, el botón podría solaparse con el header al hacer
  scroll en la página.
- **20rem de reserva**: cubre el header del shell, el header del formulario,
  las pestañas, la pista y los paddings. Es una estimación; el `max()` con
  24rem evita que en pantallas pequeñas el tope baje del actual.
- **Sin cambios de comportamiento**: solo CSS; no hay cambios de datos ni de
  API.

## Criterios de aceptación

- [x] La lista usa el alto disponible en pantallas grandes.
- [x] En pantallas pequeñas conserva el tope de 384 px como mínimo.
- [x] El scroll interno y el botón sticky siguen funcionando.
- [x] `pnpm check` y build en verde.
- [x] `[Unreleased]` actualizado.

## Commits

1. `fix(frontend): let the character card list use the available height`
