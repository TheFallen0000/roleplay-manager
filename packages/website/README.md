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
- La galería usa la biblioteca, la conversación de Alice en estilo novela
  visual y la captura móvil de Alice; la sección del teléfono usa la captura
  móvil de Milka. Las dos bibliotecas y las dos conversaciones móviles están
  traducidas.

## Cloudflare Pages

El proyecto `roleplay-manager` usa **subida directa**: Cloudflare no compila el
repositorio. El build y el deploy los hace GitHub Actions:

- Workflow: `.github/workflows/deploy-website.yml`.
- Se ejecuta al cambiar `packages/website/**`, `package.json` o el lockfile, y
  también con `workflow_dispatch`.
- Instala dependencias, ejecuta
  `pnpm --filter @workspace/website build` y publica `packages/website/dist`
  con Wrangler.
- Secretos: `CLOUDFLARE_API_TOKEN` (permiso **Pages: Write**) y
  `CLOUDFLARE_ACCOUNT_ID`.
- El workflow de release lo relanza con
  `gh workflow run deploy-website.yml --ref master` para refrescar la versión
  descargable.
- Dominio: `roleplay-manager.com`; `www` redirige al apex con una Redirect Rule 301. HTTPS y HSTS están activos en la zona.

Para reproducir el build en local:

```sh
pnpm --filter @workspace/website build
```
