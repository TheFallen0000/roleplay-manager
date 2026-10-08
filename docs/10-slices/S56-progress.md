# S56 — Enlace telefónico: ajustes de encendido/apagado e inactividad

**Estado:** Completado
**Inicio:** 2026-10-08
**Fin:** 2026-10-08

## Descripción

Se retoma el pendiente de S33: «activar al iniciar» / «desactivar al cerrar» y
auto-desactivado por inactividad del enlace telefónico, para **Tailscale y red
doméstica (LAN)**. Los ajustes viven en una sección plegable «Ajustes del
enlace» dentro del diálogo Teléfono de cada pestaña, se persisten en la tabla
`settings` y se aplican fuera de las peticiones.

## Decisiones

- **UX: sección colapsable en el diálogo** (no checkboxes que desaparecen): una
  fila con resumen («Al cerrar: desactivar · Inactividad: 60 min») que se
  expande para editar en cualquier momento, incluso con el enlace activo. El
  diálogo principal sigue siendo solo encender/apagar.
- **Opciones por modo**:
  - `autoEnableOnStart` — ambos modos.
  - `disableOnClose` — solo Tailscale (`tailscale serve` sigue sirviendo tras
    cerrar la app; en LAN el proxy muere con el proceso, un interruptor ahí
    sería mentira).
  - `idleDisableMinutes` — ambos modos; `null` = apagado, opciones 15/30/60/120.
- **Defaults de privacidad**: `disableOnClose` activado en Tailscale, el resto
  apagado.
- **Semántica de inactividad**: sin peticiones **remotas** durante N minutos (el
  uso en la PC no cuenta). El middleware clasifica por `Host` (`*.ts.net` para
  Tailscale) y por una cabecera que añade el proxy LAN
  (`x-rm-lan-access`) — exacto y sin adivinar IPs. Encender el enlace hace
  `touch` (la cuenta atrás empieza al encender, no al abrir la app) y el
  vigilante reinicia el reloj al apagar (para no repetir llamadas a la CLI).
- **Arranque**: `applyOnStartup` solo actúa en la app **empaquetada**; en
  desarrollo el servidor se reinicia a cada cambio y volvería a encender el
  enlace que acabas de apagar.
- **Cierre**: el bootstrap ya tenía `SIGINT`/`SIGTERM`; se añade **`SIGHUP`**
  (Windows lo emite al cerrar la consola) y el paso de desactivar antes de
  cerrar el servidor. **Reiniciar** no lo dispara (el restarter llama
  `process.exit`, no señales), así que el enlace sobrevive a los reinicios.
- **API**: `GET/PUT /api/phone-access/preferences` (parche parcial validado con
  Zod en la ruta). Los ajustes no se cachean en `localStorage`: son
  configuración y el diálogo los refresca al abrirse.
- **Arquitectura**: puerto `PhoneAccessActivity` (dominio) + tracker en memoria
  (infraestructura); la lógica de aplicación vive en
  `application/services/phone-access.service.ts` (arranque/cierre/inactividad,
  todo *best effort* con logs) y el temporizador (60 s) en el bootstrap.

## Criterios de aceptación

- [x] Preferencias persistidas por modo, con valores por defecto y lecturas
      corruptas toleradas.
- [x] La API valida modos y tiempos (400 ante valores fuera de la lista).
- [x] Auto-encendido al iniciar (empaquetado), desactivación al cerrar y
      auto-desactivado por inactividad, sin tumbar nunca la app.
- [x] La sección de ajustes muestra resumen, se expande y guarda cambios en
      ambos modos; el modo LAN no muestra «desactivar al cerrar».
- [x] Gates, tests, build, paquete y smoke en verde.

## Verificación

- Backend **481** tests (+30) y frontend **259** (+10), `pnpm check` 7/7,
  `pnpm build` ✓, `pnpm package:app` + smoke **PASS**.
- **E2E real de LAN con el paquete** (puertos 3280/4382 aparte): defaults
  correctos → `PUT` persiste → el enlace no se enciende solo en la misma sesión
  → **reiniciar la app lo enciende solo** (puerto 4382) y las preferencias
  siguen ahí.
- La inactividad (ventana mínima de 15 min) queda cubierta por unitarios con
  reloj inyectado; Tailscale real lo valida el usuario en su tailnet.

## Fuera de alcance

- Notificación al PC cuando la inactividad corta el enlace (solo log + estado).
- Inactividad basada en «uso local» (la semántica elegida es remota).
- Botón de instalar propio de la PWA (ya cubierto por S54).

## Commits

1. `feat(shared): add phone-access preference types and copy`
2. `feat(backend): add phone-access preferences, activity and background rules`
3. `feat(frontend): add phone-access preferences to the tunnel store`
4. `feat(frontend): add the link settings section to the phone dialog`
5. `docs(slice): add S56 progress and mark the remote-access pendings`
6. `release: bump to v1.36.0 and add changelog entry`
