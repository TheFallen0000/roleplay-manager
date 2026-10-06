# Acceso remoto desde el teléfono (túneles)

## Objetivo

Poder dejar Roleplay Manager corriendo en la computadora y acceder desde el
teléfono en cualquier lugar:

- **Sin desplegar en un servidor** ni contratar un VPS.
- **Sin abrir puertos** en el router (nada de port forwarding ni UPnP).
- Manteniendo la app y los datos (SQLite, imágenes, claves de proveedores)
  exclusivamente en la máquina local.

La familia de soluciones evaluada son los **túneles**: un proceso que abre una
conexión *saliente* desde la computadora hacia un relay en internet y recibe el
tráfico del teléfono por ahí. La computadora nunca acepta conexiones entrantes
directas.

## Cómo corre la app hoy

- **Backend** (Express): puerto `3001` (`app.listen(env.PORT)`), migraciones al
  arrancar. En producción: `pnpm --filter @workspace/backend start`.
- **Frontend** (Astro + React): puerto `4321` en desarrollo; `astro build`
  genera un servidor Node standalone (`dist/server/entry.mjs`).
- **Llamadas del navegador**: `getBaseUrl()` en `lib/api/client.ts` usa
  `PUBLIC_API_URL` o, si no, `http://localhost:3001`.
- **Streaming del chat**: SSE (`Content-Type: text/event-stream`) en envío,
  regeneración y continuación.
- **CORS**: el backend solo permite `CORS_ORIGIN` (por defecto
  `http://localhost:4321`).
- **Sin autenticación**: no hay login; quien tenga acceso a la app puede leer
  todas las conversaciones y usar las claves de proveedores configuradas.

## Requisitos que debe cumplir la solución

1. **SSE de punta a punta**: el chat no puede perder el streaming.
2. **Origen de la API**: el teléfono debe poder llamar al backend (ver
   «Hallazgo clave»).
3. **URL estable**: para guardarla en el teléfono y que no cambie en cada
   arranque.
4. **HTTPS**: los túneles lo dan gratis; necesario para cookies/PWA y para no
   exponer tráfico en claro.
5. **Seguridad**: sin login, cualquier URL pública es acceso total. Si el túnel
   es público, debe ir con autenticación (del túnel o de la app).
6. **Coste**: las opciones gratuitas deben ser suficientes para uso personal.

## Hallazgo clave: el origen de la API

El servidor Astro renderiza las páginas en la máquina local (ahí
`localhost:3001` funciona), pero **el JavaScript del navegador llama al backend
directamente** a `getBaseUrl()`. Desde el teléfono, `localhost:3001` apunta al
propio teléfono y falla. Lo mismo ocurre hoy incluso por LAN.

Antes de cualquier túnel hay que decidir:

- **A) Proxy same-origin (recomendado)**: el frontend sirve `/api/*` y lo
  reenvía a `localhost:3001` (proxy de Vite en desarrollo; middleware en el
  servidor standalone en producción). `getBaseUrl()` pasaría a ser relativo
  (`""`). Un solo túnel al frontend sirve toda la app, sin CORS y sin exponer
  dos orígenes.
- **B) Exponer backend y frontend por separado**: dos túneles/dominios,
  `PUBLIC_API_URL` apuntando al del backend y `CORS_ORIGIN` actualizado. Más
  piezas, se rompe cuando cambia la URL y obliga a reconstruir el frontend.

La opción A es trabajo previo a la slice del túnel y beneficia también al
acceso por LAN.

## Opciones evaluadas

### 1. Cloudflare Tunnel

**Quick Tunnel** (`cloudflared tunnel --url http://localhost:4321`):

- Sin cuenta ni dominio; URL aleatoria `*.trycloudflare.com`.
- **No soporta SSE** (limitación documentada y confirmada en incidencias): el
  chat llegaría en bloque al cerrar la respuesta. **Descartado para el chat.**
- Límite de 200 peticiones en vuelo; sin garantía de disponibilidad; la URL
  cambia en cada arranque.
- Permite exigir email con PIN (`--allowed-mail`).

**Named Tunnel** (cuenta + dominio en Cloudflare):

- URL estable en tu dominio; `cloudflared` corre junto al proyecto.
- **SSE soportado** si la respuesta es «streameable» (nuestro backend ya envía
  `text/event-stream`).
- Gratis; con **Cloudflare Access** se puede exigir login por email (plan
  gratuito hasta 50 usuarios).
- Requiere tener un dominio gestionado en Cloudflare.

### 2. Tailscale

Red privada (mesh) entre tus dispositivos, sin exponer nada a internet.

- **Serve** (`tailscale serve`): la app queda accesible solo para los
  dispositivos de tu tailnet, con HTTPS y URL estable `*.ts.net`. El teléfono
  necesita la app de Tailscale (una vez). **Nada público.**
- **Funnel** (`tailscale funnel`): publica la app en internet sobre
  `https://<equipo>.<tailnet>.ts.net` (gratis en todos los planes, en beta).
  Cualquiera con la URL entra; límites de ancho de banda no configurables; solo
  TLS y puertos 443/8443/10000. La propia documentación advierte de no exponer
  datos sensibles.
- Plan Personal gratis: hasta 6 usuarios y dispositivos ilimitados.

### 3. ngrok

- Gratis: **1 GB/mes** de transferencia, 20.000 peticiones/mes, 3 endpoints y
  **un dominio de desarrollo fijo** (`*.ngrok-free.app`, estable).
- SSE soportado (streaming real).
- En el plan gratuito el navegador ve una **página intersticial** de aviso (se
  puede saltar en `fetch` con una cabecera, pero molesta).
- Sin TLS endpoints en el plan gratuito.

### 4. Otras alternativas

- **localtunnel** (`npx localtunnel`): sin cuenta, subdominio aleatorio; sin
  garantías de fiabilidad ni de SSE. Solo para pruebas.
- **frp / bore / SSH inverso**: requieren un servidor público intermedio (VPS)
  → contradice el requisito de «sin servidor». Descartado.
- **WireGuard / ZeroTier manual**: como Tailscale pero con más configuración;
  no aportan ventaja aquí.
- **Abrir puertos (port forwarding/UPnP)**: descartado por el usuario.

## Tabla comparativa

| Opción | Cuenta/dominio | SSE | Auth integrada | URL estable | Público | App en teléfono | Coste |
|---|---|---|---|---|---|---|---|
| CF Quick Tunnel | No | **No** | PIN email (`--allowed-mail`) | No | Sí | No | Gratis |
| CF Named Tunnel | Cuenta + dominio | Sí | Access (email) | Sí | Sí | No | Gratis |
| Tailscale Serve | Cuenta Tailscale | Sí | Red privada | Sí | **No** | Sí (app) | Gratis |
| Tailscale Funnel | Cuenta Tailscale | Sí | — | Sí | Sí | No | Gratis |
| ngrok Free | Cuenta | Sí | Políticas (básica) | Sí (dev domain) | Sí | No | 1 GB/mes |
| localtunnel | No | Dudoso | — | No | Sí | No | Gratis |

## Implicaciones para la app (trabajo común)

1. **Proxy `/api` same-origin** y `getBaseUrl()` relativo (ver hallazgo).
2. **Verificar SSE a través del proxy** (sin buffering: no comprimir, hacer
   `flushHeaders`).
3. **Arranque conjunto**: decidir si se añade un comando (`pnpm tunnel`) que
   levante backend + frontend + túnel, o se documenta manualmente.
4. **Autenticación** si el túnel es público (Access, política del túnel, o
   login propio de la app en una slice futura).
5. **PWA (opcional)**: manifest + iconos para «añadir a inicio» en el teléfono;
   hoy no existe.
6. **Peso de red**: subidas de hasta 15 MB e imágenes por variantes; en
   Tailscale/LAN es irrelevante, en ngrok free los 1 GB/mes pueden quedarse
   cortos.

## Recomendación preliminar

- **Uso personal y máxima privacidad (recomendado)**: **Tailscale + Serve**.
  Nada público, HTTPS y URL estable gratis; el coste es instalar la app de
  Tailscale en el teléfono.
- **Acceso desde cualquier navegador con login**: **Cloudflare Named Tunnel +
  Access** (necesita dominio en Cloudflare).
- **Sin dominio y sin app en el teléfono**: **ngrok** (asumiendo intersticial y
  1 GB/mes).
- **Quick tunnels de Cloudflare**: solo demos; **no sirven para el chat** por
  la falta de SSE.

## Preguntas abiertas

1. ¿Privado (solo tus dispositivos) o público con login?
2. ¿Instalar la app de Tailscale en el teléfono es aceptable, o se prefiere
   solo navegador?
3. ¿Hay (o habría) un dominio propio en Cloudflare?
4. ¿Cómo se prefiere arrancarlo: comando integrado en el repo o pasos
   documentados?
5. ¿Uso continuo o puntual? (afecta a los límites de los planes gratuitos)

## Referencias

- Cloudflare Quick Tunnels:
  <https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/>
- Cloudflare Tunnel (named):
  <https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/>
- Cloudflare Access:
  <https://developers.cloudflare.com/cloudflare-one/access-controls/>
- Tailscale Funnel:
  <https://tailscale.com/docs/features/tailscale-funnel>
- Tailscale (compartir un servidor local):
  <https://tailscale.com/docs/use-cases/application-testing/share-local-dev-server-with-internet>
- Tailscale pricing: <https://tailscale.com/pricing>
- ngrok free plan limits:
  <https://ngrok.com/docs/pricing-limits/free-plan-limits>
- localtunnel: <https://github.com/localtunnel/localtunnel>
