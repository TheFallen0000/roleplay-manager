# S120 — Ancho de la burbuja del mensaje del usuario

**Estado:** Completado (pendiente de release batched)
**Inicio:** 2026-10-28
**Fin:** 2026-10-28

## Descripción

En modo de burbujas, el mensaje del usuario se veía comprimido en pantallas
grandes: el texto se partía en líneas muy cortas y la burbuja no podía usar el
ancho disponible como la del personaje.

## Causa

`MessageContent` aplica `align-self: end` a sus hijos directos cuando el
mensaje está alineado al usuario:

```
group-data-[align=end]/message:*:data-slot:self-end
```

El `ContextMenuTrigger` es ese hijo directo, así que dejaba de estirarse y se
encogía a su contenido. La burbuja tiene `w-fit max-w-[80%]`; al calcular el
80 % contra un trigger ya encogido, el límite se aplicaba sobre el ancho
natural de la propia burbuja y la dejaba aún más estrecha. El mensaje del
personaje no sufría el problema porque su trigger sí se estiraba al ancho
completo.

Medición con Helium headless a 1200 px, mismo texto:

| | Trigger | Burbuja |
|---|---:|---:|
| Antes | 370 px | 296 px (80 % del trigger encogido) |
| Ahora | 1200 px | 370 px (ancho natural) |

Los mensajes largos del usuario ya pueden usar el 80 % real del ancho del chat,
igual que los del personaje.

## Cambio

`ContextMenuTrigger` del mensaje pasa a:

```
w-full min-w-0 select-text
```

La burbuja sigue con `ml-auto`, así que se alinea a la derecha sin encogerse.
El límite `max-w-[80%]` ahora se resuelve contra el ancho completo disponible.
El menú contextual del mensaje cubre toda la fila, no solo la burbuja.

## Decisiones

- **No quitar `max-w-[80%]`**: el límite sigue siendo el correcto para que un
  mensaje largo no ocupe toda la pantalla; el fallo era el contenedor, no el
  límite.
- **No forzar ancho completo de la burbuja**: los mensajes cortos siguen
  ocupando su ancho natural, como en cualquier chat. Lo que se arregla es que
  ese ancho natural ya no se reduzca.
- **Aplica a todas las resoluciones y estilos**: el trigger es común a burbuja,
  documento y novela; en los estilos de ancho completo la burbuja ya usa
  `w-full max-w-full`.

## Criterios de aceptación

- [x] La burbuja del usuario usa su ancho natural en burbujas.
- [x] Los mensajes largos pueden llegar al 80 % del ancho del chat.
- [x] La alineación a la derecha y el menú contextual siguen funcionando.
- [x] Test de layout/trigger en `message.test.tsx`.
- [x] `pnpm check`, build y suites en verde.
- [x] `[Unreleased]` actualizado.

## Verificación

- Medición headless con Helium: antes `trigger 370 / bubble 296`; ahora
  `trigger 1200 / bubble 370` con el mismo texto.
- Frontend: **352** tests (58 archivos).
- Backend: **672** tests, sin cambios.
- `pnpm check` y `pnpm build` en verde.

## Commits

1. `fix(frontend): let user bubbles use the available width`
2. `docs(slice): document S120 chat bubble width`
