# S84 — Capturas reales, 404, OG y deploy

**Estado:** Implementado en local; pendiente de Cloudflare Pages, dominio y una captura EN de la biblioteca.
**Inicio:** 2026-10-23
**Fin:** 2026-10-23

## Descripción

S84 cierra la capa de presentación con material real y los últimos detalles de
producción:

- Capturas de la app en inglés y español para el hero, la galería, la sección
  de funciones y la sección del teléfono.
- Pipeline de Sharp para normalizar las capturas originales y generar WebP.
- OG images de 1200×630 por idioma.
- 404 bilingüe con la mascota actual.
- CTA de descarga localizado en el header de Starlight.
- Workflow que dispara el Deploy Hook de Cloudflare Pages al publicar una
  release.

## Decisiones

- **Hero con la bienvenida Sakura.** Es la captura más luminosa y la que mejor
  presenta la identidad y los temas. Se eliminó la mascota superpuesta para no
  duplicar la que ya aparece en la captura.
- **Galería por locale.** En español: Biblioteca, Chat y Teléfono. En inglés:
  Chat y Teléfono, porque `characters-list-eng.png` tiene la UI en español.
- **Chat de la galería con Alice; hero con Milka.** Las dos conversaciones son
  sintéticas y están traducidas; Alice aporta contraste en la galería y Milka
  refuerza la marca de la mascota en el hero.
- **Sección de funciones:** biblioteca en español y chat en inglés hasta tener
  la biblioteca EN.
- **Sharp sí, pero con criterio.** Astro ya genera las variantes responsive.
  Sharp se usa para normalizar las fuentes, convertir a WebP y generar las OG.
- **Fuentes ignoradas por Git.** `screenshots-source/` no se versiona; se
  commitean los WebP procesados de `src/assets/screenshots/`.
- **404 bilingüe sin pose nueva.** Usa la mascota actual y deja el slot listo
  para una pose futura. Se desactiva la redirección automática de idioma para
  que el 404 no intente ir a `/es/404`.
- **Deploy Hook opcional.** Si `CLOUDFLARE_DEPLOY_HOOK` no existe, el workflow
  termina sin fallar; la release no se bloquea.
- **Header de Starlight con override local.** El enlace de descarga se resuelve
  a `/download/` o `/es/download/` según el locale de la ruta.

## Criterios de aceptación

- [x] Capturas EN/ES procesadas y usadas en el sitio.
- [x] Hero, galería, funciones y teléfono muestran capturas reales.
- [x] Sin overflow horizontal en 390 px.
- [x] 404 bilingüe con la mascota y enlaces útiles.
- [x] OG images `og-en.png` y `og-es.png` de 1200×630.
- [x] CTA de descarga localizado en el header de docs.
- [x] Workflow de deploy hook creado y tolerante a secretos ausentes.
- [x] `pnpm check`, build, typecheck y lint verdes.
- [ ] Captura de la biblioteca con UI en inglés (pendiente).
- [ ] Proyecto Cloudflare Pages y dominio (manual).
- [ ] Secreto `CLOUDFLARE_DEPLOY_HOOK` en GitHub (manual).

## Verificación

- `pnpm --filter @workspace/website build`: 31 páginas, 404, Pagefind,
  sitemap e imágenes optimizadas.
- `pnpm --filter @workspace/website typecheck`: 0 errores.
- `pnpm check`: arquitectura 7/7, typecheck y lint verdes.
- Chrome headless: landing EN/ES en escritorio y móvil, 404 en escritorio y
  móvil, header de docs EN/ES con CTA localizado.
- Sin recursos 404 ni errores de consola en las páginas probadas.

## Pendiente

- Recapturar `characters-list` con la UI en inglés y añadir la pestaña
  Biblioteca a `/`.
- Crear el proyecto de Cloudflare Pages, apuntar el dominio y configurar el
  secreto del deploy hook.
- Revisar en un iPhone/Safari real.
- Valorar una pose nueva para el 404 cuando exista.

## Commits

1. `feat(website): add real screenshots, 404 and deploy hook` (`33873ec`)
2. `docs(website): document S84`
