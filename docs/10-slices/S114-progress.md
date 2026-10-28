# S114 — UX de propuestas de memoria

**Estado:** Completado (pendiente de release batched)
**Inicio:** 2026-10-28
**Fin:** 2026-10-28

## Descripción

La tarjeta de propuestas mostraba operación, actor, prioridad, título y
descripción, pero no daba contexto para decidir: una UPDATE no decía qué
memoria cambiaba ni en qué campos, una DELETE no mostraba qué se borraría y
el botón de aceptar aplicaba el borrado sin confirmar. Además, la prioridad
era un número sin escala y las operaciones aparecían en inglés.

Este slice añade contexto, confirmaciones y validación, sin tocar el backend.

### Tarjetas con contexto

- **UPDATE**: muestra la memoria actual y un diff compacto de los campos que
  cambian (`actual → propuesto`). Si no cambia nada, lo indica y deshabilita
  **Aceptar** para no resetear el decaimiento de la memoria.
- **DELETE**: muestra la memoria objetivo en un bloque destructivo y oculta
  **Editar y aceptar**, que no tiene sentido para un borrado.
- **Objetivo ausente**: aviso claro y solo **Descartar**; el servidor ya
  descartaba estas propuestas al aplicarlas.
- **CREATE**: se mantiene el título y la descripción propuestos.

### Confirmaciones

- **DELETE individual**: diálogo con la memoria que se va a borrar antes de
  aplicar la propuesta.
- **Aceptar todo**: si hay DELETE pendientes, diálogo que lista todas las
  memorias afectadas; si no hay ninguno, se aplica directamente como antes.

### Prioridad y etiquetas

- Leyenda visible (`1-3 menor · 4-6 relevante · 7-9 importante · 10
  definitorio`) y tooltip en el badge.
- Badges localizados: **Crear / Actualizar / Eliminar**.
- El diálogo de edición muestra la memoria actual como referencia.

### Validación

- Actor y título no vacíos.
- Prioridad entera entre 1 y 10.
- Un UPDATE editado sin cambios no se aplica: evita el `updatedAt` nuevo y el
  reset del decaimiento.

## Decisiones

- **Diff compacto en la tarjeta**: se ven solo los campos que cambian; los
  demás se omiten para no repetir la memoria entera.
- **Confirmar ambos borrados**: eliminar es irreversible y el modelo puede
  proponer un DELETE equivocado; la confirmación individual y la masiva
  cubren los dos caminos.
- **Objetivo ausente sin aceptar**: la propuesta no puede aplicarse; dejar el
  botón activo solo generaría un descarte silencioso en el servidor.
- **UPDATE sin cambios deshabilitado**: aplicar la misma memoria actualiza
  `updatedAt` y alarga su vida artificialmente. Se resuelve en el cliente;
  el guard del servidor queda para otro slice.
- **Sin cambios de backend**: el DTO ya expone `targetMemoryId` y el store ya
  tiene las memorias. El panel carga propuestas y memorias al abrirse.
- **Fuera de alcance**: descartar UPDATE sin cambios en el servidor (modo
  auto), respuesta solo-tool sin narrativa, indicador de propuestas fuera de
  ajustes y “Descartar todo”.

## Criterios de aceptación

- [x] UPDATE muestra el diff contra la memoria actual.
- [x] UPDATE sin cambios indica el caso y deshabilita Aceptar.
- [x] DELETE muestra la memoria objetivo y oculta la edición.
- [x] DELETE individual pide confirmación.
- [x] Aceptar todo pide confirmación cuando hay DELETE.
- [x] Objetivo ausente muestra aviso y solo permite descartar.
- [x] Leyenda y tooltip de prioridad.
- [x] Badges Crear/Actualizar/Eliminar.
- [x] Validación de actor, título y prioridad en el diálogo de edición.
- [x] Tests de la tarjeta y de los diálogos.
- [x] `pnpm check`, build y suites en verde.
- [x] CHANGELOG en `[Unreleased]`.

## Verificación

- Frontend: **346** tests (58 archivos), 9 nuevos en `proposal-list.test.tsx`.
- Backend: **664** tests (114 archivos), sin cambios.
- `pnpm check`: arquitectura 7/7, typecheck y lint verdes.
- `pnpm build`: backend, frontend y website en verde.
- `proposal-list.tsx` queda en 397 líneas y `proposal-card.tsx` en 161, dentro
  del límite de 500.

## Commits

1. `413759c feat(frontend): show proposal context and confirm deletions`
2. `docs(slice): document S114 proposal UX`
