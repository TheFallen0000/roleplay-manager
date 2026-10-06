# S37 — Ajustes de la prueba en el teléfono (v1.25.4)

**Estado:** Completado
**Inicio:** 2026-10-06
**Fin:** 2026-10-06

## Descripción

Tres correcciones encontradas al usar la app desde el teléfono:

1. **Mismatch de hidratación** en la consola: el punto de estado del menú
   «Teléfono» se pintaba con el estado cacheado en `localStorage` durante el
   primer render del cliente, pero el servidor no lo había renderizado.
2. **Desborde de la tarjeta de instancias del proveedor** en pantallas
   estrechas: con el badge «Seleccionada» visible, los iconos de editar y
   eliminar se descuadraban y salían del cuadro.
3. **Hueco inferior en el chat**: el contenedor usaba
   `h-[calc(100vh-8rem)]`, que no coincide con la altura real disponible
   (header de 3rem + padding de 2rem en móvil / 3rem en `sm+`).

## Decisiones

- **Hidratación**: el store del túnel ya no lee `localStorage` en su estado
  inicial (servidor y primer render del cliente coinciden en `null`); la nueva
  acción `hydrateFromCache()` carga la caché en un efecto al montar el menubar.
  Tests: store (3 casos) y menubar (el punto aparece tras hidratar).
- **Tarjeta de instancias**: `min-w-0` en el botón de selección y en la fila del
  nombre, `flex-wrap` para que el badge baje de línea cuando no cabe,
  `shrink-0` en badge e iconos, y URL con `truncate`. Verificado a 390 px: los
  dos botones quedan dentro de la tarjeta y sin desborde (`scrollWidth <=
  clientWidth`).
- **Chat**: `h-[calc(100dvh-5rem)] sm:h-[calc(100dvh-6rem)]`. Se usa `dvh`
  (viewport dinámico) en lugar de `vh`, que sufre con la barra del navegador
  móvil. Verificado con mediciones en escritorio (1280×800: hueco = padding de
  24 px) y móvil (390×844: hueco = 16 px), sin scroll de página y con scroll
  interno del visor de mensajes.

## Criterios de aceptación

- [x] Sin errores de hidratación al cargar la app (verificado en navegador).
- [x] El punto de estado aparece tras hidratar (no antes).
- [x] Los iconos de la tarjeta quedan dentro en pantallas de 390 px.
- [x] El chat llena el alto disponible sin hueco inferior en móvil y escritorio.
- [x] `pnpm check` sin warnings; backend (381) y frontend (217) en verde.
- [x] `pnpm build` correcto.

## Commits

1. `fix(frontend): avoid the tunnel dot hydration mismatch`
2. `fix(frontend): keep provider instance actions inside the card`
3. `fix(frontend): make the chat fill the available height`
4. `docs(slice): add S37 progress`
5. `release: bump to v1.25.4 and add changelog entry`
