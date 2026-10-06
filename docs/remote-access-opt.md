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

> **Hecho en S32 (v1.24.0):** el proxy same-origin ya está implementado con un
> middleware de Astro; el navegador usa rutas relativas `/api/*` y el SSR sigue
> llamando al backend directamente. Ver `S32-progress.md`.

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

## Decisión (2026-10-06)

Tras revisar las opciones se decide:

- **Tailscale + Serve** como solución (privado, sin exponer nada a internet).
- **Sin dominio propio** y **con app de Tailscale en el teléfono** (instalación
  única).
- **Control desde la propia app**: el usuario no ejecuta comandos; la app
  enciende y apaga la conexión a voluntad desde el menú y muestra un QR para
  abrir la interfaz en el teléfono.

Esto descarta Cloudflare (Quick y Named) y ngrok para la primera versión.

## UX propuesta: menú «Teléfono»

La idea original del usuario era un elemento en el menubar con un QR para
mostrar la interfaz en el teléfono y una conexión que se pueda encender y
apagar a voluntad. **Es viable**: la app controla Tailscale internamente (CLI)
y nadie escribe comandos.

Flujo diario:

1. En la computadora: menú **Teléfono** → interruptor **Compartir en mi red
   privada** → activado.
2. Aparece un **QR** con `https://<equipo>.<tailnet>.ts.net` (y botón «Copiar
   enlace»).
3. En el teléfono: escanear el QR → se abre la app en el navegador (la app de
   Tailscale debe estar conectada; una vez instalada, es automático).
4. Para cortar el acceso: apagar el interruptor (o cerrar la app si se activa
   «desactivar al salir»).

Detalles de la UX:

- **Indicador de estado** en el menú (punto verde cuando está activo) para que
  sea evidente que la app es accesible desde el teléfono.
- **Guía de primera vez** dentro del mismo diálogo, detectando el estado real:
  Tailscale no instalado → enlace de descarga; instalado sin sesión → «inicia
  sesión»; sin HTTPS en el tailnet → aviso; todo listo → QR.
- **Opciones**: «Activar al iniciar la app» (recordar estado) y «Desactivar al
  cerrar la app» (privacidad; activada por defecto).
- **Consejo PWA**: «Añadir a pantalla de inicio» en el teléfono para que se
  sienta como una app (requiere añadir un manifest al frontend).

Nota: la primera conexión del teléfono siempre requiere instalar Tailscale y
entrar con la misma cuenta; es el precio de no exponer nada. Después, el flujo
es «encender → escanear → listo».

## Esbozo de implementación

- **Prerrequisito**: proxy `/api` same-origin (ver «Hallazgo clave»), para que
  un solo Serve (puerto 4321) sirva toda la app. Beneficia también a la LAN.
  *(Hecho en S32, v1.24.0.)*
- **Backend**:
  - Puerto `TunnelController` (dominio): `getStatus`, `enable`, `disable`.
  - Adaptador `TailscaleServeAdapter` (infraestructura) que invoca la CLI:
    `tailscale status --json` (DNSName del equipo), `tailscale serve status
    --json`, `tailscale serve --bg <target>`, `tailscale serve --https=443 off`
    (o `reset`). Ruta configurable al binario (`TAILSCALE_BIN`).
  - Casos de uso `get-tunnel-status`, `enable-tunnel`, `disable-tunnel` y rutas
    `GET/POST /api/tunnel`.
  - Los endpoints de encendido/apagado se restringen a peticiones locales
    (loopback) para que no puedan dispararse desde el teléfono.
- **Frontend**: elemento en el menubar + diálogo con interruptor, QR (librería
  ligera, p. ej. `react-qr-code`), enlace copiable y guía; i18n en/es.
- **PWA (opcional)**: manifest + iconos.
- **Windows**: según la documentación de Tailscale, reenviar a un puerto local
  no requiere consola de administrador (a diferencia de servir archivos);
  verificar en la máquina de desarrollo. Requisito: HTTPS activado en el
  tailnet (Tailscale lo ofrece en el primer `serve`).

## Puntos a decidir en la slice

1. ¿Activar al iniciar la app? ¿Desactivar al cerrar?
2. ¿Auto-desactivar tras X minutos de inactividad?
3. ¿Incluir el manifest PWA en la misma slice o después?
4. ¿Dividir el trabajo: primero proxy `/api` y luego túnel + QR, o una sola
   slice?

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
