# S95 — Hardening de red y cabeceras

**Estado:** Completado (v1.54.0)
**Inicio:** 2026-10-27
**Fin:** 2026-10-27

## Descripción

Endurecimiento del servidor local sin cambiar la API ni el modelo de acceso:

- `HOST` por defecto en **127.0.0.1**.
- `helmet` para cabeceras de seguridad.
- CSP generada por Astro con `script-src` estricto.
- Scripts de arranque movidos a un archivo externo.
- `Cache-Control: no-store` para `/api`.
- Dependabot para dependencias npm/pnpm, separado por producción y desarrollo.

## Decisiones

- **Loopback por defecto:** sin `HOST`, el backend ya no escucha en todas las
  interfaces. El lanzador portátil sigue fijando `127.0.0.1`; el acceso desde el
  teléfono pasa por el proxy de LAN/Tailscale del frontend, no por el backend.
- **Helmet sin CSP propia:** Astro genera una CSP completa por página. Una
  segunda política HTTP con `default-src` se combinaría con la de Astro y podría
  bloquear recursos. Helmet cubre el resto de cabeceras y Express añade solo
  `frame-ancestors 'none'` y `Permissions-Policy`.
- **CSP de Astro:** `script-src 'self'` con los hashes que Astro genera para sus
  scripts procesados. Los dos scripts inline de `base.astro` (tema y service
  worker/install prompt) se movieron a `public/rm-bootstrap.js` para no necesitar
  `'unsafe-inline'` en scripts.
- **Estilos inline permitidos:** `react-easy-crop` y `sonner` inyectan etiquetas
  `<style>` en runtime, y React usa atributos `style`. Se permite
  `'unsafe-inline'` solo en `style-src-elem`/`style-src-attr`; los scripts siguen
  estrictos. Los estilos inline no ejecutan JavaScript.
- **Sin segundo CSP para API:** las respuestas JSON no necesitan CSP; la
  cabecera de Express solo fija `frame-ancestors` y `Permissions-Policy`.
- **Dependabot npm:** actualizaciones semanales agrupadas por tipo de
  dependencia, con límite de PRs para no inundar el repositorio.
- **Fuera de alcance:** CSP de estilos sin `'unsafe-inline'` (exigiría empaquetar
  los estilos de las librerías), autenticación de acceso remoto y cifrado en
  reposo (S96).

## Criterios de aceptación

- [x] El backend escucha en loopback si no se define `HOST`.
- [x] `helmet` añade `X-Content-Type-Options`, `X-Frame-Options: DENY`,
      `Referrer-Policy` y HSTS.
- [x] `frame-ancestors 'none'` y `Permissions-Policy` se envían en todas las
      respuestas.
- [x] `/api` responde con `Cache-Control: no-store`.
- [x] Astro genera una CSP con `script-src 'self'` y hashes.
- [x] El bootstrap de tema/service worker es un archivo externo.
- [x] La app empaquetada no registra violaciones CSP en Chromium.
- [x] Dependabot cubre npm/pnpm además de GitHub Actions.
- [x] Backend, frontend, `pnpm check`, build y smoke test en verde.
- [x] `CHANGELOG.md` actualizado en `[Unreleased]`.

## Verificación

- Backend: **621** tests (108 archivos), incluidos cabeceras, no-store, CSP
  header y el default de `HOST`.
- Frontend: **335** tests (56 archivos).
- `pnpm check`: arquitectura 7/7, typecheck y lint verdes.
- `pnpm build`: backend, frontend y website en verde.
- Paquete Linux y smoke test completos, incluyendo CSP, bootstrap externo y
  endpoint de mensajes.
- Playwright/Chromium sobre la app empaquetada: **0 violaciones CSP**, tema
  aplicado, fondo calculado y burbujas renderizadas.
- `pnpm audit --prod`: sin cambios de dependencias de producción salvo helmet;
  0 críticas.

## Commits

1. `492edea feat(security): harden headers, CSP and loopback binding`
2. `docs(slice): add S95 progress and security notes` (this commit)
