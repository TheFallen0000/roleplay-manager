# S32 — Proxy `/api` same-origin (prerrequisito del acceso remoto)

**Estado:** Completado
**Inicio:** 2026-10-06
**Fin:** 2026-10-06

## Descripción

El frontend ahora sirve `/api/*` y lo reenvía al backend mediante un middleware
de Astro, de modo que el navegador solo habla con un único origen. Esto es el
prerrequisito del acceso remoto por túnel (bastará exponer un solo puerto, el
del frontend) y además habilita el acceso por LAN cuando el servidor escucha
más allá de `localhost`.

Antes, el JavaScript del navegador llamaba directamente a
`http://localhost:3001`; desde otro dispositivo eso apunta al propio
dispositivo y falla.

## Decisiones

- **Middleware de Astro** (`src/middleware.ts`) como único mecanismo, válido en
  desarrollo y en producción (verificado en ambos), en lugar del proxy de Vite
  o de un servidor Node personalizado.
- **`getBaseUrl()` dual**: en el navegador devuelve `""` (mismo origen, pasa
  por el proxy); en SSR devuelve `http://localhost:3001` (URL absoluta
  necesaria). `PUBLIC_API_URL` sigue sobrescribiendo ambos.
- **`getPublicBaseUrl()`** (nuevo): las URLs que se incrustan en HTML
  (`<img src>`) son siempre relativas, para que resuelvan contra el origen de la
  página y pasen por el proxy (también en SSR).
- **`API_PROXY_TARGET`** (variable de servidor, por defecto
  `http://localhost:3001`): permite apuntar el proxy a otro puerto/host.
- **Reenvío fiel**: método, cabeceras y cuerpo (JSON y multipart) se reenvían;
  se eliminan cabeceras hop-by-hop y de codificación; si el backend no responde
  se devuelve `502` con un error JSON.
- **CSRF de Astro intacto**: la comprobación de origen (`checkOrigin`) se
  mantiene activa; el navegador envía `Origin` coincidente también en las
  subidas multipart (verificado).
- **LAN opcional**: no se cambia el host por defecto (seguiría exponiendo la
  app sin autenticación en la red local); para LAN se documenta
  `astro dev --host` / `HOST` en producción.

## Criterios de aceptación

- [x] `GET /api/*` se proxya al backend desde el origen del frontend (dev y prod).
- [x] SSE del chat llega en streaming (sin buffering) a través del proxy.
- [x] POST JSON y subidas multipart se reenvían correctamente.
- [x] Las URLs de assets son relativas y cargan por el mismo origen.
- [x] El SSR sigue llamando al backend directamente.
- [x] Backend caído → `502` JSON (sin romper la página).
- [x] `pnpm check` sin warnings; backend (361) y frontend (201) en verde.
- [x] Verificación E2E con backend real: crear personaje, subir PNG por
      multipart y descargar el asset con los bytes intactos.

## Verificación E2E (resumen)

- **Dev + backend simulado**: health, SSE (6 eventos, dispersión ~790 ms →
  sin buffering), POST JSON, multipart de 64 KB y página HTML (200).
- **Dev + backend real (base temporal)**: personaje creado (201), listado,
  imagen subida (201) y asset descargado con bytes idénticos.
- **Producción (build standalone) + backend simulado**: los cinco chequeos
  anteriores en verde, incluido SSE.

## Commits

1. `feat(frontend): proxy /api through the frontend origin`
2. `test(frontend): cover the api proxy and base-url helpers`
3. `docs(slice): add S32 progress and mark the proxy prerequisite done`
4. `release: bump to v1.24.0 and add changelog entry`
