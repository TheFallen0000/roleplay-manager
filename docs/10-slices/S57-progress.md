# S57 — Scroll del diálogo Teléfono en pantallas pequeñas

**Estado:** Completado
**Inicio:** 2026-10-08
**Fin:** 2026-10-08

## Descripción

En pantallas pequeñas, el diálogo Teléfono (pestaña de Tailscale activa y
«Ajustes del enlace» expandida) crecía más allá del viewport y su contenido
quedaba fuera de alcance: `DialogContent` no tenía altura máxima.

## Decisión

- **Un único scroll para todo el diálogo** (elegido por el usuario):
  `max-h-[85dvh] overflow-y-auto overscroll-contain` en `DialogContent`, sin
  `ScrollArea` ni cabecera fija. El título, la descripción y las pestañas
  scrollean con el resto.
- `dvh` (y no `vh`) para que en el móvil cuente la altura visible real con la
  barra del navegador.
- `overscroll-contain` evita que, al llegar al final, el scroll se propague a la
  página del fondo (iOS).

## Criterios de aceptación

- [x] El diálogo nunca supera la altura visible; su contenido es alcanzable con
      scroll en ventanas bajas o móvil.
- [x] Sin regresiones en los tests del diálogo (15) ni en el resto de la suite.
- [x] Gates, build, paquete y smoke en verde.

## Verificación

- Frontend **259** tests en verde, `pnpm check` 7/7, build ✓, paquete + smoke
  **PASS**.
- Comprobación visual final del usuario (jsdom no calcula layout): en el móvil y
  con la ventana baja.

## Commits

1. `fix(frontend): scroll the phone dialog on short screens`
2. `docs(slice): add S57 progress`
3. `release: bump to v1.36.1 and add changelog entry`
