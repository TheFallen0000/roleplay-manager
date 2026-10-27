# S88 — Aviso de inactividad del enlace telefónico (PM.39)

**Estado:** Completado (v1.50.0)
**Inicio:** 2026-10-27
**Fin:** 2026-10-27

## Descripción

Cuando el watchdog de inactividad apaga el enlace del teléfono, la app deja de
hacerlo en silencio:

- Muestra un **aviso único al abrir la app** (o al navegar a otra página), con el
  modo y el tiempo de inactividad configurado.
- El diálogo **Teléfono** explica que el enlace se desactivó automáticamente
  mientras siga inactivo.

Se mantiene la semántica actual: la inactividad cuenta solo el uso remoto. El
texto de ajustes ya aclara «sin uso desde el teléfono».

## Decisiones

- **Registro en memoria:** el aviso vive en el backend que ejecuta el watchdog.
  Un reinicio lo pierde a propósito, igual que reinicia el contador de actividad.
- **Un solo aviso:** se guarda el último auto-desactivado (modo, minutos y
  timestamp). Si ambos modos se apagan en la misma comprobación, se muestra el
  último.
- **Solo si estaba activo:** antes de desactivar se consulta el estado; un enlace
  ya inactivo no genera aviso ni ejecuta el comando de cierre. Esto también evita
  notificaciones falsas.
- **Endpoint dedicado:** `GET /api/phone-access/notice` devuelve el aviso o
  `null`; no se mezcla con las preferencias.
- **Aviso único en el cliente:** `localStorage` guarda el timestamp ya visto. El
  componente global vive en `AppShell`; el diálogo Teléfono consulta el mismo
  aviso al abrirse.
- **Acciones manuales:** activar o desactivar manualmente limpia el aviso, para
  no mostrar uno viejo si el usuario ya cambió el estado.
- **Sin polling:** el aviso se consulta al cargar cada página (MPA). No se añade
  SSE ni un temporizador global.

## Criterios de aceptación

- [x] El backend registra el auto-desactivado con modo, minutos y timestamp.
- [x] No se registra ni se desactiva un modo que ya está inactivo.
- [x] `GET /api/phone-access/notice` devuelve el último aviso o `null`.
- [x] La app muestra un diálogo único al abrirse con el modo y los minutos.
- [x] El diálogo Teléfono explica la desactivación automática mientras el modo
      siga inactivo.
- [x] Activar o desactivar manualmente limpia el aviso.
- [x] La semántica de inactividad sigue siendo solo uso remoto.
- [x] Tests de backend y frontend, `pnpm check` y build en verde.
- [x] `CHANGELOG.md` actualizado en `[Unreleased]`.
- [x] PM.39 marcado como hecho en el backlog.

## Verificación

- Backend: **589** tests (101 archivos), incluidos el registro del aviso, la
  omisión de modos ya inactivos y la ruta `GET /phone-access/notice`.
- Frontend: **329** tests (54 archivos), incluidos el diálogo único, el estado en
  el diálogo Teléfono y el store.
- `pnpm check`: arquitectura 7/7, typecheck y lint verdes.
- `pnpm build`: backend, frontend y website en verde.

## Commits

1. `adea52e feat(phone-access): notify when inactivity disables the link`
2. `docs(slice): add S88 progress and mark PM.39` (this commit)
