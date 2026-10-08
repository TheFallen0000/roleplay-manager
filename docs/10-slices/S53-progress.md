# S53 — Identidad visual: favicon y logo con la mascota

**Estado:** Completado
**Inicio:** 2026-10-08
**Fin:** 2026-10-08

## Descripción

El favicon seguía siendo el de Astro y el logo del sidebar era un SVG genérico.
Se adopta la mascota de la app como identidad visual (favicon, sidebar y pantalla
de bienvenida) con assets optimizados generados desde el arte original.

## Decisiones

- **Base: el PNG original optimizado, no el SVG trazado.** El `logo.svg` de
  VTracer pesaba 706 KB y tenía artefactos de trazado; los derivados PNG (palette)
  suman ~38 KB y conservan el arte original.
- **Encuadre por tamaño**: favicon y sidebar usan un recorte cuadrado de la cara
  (legible a 16-32px); el welcome usa la mascota completa. Es la práctica habitual
  del "logo responsive": versión simplificada a tamaños pequeños.
- **Generación reproducible**: `pnpm brand:generate`
  (`scripts/generate-brand-assets.mjs`, con sharp como devDependency del root)
  parte de `docs/brand/logo-source.png` y escribe los derivados en `public/`, que
  se commitean. El PNG fuente (2400², 2.1 MB) vive en `docs/brand/`, fuera de
  `public/` (nunca se sirve).
- **La marca vive en el frontend**: se elimina `packages/ui/src/components/logo.tsx`
  (el paquete `ui` es genérico) y se añade `components/layout/brand.tsx`
  (`BrandFace`, `BrandMascot`), usado por el sidebar y el welcome.
- **Sidebar**: cara de 24px (`size-6`) con `p-3` en el header: 12 + 24 + 12 = 48px,
  el ancho exacto del riel colapsado (centrado sin recortes).
- **Favicons PNG** (16/32/48) + `apple-touch-icon` (180) enlazados en `base.astro`;
  se elimina el `favicon.svg` de Astro y el `logo.svg` trazado.
- **Smoke test del paquete**: ahora verifica que `/favicon-32x32.png`,
  `/brand/face-96.png` y `/brand/mascot-192.png` se sirven como `image/png`.

## Criterios de aceptación

- [x] El favicon es la mascota (16/32/48 + apple-touch-icon), no el de Astro.
- [x] El sidebar muestra la cara a 24px, centrada también en modo colapsado.
- [x] El welcome muestra la mascota completa.
- [x] No quedan referencias al logo SVG viejo.
- [x] `pnpm brand:generate` reproduce los assets desde la fuente.
- [x] Gates: `pnpm check`, tests, build y smoke test del paquete en verde.

## Verificación

- Assets revisados visualmente (cara a 24px, favicon a 16/32px, mascota a 192px).
- `pnpm check` 7/7, backend y frontend en verde, `pnpm build` ✓.
- `pnpm package:app` + smoke test: los assets de marca se sirven desde el paquete ✓.
- Nota: la comprobación visual final del sidebar y el welcome en el navegador
  queda del lado del usuario (no hay capturas automatizadas).

## Commits

1. `feat(brand): add the mascot assets and a generation script`
2. `feat(frontend): use the mascot as favicon, sidebar and welcome mark`
3. `test(packaging): smoke-test the brand assets in the packaged app`
4. `docs(slice): add S53 progress and document the brand assets`
5. `release: bump to v1.34.0 and add changelog entry`
