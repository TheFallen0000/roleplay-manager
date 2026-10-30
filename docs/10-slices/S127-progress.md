# S127 — Correcciones tras probar v1.57.1

**Estado:** Completado (pendiente de release batched)
**Inicio:** 2026-10-30
**Fin:** 2026-10-30

## Descripción

Dos correcciones detectadas al probar v1.57.1:

1. “Generar resumen ahora” mostraba un error rojo genérico cuando no había
   mensajes nuevos que resumir (`NO_NEW_MESSAGES`).
2. Al entrar o volver a una conversación, el scroll quedaba bastante por encima
   del final, tanto en escritorio como en móvil.

## Decisiones y cambios

- **Aviso amarillo para `NO_NEW_MESSAGES`.** El store de resúmenes ya no se
  traga el error: lo vuelve a lanzar para que la vista pueda distinguir el
  código. `SummaryViewer` muestra `toast.warning` con la clave localizada
  `summaries.noNewMessages`; el resto de fallos siguen siendo un error rojo.
- **El scroll inicial carga los mensajes antiguos.** El problema principal era
  que el ancla inicial desplazaba el scroller y `LoadOlderOnScroll` interpretaba
  ese movimiento como que el usuario había cruzado el umbral superior; cargaba
  la página anterior, los mensajes se anteponían y el último quedaba arriba.
  Ahora la carga solo ocurre en la transición `start: true → false`, es decir,
  cuando el usuario vuelve al principio. La primera transición a `true` es el
  ancla inicial y se ignora.
- **El ancla mide alturas reales.** Los mensajes usan `content-visibility: auto`
  con una altura estimada de `10rem`. El ancla se calculaba con esa estimación y,
  al renderizarse los mensajes cercanos, sus alturas reales desplazaban el
  último mensaje hacia abajo. Se mantienen renderizados los 40 mensajes más
  recientes mediante un selector CSS, de modo que el ancla mide la altura real.
- **Sin `scrollAnchor` en los mensajes persistidos.** El primitivo del scroller
  detecta los mensajes antepuestos y desplaza el último ancla, pero como el
  primer hijo del contenido es el control de mensajes antiguos, la detección de
  “prepend” falla y salta al final. El ancla explícita (`AnchorChatToEnd`) ya
  cubre los mensajes nuevos; se quita `scrollAnchor` de los mensajes persistidos
  para que cargar antiguos no mueva la posición.
- **El control de mensajes antiguos sigue disponible.** El botón explícito del
  principio de la lista y la carga al llegar arriba siguen funcionando; tras
  cargar una página, la vista se queda en el principio de la lista ampliada.

## Criterios de aceptación

- [x] “Generar resumen ahora” sin mensajes nuevos muestra un aviso amarillo
      localizado, no un error rojo.
- [x] Al entrar o volver a una conversación, el último mensaje queda pegado al
      borde inferior del scroller.
- [x] No se cargan mensajes antiguos automáticamente al entrar.
- [x] Al subir al principio se cargan los mensajes antiguos y no se salta al
      final.
- [x] Tests de la advertencia, del ancla y de la dirección del cargador.
- [x] `pnpm check`, tests, build y `pnpm audit --prod` en verde.

## Verificación

- Reproducción en navegador con conversaciones sintéticas de 61 y 121 mensajes
  (50 por página), escritorio 1280×900:
  - Entrada y reentrada: el último mensaje termina exactamente en el borde
    inferior (`lastBottom - viewportBottom = 0`).
  - Sin carga automática de mensajes antiguos al entrar.
  - Al llegar arriba se cargan las páginas antiguas; al bajar no se cargan.
- Mismo resultado con el build de producción servido por el backend.
- Frontend: **386** tests (68 archivos).
- Backend: **706** tests (118 archivos).
- `pnpm check`, `pnpm build` y `pnpm check:arch` en verde.
- `pnpm audit --prod` limpio.
- Los datos de prueba viven en una base temporal; no se tocó la base del usuario.

## Commits

1. `fix(summary): warn when there is nothing new to summarize`
2. `fix(chat): keep the last message anchored on entry`
3. `test(frontend): cover the summary warning and older-message loading`
4. `docs(slice): document S127`
