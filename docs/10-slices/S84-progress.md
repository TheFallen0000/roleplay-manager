# S84 — Capturas reales, 404, OG y deploy

**Estado:** Implementado y desplegado en `roleplay-manager.com`; pendiente la revisión final en iPhone/Safari.
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
- Proyecto de Cloudflare Pages con subida directa, dominio propio, HTTPS,
  HSTS y redirección de `www` al apex.
- Workflow de GitHub Actions que construye y publica el sitio con Wrangler.

## Decisiones

- **Hero con la bienvenida Sakura.** Es la captura más luminosa y la que mejor
  presenta la identidad y los temas. Se eliminó la mascota superpuesta para no
  duplicar la que ya aparece en la captura.
- **Galería con tres pestañas en ambos idiomas.** Biblioteca, Chat y Teléfono.
  Las recapturas EN de la biblioteca y de Alice móvil permiten que la estructura
  sea idéntica en inglés y español.
- **Alice en la galería; Milka en la sección del teléfono.** Alice protagoniza
  la conversación de novela visual y la pestaña Teléfono; Milka refuerza la
  marca de la mascota en la sección del teléfono.
- **Sección de funciones:** biblioteca en ambos idiomas, ahora que la captura
  inglesa está traducida.
- **Sharp sí, pero con criterio.** Astro ya genera las variantes responsive.
  Sharp se usa para normalizar las fuentes, convertir a WebP y generar las OG.
- **Fuentes ignoradas por Git.** `screenshots-source/` no se versiona; se
  commitean los WebP procesados de `src/assets/screenshots/`.
- **404 bilingüe sin pose nueva.** Usa la mascota actual y deja el slot listo
  para una pose futura. Se desactiva la redirección automática de idioma para
  que el 404 no intente ir a `/es/404`.
- **Deploy desde GitHub Actions.** El proyecto de Pages usa subida directa y
  Cloudflare no compila el repositorio. `deploy-website.yml` instala, construye
  y publica `packages/website/dist` con Wrangler. La release lanza ese workflow
  con `gh workflow run`, sin bloquear la publicación si falla.
- **Header de Starlight con override local.** El enlace de descarga se resuelve
  a `/download/` o `/es/download/` según el locale de la ruta.

## Criterios de aceptación

- [x] Capturas EN/ES procesadas y usadas en el sitio.
- [x] Hero, galería, funciones y teléfono muestran capturas reales.
- [x] Sin overflow horizontal en 390 px.
- [x] 404 bilingüe con la mascota y enlaces útiles.
- [x] OG images `og-en.png` y `og-es.png` de 1200×630.
- [x] CTA de descarga localizado en el header de docs.
- [x] Workflow de build y deploy a Cloudflare Pages creado y probado.
- [x] `pnpm check`, build, typecheck y lint verdes.
- [x] Captura de la biblioteca con UI en inglés y capturas móviles de Alice integradas.
- [x] Proyecto Cloudflare Pages, dominio, HTTPS, HSTS y redirección de `www`.
- [x] Secretos `CLOUDFLARE_API_TOKEN` y `CLOUDFLARE_ACCOUNT_ID` en GitHub.

## Verificación

- `pnpm --filter @workspace/website build`: 31 páginas, 404, Pagefind,
  sitemap e imágenes optimizadas.
- `pnpm --filter @workspace/website typecheck`: 0 errores.
- `pnpm check`: arquitectura 7/7, typecheck y lint verdes.
- Chrome headless: landing EN/ES en escritorio y móvil, galería con tres
  pestañas en ambos idiomas, pestaña Teléfono con Alice móvil, 404 en escritorio
  y móvil, header de docs EN/ES con CTA localizado.
- Sin recursos 404 ni errores de consola en las páginas probadas.
- Producción: `https://roleplay-manager.com/`, `/es/`, `/docs/` y `/404`
  responden; una ruta inexistente devuelve 404; `http://` redirige a HTTPS;
  `www` redirige al apex con 301 y conserva ruta/query; HSTS activo.
- Primera publicación manual con Wrangler y token de Pages; el token de deploy
  está limitado a **Pages: Write**. El token amplio usado para configurar la
  cuenta se revocó después y un deploy manual de GitHub Actions siguió
  funcionando con el token limitado.

## Pendiente

- Revisar en un iPhone/Safari real.
- Valorar una pose nueva para el 404 cuando exista.

## Commits

1. `feat(website): add real screenshots, 404 and deploy hook` (`33873ec`)
2. `docs(website): document S84`
3. `feat(website): add English library and mobile Alice captures`
4. `chore(website): deploy to Cloudflare Pages from GitHub Actions`
