# S34 — Enlace de activación de Serve en el diálogo (v1.25.1)

**Estado:** Completado
**Inicio:** 2026-10-06
**Fin:** 2026-10-06

## Descripción

Prueba real de S33: al encender el switch con Tailscale instalado, la app
devolvía un 502 genérico tras 15 s. La causa era que **Tailscale Serve no
estaba habilitado en el tailnet**: el comando `tailscale serve` no falla, se
queda esperando a que el usuario apruebe un enlace de consentimiento, y el
timeout del backend lo interpretaba como error.

Este parche detecta ese caso concreto y muestra el **enlace de activación** en
el propio diálogo, con una espera más corta.

## Decisiones

- **Capturar la salida del comando**: el runner ahora adjunta `stdout` (además
  de `stderr`) a los errores y acepta un `timeoutMs` por comando.
- **Detección en el adaptador**: si la salida contiene «Serve is not enabled»,
  se extrae el enlace `https://login.tailscale.com/f/serve…` (o se cae al panel
  DNS `https://login.tailscale.com/admin/dns` si no hay enlace) y se lanza el
  nuevo error de dominio `TUNNEL_SERVE_NOT_ENABLED` (409).
- **Timeout de `serve` a 10 s** (el aviso aparece al instante; un `serve`
  correcto tarda ~1 s), en lugar de los 15 s generales.
- **Frontend**: `extractTunnelServeUrl` obtiene el enlace del mensaje del
  backend y el diálogo lo muestra como «Activar Serve en Tailscale» (nueva
  ventana); el mensaje traducido explica que hay que activarlo una vez.
- **Contexto real**: tras habilitar Serve en el tailnet (el usuario completó el
  consentimiento durante el desarrollo del parche), la activación real funciona:
  `POST /api/tunnel/enable` → 200 en ~0,3 s y `serve status` muestra el handler
  `https://<equipo>.<tailnet>.ts.net → http://localhost:4321`.

## Criterios de aceptación

- [x] Un fallo de `serve` con «Serve is not enabled» se convierte en
      `TUNNEL_SERVE_NOT_ENABLED` con el enlace de activación.
- [x] Sin enlace en la salida se usa el panel DNS como respaldo.
- [x] El diálogo muestra el enlace accionable junto al mensaje traducido.
- [x] La espera del aviso baja de 15 s a 10 s.
- [x] `pnpm check` sin warnings; backend (381) y frontend (213) en verde.
- [x] Verificación real contra el Tailscale instalado (estado + activación).

## Commits

1. `fix(backend): surface the Serve activation link when the tailnet has it disabled`
2. `fix(frontend): show the Serve activation link in the phone dialog`
3. `test(tunnel): cover the Serve-not-enabled consent flow`
4. `docs(slice): add S34 progress`
5. `release: bump to v1.25.1 and add changelog entry`
