# S117 — Flujo de actualización tras aplicar

**Estado:** Completado (pendiente de release batched)
**Inicio:** 2026-10-28
**Fin:** 2026-10-28

## Descripción

El panel de actualizaciones daba la impresión de que la actualización no se
había aplicado: tras reiniciar seguía mostrando el botón **Reiniciar ahora** y
no confirmaba la versión nueva.

### Causa

- El trabajo de actualización vive en memoria del backend, pero el panel
  guardaba el `UpdateStatusDTO` completo en `localStorage`.
- Al terminar, la caché conservaba `job.step = "done"`; tras reiniciar, el
  backend nuevo no tenía job, pero el panel cargaba la caché y el TTL de una
  hora impedía refrescar. El botón se pintaba con `job.step === "done"`.
- `currentVersion` salía del puntero `current`, que el instalador cambia antes
  de reiniciar, así que no distinguía la versión en ejecución de la instalada.
- Si la app no volvía, la espera terminaba a los 120 s sin avisar.

### Modelo de estado

- `UpdateStatusDTO` añade `installedVersion` y `restartRequired`.
  `currentVersion` pasa a ser la versión del proceso que sirve la app.
- El launcher exporta `RM_RUNNING_VERSION`; si falta (primera actualización
  desde un launcher antiguo), el adaptador lee el `package.json` de la app en
  ejecución.
- El adaptador compara la versión en ejecución con el puntero `current` y
  calcula `restartRequired`; `behind` se calcula contra la versión instalada y
  `canApply` se desactiva mientras haya un reinicio pendiente.
- `apply` rechaza una segunda actualización si ya hay un reinicio pendiente.

### UI

- La tarjeta de versión muestra **Versión actual**, **Versión instalada**
  (cuando difieren), **Última versión** y el badge **Reinicio pendiente**.
- El bloque de actualización disponible se oculta mientras hay un reinicio
  pendiente.
- Nueva tarjeta **Actualización lista para reiniciar** con la versión
  instalada, la que sigue en ejecución, el aviso de que cerrar y abrir también
  aplica el cambio y el botón **Reiniciar ahora**.
- Tras reiniciar, banner persistente **Actualizado a la versión X** (o **Has
  vuelto a la versión X** en un rollback), descartable, y sin botón de
  reiniciar.
- Si la app no responde en ~2 minutos, error claro y botón para reintentar.
- El panel se sincroniza con el backend al montarse (`refresh()` local) y solo
  consulta GitHub si el TTL de una hora ha vencido.
- Antes de reiniciar se guarda un marcador `{ from, to, kind }` y se limpia la
  caché del estado; al volver, el marcador se convierte en el banner de éxito
  y se elimina.

## Decisiones

- **Versión en ejecución vs instalada**: el puntero `current` cambia al
  instalar, no al reiniciar. Separarlas es lo que permite que el botón dependa
  de un hecho real y no del `job` en memoria.
- **Launcher + fallback**: `RM_RUNNING_VERSION` es explícito; el fallback al
  `package.json` de la app cubre la primera actualización desde un launcher
  anterior.
- **`currentVersion` mantiene el nombre**: evita renombrar todo el frontend;
  ahora su significado coincide con el comentario del DTO (versión en
  ejecución).
- **Banner persistente**: el toast se pierde; la confirmación debe seguir ahí
  al volver del reinicio.
- **Timeout con reintento**: no se deja al usuario esperando indefinidamente.
- **Fuera de alcance**: reintentar la narrativa de una respuesta solo-tool,
  cambios en el estilo de las tarjetas y un historial de actualizaciones.

## Criterios de aceptación

- [x] El DTO expone `runningVersion`/`currentVersion`, `installedVersion` y
      `restartRequired`.
- [x] El launcher exporta la versión en ejecución y hay fallback para el
      primer reinicio.
- [x] El botón de reiniciar depende de `restartRequired`, no de `job.step`.
- [x] El panel se sincroniza con el backend al montarse.
- [x] Tras reiniciar se muestra el banner de éxito y desaparece el botón.
- [x] Un timeout muestra error y permite reintentar.
- [x] Rollback pendiente usa el mismo flujo y su banner distingue rollback.
- [x] Tests del adaptador, rutas, store y panel.
- [x] `pnpm check`, build y suites en verde.
- [x] CHANGELOG en `[Unreleased]`.

## Verificación

- Backend: **670** tests (114 archivos), 2 nuevos.
- Frontend: **351** tests (58 archivos), 5 nuevos.
- `pnpm check`: arquitectura 7/7, typecheck y lint verdes.
- `pnpm build`: backend, frontend y website en verde.
- **Pendiente antes del release**: dry run del workflow de release en la rama
  para verificar el launcher (`RM_RUNNING_VERSION`) en los cinco paquetes.

## Commits

1. `feat(shared): expose installed and running update versions`
2. `feat(backend): track running and installed versions`
3. `feat(frontend): clarify the update restart flow`
4. `docs(slice): document S117 update flow`
