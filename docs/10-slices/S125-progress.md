# S125 — Correcciones tras probar v1.57.0

**Estado:** Completado (pendiente de release batched)
**Inicio:** 2026-10-29
**Fin:** 2026-10-29

## Descripción

Correcciones detectadas al probar la ventana de contexto y la compactación en
v1.57.0:

1. La lista de resúmenes se rompía en móvil.
2. El resumen manual no refrescaba el porcentaje y podía provocar otra
   compactación.
3. “Continuar” devolvía respuestas vacías o demasiado cortas.
4. Al entrar en un chat el scroll no quedaba al final.
5. La compactación podía terminar en `CONTEXT_TOO_LARGE` y bloquear el envío.

## Decisiones y cambios

- **Resúmenes en móvil.** El botón de generar ocupa todo el ancho en pantallas
  pequeñas y el encabezado de cada tarjeta se apila (fecha y modelo). El nombre
  del modelo se trunca con `title` para no aplastar la fecha.
- **Resumen manual = compactación real.** `POST
  /api/conversations/:id/summaries/generate` ahora ejecuta el mismo motor de
  compactación con `force` y conserva como máximo los 2 mensajes más recientes.
  Así el resultado apunta al 60 % y el siguiente envío no vuelve a compactar de
  inmediato. Si la conversación es demasiado corta, devuelve `NO_NEW_MESSAGES`.
- **El porcentaje se refresca.** `SummaryViewer` avisa a `useContextUsage`
  después de generar, editar o borrar un resumen; la cabecera vuelve a pedir
  `/context/stats` y actualiza el indicador.
- **Continuar con instrucción sintética.** El caso de uso añade un mensaje de
  usuario no persistido (“Continúa la escena…”) al final del contexto. No se
  guarda ni se muestra, pero obliga al modelo a producir un turno nuevo en vez
  de recibir un contexto que termina en un mensaje del asistente.
- **Scroll al final.** Los elementos del scroller pasan su `messageId` y
  `AnchorChatToEnd` usa `scrollToMessage(..., { align: "end" })`; el
  `scrollToEnd` queda solo como fallback. Esto elimina el hueco del spacer.
- **Presupuesto de compactación dinámico.**
  - El resumen ya no recibe un presupuesto fijo del 10 % de la ventana: se
    calcula el espacio real después del prompt de sistema, los mensajes mínimos
    y la reserva de respuesta.
  - Si la reserva de respuesta es lo que no cabe, se reduce para ese envío
    (mínimo 256 tokens) y se emite `context-warning` con `OUTPUT_REDUCED`.
  - La comparación final usa `inputTokens` contra el presupuesto de entrada, no
    `totalTokens` contra un presupuesto que ya excluía la salida.
  - Si aun así el resumen generado no cabe, se recorta o se descarta como último
    recurso (`SUMMARY_DROPPED`) en lugar de bloquear la conversación. Solo se
    devuelve `CONTEXT_TOO_LARGE` si el prompt de sistema + el último turno +
    la reserva mínima tampoco caben.

## Criterios de aceptación

- [x] La lista de resúmenes no se desborda en móvil y el modelo se trunca.
- [x] Generar/editar/borrar un resumen refresca el indicador de contexto.
- [x] El resumen manual compacta de verdad y no repite la compactación.
- [x] Continuar envía una instrucción sintética al final del contexto.
- [x] El chat queda anclado al último mensaje al entrar.
- [x] La compactación reduce el presupuesto del resumen y, si hace falta, la
      reserva de respuesta; avisa al usuario.
- [x] Los casos extremos caen en recorte/descarte de resumen, no en un error
      inmediato.
- [x] Tests de compactación, continuación, resumen y scroll.
- [x] `pnpm check`, build y suites en verde.

## Verificación

- Backend: **706** tests (118 archivos).
- Frontend: **383** tests (68 archivos).
- `pnpm check`, `pnpm build` y `pnpm check:arch` en verde.
- `pnpm audit --prod` limpio.

## Commits

1. `fix(backend): stabilize compaction and continuation`
2. `test(backend): cover compaction budgets and continuation`
3. `fix(frontend): fix summary layout, scroll and context refresh`
4. `docs(slice): document S125 fixes`
