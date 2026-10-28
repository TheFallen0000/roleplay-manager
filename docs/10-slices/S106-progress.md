# S106 — CSP y HSTS del sitio

**Estado:** Completado (pendiente de release batched)
**Inicio:** 2026-10-28
**Fin:** 2026-10-28

## Descripción

Endurecimiento del sitio estático (`packages/website`):

- **CSP por página** con `default-src 'self'`, `script-src 'self'` y hashes,
  `style-src-elem`/`style-src-attr` con `'unsafe-inline'` (Starlight inyecta
  estilos), `img-src 'self' data:`, `connect-src 'self'`, `worker-src` para
  Pagefind y `form-action 'self'`.
- **Bootstrap externo**: el script de tema/redirección de idioma se movió a
  `public/site-bootstrap.js`, así `script-src` no necesita `'unsafe-inline'`.
- **Postbuild de hashes**: Starlight inyecta dos scripts inline (atajo de
  búsqueda y actualización del selector de tema) que Astro no hashea.
  `scripts/csp-hashes.mjs` recorre el HTML construido y añade el SHA-256 de cada
  script inline a la CSP de esa página.
- **HSTS** y `Content-Security-Policy: frame-ancestors 'none'` en `_headers`
  (Cloudflare Pages). `frame-ancestors` no se pone en el meta porque el navegador
  lo ignora ahí.

## Decisiones

- **CSP con hashes, no `'unsafe-inline'` en scripts:** el sitio es estático y no
  necesita scripts inline arbitrarios; los hashes mantienen la protección.
- **Postbuild en vez de hash manual:** los hashes de Starlight cambian con sus
  versiones; calcularlos en cada build evita que la CSP se rompa al actualizar.
- **`frame-ancestors` solo en cabecera:** los navegadores ignoran esa directiva
  en un `<meta>`; la cabecera de Cloudflare Pages la aplica.
- **HSTS en `_headers`:** Cloudflare sirve el sitio por HTTPS; el header evita
  downgrades en visitas posteriores.
- **Estilos inline permitidos:** Starlight y sus componentes los usan; los
  estilos no ejecutan JavaScript.
- **Fuera de alcance:** CSP sin `'unsafe-inline'` en estilos, SRI en scripts
  externos y cambios de contenido.

## Criterios de aceptación

- [x] El sitio genera una CSP por página con `script-src 'self'` y hashes.
- [x] El bootstrap de tema/idioma es externo.
- [x] Los scripts inline de Starlight quedan hasheados en el postbuild.
- [x] `_headers` incluye HSTS y `frame-ancestors 'none'`.
- [x] Home, descargas, docs, tema, diálogo de plataformas y búsqueda funcionan
      sin violaciones CSP.
- [x] `pnpm check`, typecheck y build del sitio en verde.

## Verificación

- `pnpm --filter @workspace/website build`: 31 páginas, Pagefind y sitemap.
- `pnpm --filter @workspace/website typecheck`: 0 errores.
- Playwright/Chromium sobre `dist`: `/`, `/es/`, `/download`, `/es/download`,
  `/docs/` y `/es/docs/` con **0 violaciones CSP** y **0 errores de consola**.
- Interacciones comprobadas: toggle de tema, diálogo de plataformas y búsqueda
  de Starlight.
- `pnpm check`: arquitectura, typecheck y lint verdes.

## Commits

1. `82cf38b feat(website): add CSP, HSTS and hashed inline scripts`
2. `docs(slice): document S106 website CSP` (this commit)
