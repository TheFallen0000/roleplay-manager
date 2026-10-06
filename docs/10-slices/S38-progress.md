# S38 — Conexión rápida por LAN (PM.22)

**Estado:** Completado
**Inicio:** 2026-10-06
**Fin:** 2026-10-06

## Descripción

El diálogo Teléfono ahora tiene dos pestañas: **Red doméstica** (nueva) y
**Tailscale**. La primera comparte la app con el teléfono en la misma WiFi con
un interruptor, un selector de dirección (si la máquina tiene varias IPs), QR
propio, botón de copiar con *fallback* y notas de seguridad y firewall. Está
**apagada por defecto**.

## Decisiones

- **Proxy en el backend** en vez de exponer el frontend:
  `LanProxyServerAdapter` escucha en `0.0.0.0:<LAN_PORT>` (por defecto 4322) y
  reenvía al frontend local **conservando el `Host`**, para que el chequeo de
  origen de Astro siga pasando. El frontend nunca se expone directamente y el
  modo se enciende y apaga en caliente.
- **Streaming real** con `pipe` (SSE del chat y subidas multipart), `unref()`
  para no bloquear el apagado, idempotente y error `LAN_PORT_IN_USE` si el
  puerto está ocupado.
- **Detección de direcciones**: IPv4 privadas, excluyendo la CGNAT de Tailscale
  y adaptadores virtuales, incluidos los de nombre localizado
  («Conexión de área local* 2», Wi-Fi Direct). En la prueba real se detectó que
  la primera candidata era `192.168.137.1` (adaptador virtual); tras afinar el
  filtro queda solo la interfaz real.
- **Selector de IP** en el diálogo cuando hay más de una; la URL y el QR se
  actualizan al cambiar.
- **Copiar con fallback**: la API de portapapeles necesita contexto seguro
  (HTTPS o localhost); en HTTP plano se usa el método clásico (`execCommand`).
- **Punto de estado** del menú encendido si **cualquiera** de los dos modos
  está activo; el store cachea ambos estados.
- **Fuera de alcance**: HMR por el proxy, PWA y autenticación.

## Criterios de aceptación

- [x] Interruptor de red local con QR y URL propios; apagado por defecto.
- [x] La app carga por `http://<ip>:<puerto>` en la misma red (E2E).
- [x] API GET y POST a través del proxy (incluido el origen CSRF).
- [x] Hidratación y render en navegador móvil headless por la URL LAN.
- [x] Al apagar, la URL deja de responder.
- [x] Selección de IP cuando hay varias; se elige la real, no la virtual.
- [x] `pnpm check` sin warnings; backend (395) y frontend (223) en verde.
- [x] `pnpm build` correcto.

## Verificación E2E (resumen)

Con backend y frontend de producción temporales (base temporal, sin tocar la
sesión del usuario): `POST /api/lan/enable` → página 200, `/api/characters` 200,
`POST` 201 con el `Origin` del host LAN, islas hidratadas y el personaje creado
renderizado en un navegador móvil headless; `disable` → la URL deja de
responder. La detección de direcciones pasó de 2 candidatas (con la Wi-Fi
Direct) a 1 (la Ethernet real `10.143.10.73`).

## Commits

1. `feat(shared): add LAN access types and strings`
2. `feat(backend): add the LAN sharing proxy and endpoints`
3. `feat(frontend): add the Home network tab with QR`
4. `test(lan): cover proxy, use cases, routes, dialog and clipboard`
5. `docs(slice): add S38 progress and complete PM.22`
6. `release: bump to v1.26.0 and add changelog entry`
