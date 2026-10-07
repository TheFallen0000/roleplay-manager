# S49 — Actualizador robusto y reinicio desde la app

**Estado:** Completado
**Inicio:** 2026-10-07
**Fin:** 2026-10-07

## Descripción

Dos mejoras del actualizador por releases, a raíz de probarlo en el paquete real:

1. La **primera descarga fallaba** con `fetch failed` (la segunda funcionaba). Era
   un fallo de red transitorio al conectar con el CDN de GitHub, agravado porque
   el adaptador **no reintentaba** y el mensaje ocultaba la causa real.
2. Tras instalar la actualización, la UI pedía reiniciar pero **no había forma de
   hacerlo** (quedó deferido en S43).

## Decisiones

- **Reintentos con backoff** en los pasos de red (API y descarga): 3 intentos
  (0,5 s / 1 s / 2 s). Solo se reintenta en fallos de red y respuestas 5xx/408/425/429;
  un 404/403 es definitivo.
- **Errores con la causa**: `describeError` recorre la cadena `error.cause` (y
  `AggregateError`), así que un fallo de red dice `fetch failed: getaddrinfo
  ENOTFOUND ...` en vez de solo `fetch failed`.
- **Reintento visible**: `UpdateJobDTO.retry` (`{ attempt, attempts }`) y el panel
  muestra "Reintentando (n/3)…" traducido.
- **Reinicio**: nuevo puerto `AppRestarter` + `RestartAppUseCase` + `POST
  /api/updates/restart`. En el paquete, el proceso relanza el lanzador
  (`start.cmd`, en la misma consola, sin reabrir el navegador) y sale; el
  lanzador relee `current`, así que arranca la versión nueva. En dev responde
  `not-available`.
- **`canRestart` en el estado**: lo pone el adaptador (true solo en el paquete),
  así el panel sabe si ofrecer el botón sin lógica extra.
- **Reintento de `listen`**: al reiniciar, el proceso anterior puede retener el
  puerto un instante; el servidor reintenta hasta 15 s en vez de rendirse.
- **UI**: tras `done` aparece **"Reiniciar ahora"**; al pulsarlo, el panel espera
  a `/api/health` y **recarga la página sola**.

## Criterios de aceptación

- [x] Un fallo transitorio (API o descarga) se reintenta y la actualización termina.
- [x] Un fallo persistente muestra la causa subyacente en el mensaje.
- [x] Un 404 no se reintenta.
- [x] El botón aparece solo cuando la actualización está aplicada y `canRestart`.
- [x] El reinicio relanza el lanzador sin abrir el navegador y sale.
- [x] `pnpm check`, tests de backend y frontend, build y smoke test en verde.

## Verificación

- Tests: reintentos (API y descarga), causa encadenada, sin reintento en 404,
  reintentador (disponibilidad, spawn/exit), caso de uso y ruta de reinicio,
  panel (reintentos, botón, sin botón si no está disponible).
- **E2E sobre el paquete**: `POST /api/updates/restart` → la app se reinicia
  (cambia el PID que escucha) y vuelve a responder; la versión sigue siendo la
  del puntero `current`.

## Commits

1. `feat(shared): add retry and canRestart to the update DTOs`
2. `feat(backend): retry transient update downloads and report their cause`
3. `feat(backend): allow the packaged app to restart itself`
4. `feat(frontend): show retries and a restart button after updating`
5. `test(updates): cover retries, the restarter and the panel`
6. `docs(slice): add S49 progress`
7. `release: bump to v1.32.0 and add changelog entry`
