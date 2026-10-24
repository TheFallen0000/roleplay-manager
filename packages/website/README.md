# roleplay-manager.com

Sitio público de Roleplay Manager: portada, descarga y documentación.

## Desarrollo

```bash
pnpm --filter @workspace/website dev
```

Astro sirve el sitio en `http://localhost:4321`. El build lee la última release
de GitHub con `scripts/fetch-release.mjs`; si la API falla, conserva
`src/data/release.json`.

```bash
pnpm --filter @workspace/website build
pnpm --filter @workspace/website preview
pnpm --filter @workspace/website typecheck
```

## Estructura

- `src/pages/index.astro` y `src/pages/es/index.astro`: portada EN/ES.
- `src/pages/download.astro` y `src/pages/es/download.astro`: selector completo.
- `src/content/docs/docs/` y `src/content/docs/es/docs/`: documentación Starlight EN/ES.
- `src/components/`: componentes de la portada y la descarga.
- `src/i18n/`: diccionarios EN/ES.
- `src/data/release.json`: snapshot de la última release.
- `scripts/fetch-release.mjs`: actualiza el snapshot en build.
- `public/_headers`: seguridad y caché para Cloudflare Pages.

## Capturas y OG

- `screenshots-source/` (ignorada por Git) contiene las capturas originales.
- `pnpm --filter @workspace/website screenshots` las convierte a WebP en
  `src/assets/screenshots/{en,es}/` con Sharp.
- `pnpm --filter @workspace/website og` genera `public/og-en.png` y
  `public/og-es.png` a partir de la bienvenida Sakura.
- **Pendiente:** falta una captura de la biblioteca con la UI en inglés;
  `characters-list-eng.png` está en español. Mientras tanto, `/es/` muestra la
  pestaña Biblioteca y `/` muestra Chat y Teléfono.

## Cloudflare Pages

- Root directory: `/`
- Build command: `pnpm --filter @workspace/website build`
- Output directory: `packages/website/dist`
- Variables: `NODE_VERSION=24`, `PNPM_VERSION=11.21.0`,
  `GITHUB_TOKEN` (opcional, solo lectura pública, evita el rate limit).
- Custom domain: `roleplay-manager.com`; `www` redirige al apex con una
  Redirect Rule 301.

El deploy de producción se dispara al hacer push a `master`. Para actualizar la
versión que muestra la web sin cambiar código, crear un Deploy Hook de Pages y
guardar su URL como secreto `CLOUDFLARE_DEPLOY_HOOK` en GitHub. El workflow de
release lo llama al publicar; `.github/workflows/deploy-website.yml` permite
relanzarlo manualmente.
