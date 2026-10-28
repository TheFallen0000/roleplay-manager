# S102 — Seguridad de la API

**Estado:** Completado (pendiente de release batched)
**Inicio:** 2026-10-28
**Fin:** 2026-10-28

## Descripción

Cierre de los hallazgos P0/P1 del barrido de seguridad:

- **CSRF**: las peticiones que cambian estado (`POST`, `PUT`, `PATCH`, `DELETE`)
  desde otro origen se rechazan antes de parsear el body. Cubre endpoints sin
  body como `/api/updates/backup`, `/api/lan/enable` o `/api/updates/restart`.
- **Errores de body-parser**: JSON malformado → **400**, payload demasiado
  grande → **413**, encoding no soportado → **415**. Antes caían en un 500
  genérico.
- **API 404**: las rutas `/api` desconocidas devuelven JSON 404 en vez del HTML
  404 de Astro/Express.
- **Mensajes de validación**: las issues raíz ya no se prefijan con `": "`.
- **Proxy de desarrollo**: Astro reenvía `X-Forwarded-Host`/`X-Forwarded-Proto`
  para que la guarda funcione también en `pnpm dev`, LAN y Tailscale.

No hay bump de versión: S102 se acumula en `[Unreleased]` junto con los
siguientes slices y se publicará en una sola release.

## Decisiones

- **Guarda en `/api` antes del body parser:** una petición cross-origin simple
  (form POST) no se puede bloquear solo con CORS; hay que rechazarla antes de
  que llegue a la ruta.
- **`Origin` + `Sec-Fetch-Site`:** se rechaza `cross-site` siempre y cualquier
  `Origin` cuyo host no sea el de la petición, el `CORS_ORIGIN` configurado o
  el host reenviado por el proxy. `same-site` sin `Origin` también se rechaza.
- **Clientes no-navegador:** sin `Origin` ni `Sec-Fetch-Site` se permite (curl,
  CLI, SSR). La guarda protege contra CSRF de navegador, no sustituye auth.
- **`X-Forwarded-Host`:** el middleware de Astro borra `Host` al proxificar; se
  reenvía el host original para validar same-origin en dev/LAN/Tailscale. Un
  navegador no puede falsificarlo sin preflight; un cliente local sí, pero el
  backend sigue en loopback y eso no aporta una ventaja nueva.
- **Errores 4xx de body-parser:** se mapean por `status`/`type` con mensajes
  genéricos; se registran como `warn`, sin volcar el body ni el mensaje crudo.
- **404 JSON antes de Astro:** el web handler va después de los routers y del
  404 de API, así los clientes REST nunca reciben HTML.
- **Fuera de alcance:** rate limiting, autenticación de LAN/Tailscale y CSP del
  sitio; quedan como hallazgos P2/P3 del barrido.

## Criterios de aceptación

- [x] Un POST cross-origin a `/api/updates/backup` devuelve 403 y no crea el
      backup.
- [x] Same-origin, `CORS_ORIGIN` de desarrollo y host proxificado se permiten.
- [x] JSON malformado devuelve 400 `INVALID_JSON`.
- [x] Payload demasiado grande devuelve 413 `PAYLOAD_TOO_LARGE`.
- [x] Ruta `/api` desconocida devuelve 404 JSON `NOT_FOUND`.
- [x] El backup desde la UI del paquete sigue funcionando (mismo origen).
- [x] Tests, `pnpm check`, build, smoke test y API real en verde.
- [x] `CHANGELOG.md` actualizado en `[Unreleased]`.

## Verificación

- Backend: **644** tests (112 archivos), incluidos 10 de la guarda de origen,
  3 del error handler y 3 de validación.
- Frontend: **335** tests (56 archivos), incluido el proxy con
  `X-Forwarded-Host`.
- `pnpm check`: arquitectura 7/7, typecheck y lint verdes.
- `pnpm build`: backend, frontend y website en verde.
- Paquete Linux y smoke test: PASS.
- API del paquete: **21/21**, incluidos cross-origin 403, JSON malformado 400,
  API 404 JSON y el backup online.
- Playwright/Chromium: la UI crea un backup desde `/settings/updates` sin
  errores de consola ni CSP.
- Proxy de desarrollo (Astro → backend): same-origin 200, cross-origin 403.

## Commits

1. `b5a9b3e feat(backend): protect API mutations and map client errors`
2. `28fc95a test(backend): cover API origin guard and client errors`
3. `docs(slice): document S102 API security` (this commit)
