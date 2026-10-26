# S82 — Sitio público: portada y descarga

**Estado:** Completado; desplegado en producción (S84).
**Inicio:** 2026-10-23
**Fin:** 2026-10-23

## Descripción

El proyecto solo se explicaba en GitHub. Este slice crea el paquete
`packages/website` y la primera capa pública de **roleplay-manager.com**:

- Portada bilingüe (EN/ES) con la identidad «Ink & Violet».
- Descarga adaptada al sistema operativo: Windows directo; macOS/Linux con
  selector de arquitectura; móvil con el mensaje «descarga para tu PC».
- Página `/download` y `/es/download` con los cinco assets, tamaños,
  requisitos y avisos de primera ejecución.
- Snapshot de la última release de GitHub para no hardcodear versión ni URLs.
- Base para S83 (documentación Starlight) y S84 (capturas, OG, deploy hook).

La documentación completa del planteamiento está en
[`docs/11-website/`](../11-website/README.md) y el prototipo aprobado en
[`docs/prototypes/site.html`](../prototypes/site.html).

## Decisiones

- **Astro estático, sin React.** La portada no necesita hidratación de
  componentes; solo un script pequeño para tema, SO, menú y diálogo.
- **Paquete nuevo `@workspace/website`.** Comparte lockfile, Turbo y CI con el
  resto del monorepo. No se añade un repo separado.
- **Tokens y composición heredados del prototipo.** Se reutilizan las clases y
  el sistema visual de `docs/prototypes/site.css`, adaptados a Astro y a
  Fontsource self-hosted.
- **Dos rutas, no traducción en cliente.** `/` y `/es/` son páginas estáticas;
  los buscadores ven el contenido de cada idioma. La primera visita desde un
  navegador o zona horaria hispanohablante redirige a `/es/`; la elección manual
  se guarda en `localStorage` (`rm-lang`) y no se vuelve a autodetectar.
- **Sin geo por IP.** Se usa `navigator.languages` + zona horaria. Es
  privado y suficiente para el lanzamiento; una Pages Function con
  `CF-IPCountry` queda como mejora opcional.
- **Release en build time.** `scripts/fetch-release.mjs` consulta la API de
  GitHub y actualiza `src/data/release.json`; si falla, conserva el snapshot
  versionado. El sitio no depende de una llamada frágil en el navegador.
- **Descarga con fallback.** El CTA inicial enlaza a `/download` (funciona sin
  JS); el script cambia a descarga directa en Windows, abre el selector en
  macOS/Linux y muestra «tu PC» en móvil.
- **Documentación provisional.** `/docs` y `/es/docs` son una página `noindex`
  con enlaces al README hasta que S83 monte Starlight. No se publica el sitio
  como «completo» antes de S83.
- **Cloudflare Pages, no GitHub Pages.** El dominio ya está en Cloudflare. El
  proyecto y el DNS se configuran manualmente; este slice solo deja el build y la
  documentación listos.
- **Changelog y releases.** La web se despliega en cada push a `master`, sin
  tocar la versión de `package.json` ni crear una release de GitHub. La entrada
  va en `[Unreleased]` y viaja en la siguiente release batcheada de la app.

## Criterios de aceptación

- [x] `packages/website` existe y compila con `pnpm --filter @workspace/website build`.
- [x] `/`, `/es/`, `/download` y `/es/download` se generan como HTML estático.
- [x] El CTA cambia entre Windows, macOS, Linux, móvil y desconocido.
- [x] Windows descarga el ZIP x64; macOS/Linux abren el selector; móvil dice
      «Download for your PC» / «Descargar para tu PC».
- [x] El selector contiene los 5 assets reales de la última release y los
      tamaños del snapshot.
- [x] El idioma se autodetecta en la primera visita y se puede cambiar; la
      elección persiste.
- [x] El tema claro/oscuro/sistema funciona y no hay flash al cargar.
- [x] La galería y el FAQ son accesibles; sin overflow horizontal a 390 px.
- [x] `pnpm --filter @workspace/website typecheck` y `lint` pasan.
- [x] `pnpm check:arch` sigue en 7/7.
- [x] `CHANGELOG.md` tiene la entrada en `[Unreleased]`.
- [x] `AGENTS.md` documenta el paquete, el build y la política de releases.
- [x] Proyecto de Cloudflare Pages creado y dominio apuntado (S84).
- [x] Capturas EN/ES definitivas (S84).
- [x] Documentación Starlight (S83).
- [x] Deploy de la web al publicar una release mediante `deploy-website.yml`
      (sin deploy hook; el proyecto es direct-upload).

## Verificación

- `pnpm --filter @workspace/website build`: 6 páginas + imágenes optimizadas +
  sitemap.
- `pnpm --filter @workspace/website typecheck`: 0 errores.
- `pnpm --filter @workspace/website lint`: Prettier limpio.
- `pnpm check:arch`: 7/7.
- Pruebas con Chrome headless:
  - Windows: CTA «Download for Windows», enlace directo al ZIP.
  - macOS/Linux: CTA correcto y selector abierto.
  - iPhone: CTA «Descargar para tu PC», meta «Windows, Linux o macOS».
  - ES/EN: rutas y textos correctos; `rm-lang` respeta la elección.
  - Sin recursos 404 ni errores de consola.
- Lighthouse móvil del prototipo: 99 Performance / 100 Accessibility / 100 SEO.
  El sitio Astro usa las mismas imágenes optimizadas y fuentes self-hosted.

## Pendiente

- Revisar el sitio en un iPhone/Safari real (sigue abierto en S84).
- Analytics privacy-first solo si se pide; no está planificado.

> **Cierre (2026-10-26):** S83 completó la documentación y S84 las capturas,
> OG images, 404, dominio, HTTPS y el deploy desde GitHub Actions. El deploy hook
> se sustituyó por el dispatch de `deploy-website.yml`.

## Commits

1. `docs(website): add research, design and clickable prototype` (`d857f4a`)
2. `feat(website): add bilingual Astro landing and download flow` (`bd5f4dd`)
3. `docs(website): document S82, Cloudflare setup and release policy` (`56555dd`)
