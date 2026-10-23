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
- `src/pages/docs/`: placeholder hasta S83; después Starlight.
- `src/components/`: componentes de la portada y la descarga.
- `src/i18n/`: diccionarios EN/ES.
- `src/data/release.json`: snapshot de la última release.
- `scripts/fetch-release.mjs`: actualiza el snapshot en build.
- `public/_headers`: seguridad y caché para Cloudflare Pages.

## Cloudflare Pages

- Root directory: `/`
- Build command: `pnpm --filter @workspace/website build`
- Output directory: `packages/website/dist`
- Variables: `NODE_VERSION=24`, `PNPM_VERSION=11.21.0`,
  `GITHUB_TOKEN` (opcional, solo lectura pública, evita el rate limit).
- Custom domain: `roleplay-manager.com`; `www` redirige al apex con una
  Redirect Rule 301.

El deploy de producción se dispara al hacer push a `master`. Para actualizar la
versión que muestra la web sin cambiar código, añadir un Deploy Hook de Pages y
llamarlo desde el workflow de release (S84).
