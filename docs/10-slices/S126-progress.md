# S126 — Metadatos de tema para la PWA

**Estado:** Completado (pendiente de release batched)
**Inicio:** 2026-10-29
**Fin:** 2026-10-29

## Descripción

La barra de navegación inferior de Android se quedaba blanca al usar el tema
oscuro de la app. Esa barra la pinta el sistema/Chrome, no el HTML, así que no
puede cambiarse desde la PWA. Esta slice no intenta forzarla: deja declarado el
esquema de color y sincronizadas las variantes claro/oscuro de `theme-color`
para que la barra de estado, el fondo inicial y los controles del navegador
coincidan con el tema activo. La limitación de la barra inferior queda
documentada.

## Decisiones

- **La barra inferior no se puede tocar desde la web.** Es la barra de
  navegación del sistema Android. `theme-color` solo pinta la barra de estado y
  la barra de direcciones. En una PWA instalada (WebAPK) Chromium tiene además
  dos limitaciones conocidas: la barra inferior ignora el `theme_color`
  ([issue 40759522](https://issues.chromium.org/issues/40759522)) y el
  edge-to-edge no funciona bien en WebAPK
  ([issue 506197579](https://issues.chromium.org/issues/506197579)). Por eso la
  página no puede pintar su fondo oscuro detrás de la barra de gestos.
- **`<meta name="color-scheme" content="light dark">`**: declara que la app
  soporta ambos esquemas antes de que cargue el CSS. El CSS ya define
  `color-scheme: light` en `:root` y `dark` en `.dark`; el meta evita el
  destello claro del canvas inicial y ayuda a los controles nativos.
- **Dos `theme-color` con `prefers-color-scheme`**: uno claro y otro oscuro,
  con el claro primero como fallback. Cuando el modo es `system`, el navegador
  elige el que coincide con el sistema antes de que corra JavaScript.
- **Sincronización con el tema de la app**: `rm-bootstrap.js` (antes del primer
  pintado) y `ThemeProvider` actualizan **todas** las variantes de
  `theme-color`. Así, si el usuario fuerza un tema distinto al del sistema, la
  barra de estado y la ventana del navegador siguen el tema de la app.
- **El manifest sigue siendo estático claro.** Sus colores se usan para el
  splash y el arranque de la WebAPK, no para la barra inferior; cambiarlos a
  oscuro rompería el splash del tema claro. La solución real para la barra
  inferior sería un TWA/nativo con `navigationColor`/`navigationColorDark`, pero
  el empaquetado para stores está descartado en PM.41.
- **Sin `display: fullscreen`.** Ocultaría la barra inferior, pero también la de
  estado y cambia la navegación; no es un cambio que corresponda a esta slice.

## Criterios de aceptación

- [x] `base.astro` declara `color-scheme` y las variantes claro/oscuro de
      `theme-color`.
- [x] `rm-bootstrap.js` y `ThemeProvider` actualizan todas las variantes.
- [x] Test de `ThemeProvider` que cubre el cambio de tema y las dos variantes.
- [x] `pnpm check`, tests y build en verde.
- [x] Limitación documentada en el CHANGELOG y en esta slice.

## Verificación

- Frontend: tests en verde.
- `pnpm check`, `pnpm build` y `pnpm check:arch` en verde.
- `pnpm audit --prod` limpio.
- Pendiente de probar en el móvil: la barra inferior seguirá siendo del
  sistema. Con el móvil y Chrome en oscuro puede cambiar, pero no está
  garantizado desde la web.

## Notas para probar

- La barra inferior puede seguir blanca aunque Android esté en oscuro si Chrome
  tiene su propio tema fijado en claro (Ajustes de Chrome → Tema). No lo
  controla la app.
- Los colores del manifest se fijan al instalar la WebAPK. Si se cambia el
  manifest, hay que reinstalar la PWA para ver el efecto en el splash/arranque;
  la barra inferior sigue dependiendo de Chrome/Android.
- La única solución fiable para forzar el color sería un TWA/nativo con
  `navigationColor`/`navigationColorDark`, descartado en PM.41.

## Commits

1. `fix(pwa): declare the color scheme and sync theme-color variants`
2. `test(frontend): cover theme-color variants`
3. `docs(slice): document S126 and the Android navigation bar limitation`
