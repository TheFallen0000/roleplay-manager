# S115 — Propuestas: UPDATE sin cambios, solo-tool y orden de guardado

**Estado:** Completado (pendiente de release batched)
**Inicio:** 2026-10-28
**Fin:** 2026-10-28

## Descripción

Cierre de los tres casos límite que quedaban en el flujo de propuestas de
memoria:

1. **UPDATE sin cambios**: aceptar una propuesta idéntica a la memoria actual
   actualizaba `updatedAt` y alargaba artificialmente su decaimiento.
2. **Respuesta solo-tool**: si el modelo llamaba a `propose_memory_changes` y
   no devolvía narrativa, el turno terminaba en `EMPTY_RESPONSE` y las
   propuestas se perdían.
3. **Orden de guardado**: las propuestas se guardaban **después** de emitir
   `done`; el frontend recargaba la lista al recibirlo y podía ver una lista
   vieja.

### UPDATE sin cambios

- `Memory.matches()` compara actor, título, descripción y prioridad.
- `ApplyMemoryChanges` y `ApplyAllMemoryChanges` descartan la propuesta
  marcándola como `discarded` y sin llamar a `update`, así que `updatedAt` no
  cambia y el decaimiento sigue su curso.
- Aplica tanto al modo manual como al automático.

### Orden de guardado

- Nuevo helper `saveMemoryProposals()` compartido por `send`, `continue` y
  `regenerate`: crea las entidades pendientes con un timestamp común y
  centraliza el log de error.
- El guardado y el auto-apply ocurren **antes** del evento `done`; el cliente
  ya puede recargar propuestas y memorias sin carrera.
- El bloque triplicado de creación de entidades desaparece de los tres casos
  de uso.

### Respuesta solo-tool

- Si no hay narrativa pero sí propuestas, se guardan como pendientes antes de
  devolver `EMPTY_RESPONSE`.
- En modo auto **no** se aplican: el turno falló y es más seguro que el usuario
  las revise.
- El frontend recarga propuestas y memorias en `onError`, así el panel y el
  badge se actualizan aunque el evento sea un error.

## Decisiones

- **Descartar, no aplicar en silencio**: el estado `discarded` refleja que no
  hubo cambio; marcar `applied` sugeriría una escritura que no existe.
- **Guardar antes de `done`**: la alternativa era emitir un evento nuevo
  (`proposals-generated`) y que el cliente esperase; mover el guardado es más
  simple y elimina la carrera para todos los clientes.
- **Solo-tool queda pendiente**: aplicar memorias de un turno sin narrativa en
  modo auto sería arriesgado; el usuario conserva la decisión.
- **Helper compartido**: evita que los tres flujos vuelvan a divergir en el
  futuro.
- **Fuera de alcance**: reintentar automáticamente la narrativa cuando el
  modelo solo llama a la herramienta, y un evento específico para propuestas
  guardadas.

## Criterios de aceptación

- [x] Un UPDATE idéntico se descarta sin tocar `updatedAt` (manual y auto).
- [x] Las propuestas se guardan antes de `done`.
- [x] Una respuesta solo-tool guarda las propuestas y devuelve
      `EMPTY_RESPONSE`.
- [x] El frontend refresca propuestas y memorias tras un error de streaming.
- [x] Tests de los dos flujos de aplicación, del orden `done` y del caso
      solo-tool.
- [x] `pnpm check`, build y suites en verde.
- [x] CHANGELOG en `[Unreleased]` y docs de los casos de uso actualizados.

## Verificación

- Backend: **668** tests (114 archivos), 4 nuevos.
- Frontend: **346** tests (58 archivos), sin cambios de suites.
- `pnpm check`: arquitectura 7/7, typecheck y lint verdes.
- `pnpm build`: backend, frontend y website en verde.

## Commits

1. `7235a1f fix(backend): discard no-op updates and save proposals before done`
2. `45ef6cb fix(frontend): refresh proposals after a streaming error`
3. `docs(slice): document S115 proposal edge cases`
