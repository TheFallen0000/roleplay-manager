# S33 — Tailscale + menú «Teléfono» (PM.21)

**Estado:** Completado
**Inicio:** 2026-10-06
**Fin:** 2026-10-06

## Descripción

La app puede encender y apagar su conexión en la red privada (Tailscale
Serve) desde un nuevo menú **Teléfono**: un interruptor, un **QR** para abrir
la interfaz en el teléfono, el enlace copiable y una guía de primera vez según
el estado real de Tailscale. Nada se expone a internet.

## Decisiones

- **Puerto genérico `TunnelController`** (`getStatus`, `enable`, `disable`) con
  `TunnelStatusDTO { available, connected, active, url }`; el dominio no conoce
  Tailscale.
- **Adaptador `TailscaleServeAdapter`** con runner inyectable para tests:
  - Binario: `TAILSCALE_BIN` → PATH → `C:\Program Files\Tailscale\tailscale.exe`.
  - Activar: `tailscale serve --bg --yes --https=443 <target>`; desactivar:
    `tailscale serve --yes --https=443 off`; estado:
    `tailscale status --json` + `tailscale serve status --json` (activo solo si
    algún handler proxya al puerto objetivo).
  - `getStatus` nunca lanza: sin binario → `available: false`; sin servicio →
    `connected: false`.
- **Errores de dominio** `TUNNEL_NOT_AVAILABLE` / `TUNNEL_NOT_CONNECTED` /
  `TUNNEL_COMMAND_FAILED`, traducidos en el frontend vía `errors.*`.
- **Sin restricción loopback** (cambio respecto al borrador): con el proxy
  same-origin el backend **siempre** ve `127.0.0.1`, y con Tailscale Serve el
  frontend también, así que la restricción no distinguía PC de teléfono. La red
  es privada del usuario y los endpoints quedan accesibles solo desde ella.
- **Punto de estado sin polling**: el estado se cachea en `localStorage` para el
  indicador del menú (no se lanza la CLI en cada navegación, que es una MPA); el
  diálogo refresca al abrirse.
- **QR** con `react-qr-code` (SVG, compatible con React 19); **switch** de Base
  UI añadido a `@workspace/ui` copiado a mano (sin CLI, como el menubar en S27).
- **`TUNNEL_TARGET_URL`** (por defecto `http://localhost:4321`) decide qué se
  comparte.
- **Fuera de alcance (deferido)**: «activar al iniciar» / «desactivar al
  cerrar», auto-desactivado por inactividad y manifest PWA.

## Criterios de aceptación

- [x] `GET /api/tunnel` devuelve disponibilidad, conexión, actividad y URL.
- [x] `POST /api/tunnel/enable` comparte la app y `disable` lo detiene.
- [x] Los comandos correctos se ejecutan (verificado con CLI falsa).
- [x] Activar sin sesión → `409 TUNNEL_NOT_CONNECTED` (traducido en la UI).
- [x] Menú «Teléfono» con punto de estado y diálogo con interruptor y QR.
- [x] Guía de primera vez (no instalado / sin sesión) y enlace copiable.
- [x] `pnpm check` sin warnings; backend (379) y frontend (210) en verde.
- [x] `pnpm build` correcto.

## Verificación E2E (resumen)

Con una **CLI falsa compilada como `.exe`** (estado en `key=value`, comandos
registrados en un log) y la cadena completa frontend → proxy `/api` → backend →
caso de uso → adaptador → CLI:

- `GET /api/tunnel`: disponible, desconectado sin sesión (sin URL) y conectado
  con URL `https://desktop.tailnet-abc.ts.net`.
- `POST enable`: activo, `serveProxy` registrado y comando
  `serve --bg --yes --https=443 http://localhost:4321` invocado.
- `POST disable`: inactivo, config limpiada y `serve --yes --https=443 off`
  invocado.
- `POST enable` sin sesión: `409` con código `TUNNEL_NOT_CONNECTED`.

Nota: durante el E2E se detectó un `DeprecationWarning` de Node por el soporte
de shims `.cmd`; se eliminó esa regla (innecesaria en producción, donde
Tailscale es un `.exe`) y el fake pasó a compilarse como ejecutable real.

## Commits

1. `feat(shared): add tunnel status type and i18n strings`
2. `feat(ui): add the Base UI switch primitive`
3. `feat(backend): control Tailscale Serve through tunnel use cases`
4. `feat(frontend): add the Phone menu with QR and connection toggle`
5. `test(tunnel): cover adapter, use cases, routes, dialog and menubar`
6. `docs(slice): add S33 progress and complete PM.21`
7. `release: bump to v1.25.0 and add changelog entry`
