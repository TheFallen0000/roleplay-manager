# Implementación — Cloudflare Pages, Astro y Starlight

**Estado:** plan técnico. Nada de esto está desplegado todavía.
**Dominio:** `roleplay-manager.com` (Cloudflare; NS activos, sin A/CNAME).
**Prototipo:** `docs/prototypes/site.html` y `site-docs.html`.

---

## 1. Estado verificado del dominio

Comprobado el 2026-10-23:

```text
$ dig +short NS roleplay-manager.com
alla.ns.cloudflare.com.
will.ns.cloudflare.com.

$ dig +short A roleplay-manager.com
(vacío)
```

- El dominio está registrado y delegado a Cloudflare.
- No hay registros A/CNAME, así que todavía no sirve ningún sitio.
- No tocar registros MX ni el correo: el dominio no tiene correo configurado y
  el sitio no lo necesita.
- La zona ya está lista para el flujo de _custom domains_ de Cloudflare Pages,
  que crea el CNAME del apex automáticamente.

---

## 2. Hosting propuesto: Cloudflare Pages

### Por qué

- El dominio ya vive en Cloudflare: el certificado, el DNS y el CDN son un solo
  flujo.
- Previews por rama/PR, útil para revisar docs y copy antes de mergear.
- Deploy hooks para reconstruir el sitio cuando se publica una release.
- Plan gratuito suficiente para un sitio estático pequeño.
- Sin servidor que mantener y sin adaptador SSR: Astro genera HTML estático.

### Alternativas descartadas

| Opción           | Por qué no                                                                                                                   |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| GitHub Pages     | Funciona, pero el dominio y los redirects quedan más repartidos; Cloudflare Pages ya está en la misma cuenta que el dominio. |
| Vercel / Netlify | Buenos productos, pero añaden otra cuenta y otro DNS para un sitio estático.                                                 |
| Workers + SSR    | Innecesario: no hay login, formularios ni datos dinámicos en la web.                                                         |

---

## 3. Configuración de Cloudflare Pages

Cuando exista `packages/website`:

| Campo                  | Valor                                                   |
| ---------------------- | ------------------------------------------------------- |
| Repositorio            | `TheFallen0000/roleplay-manager`                        |
| Rama de producción     | `master`                                                |
| Root directory         | `/` (raíz del monorepo)                                 |
| Build command          | `pnpm --filter @workspace/website build`                |
| Build output directory | `packages/website/dist`                                 |
| Node version           | `24` (variable `NODE_VERSION=24`)                       |
| Package manager        | `PNPM_VERSION=11.21.0` (o el `packageManager` del root) |
| Framework preset       | Astro (o None)                                          |

Notas:

- Cloudflare ejecuta la instalación de dependencias antes del build command. El
  lockfile de pnpm en la raíz es el que manda.
- Si el build image no activa Corepack, el build command puede empezar con
  `corepack enable &&`; documentarlo en el proyecto, no en la UI de Pages.
- El build debe ser reproducible en local con el mismo comando.
- No usar `pnpm build` global: construiría backend/frontend y alargaría el deploy.
- Si se añade un `prebuild` que consulta GitHub, el `GITHUB_TOKEN` debe estar en
  las variables de entorno del proyecto de Pages (solo lectura pública; el token
  evita el rate limit).

### Previews

- Cada PR obtiene una URL `*.pages.dev`.
- Las previews no deben indexarse: `_headers` con `X-Robots-Tag: noindex` para
  `https://:project.pages.dev/*` y `https://:version.:project.pages.dev/*`.
- Se pueden proteger con Cloudflare Access si hace falta; para un sitio público
  no es necesario.

### Deploy hook

1. Pages → proyecto → **Settings → Builds → Add deploy hook**.
2. Nombre: `release`.
3. Rama: `master`.
4. Guardar la URL como secreto `CLOUDFLARE_DEPLOY_HOOK` en GitHub.
5. En el workflow de release, después de publicar:

```yaml
- name: Refresh website
  if: success()
  continue-on-error: true
  run: curl -fsS -X POST "$CLOUDFLARE_DEPLOY_HOOK"
  env:
    CLOUDFLARE_DEPLOY_HOOK: ${{ secrets.CLOUDFLARE_DEPLOY_HOOK }}
```

El `continue-on-error` evita que un fallo del sitio bloquee la release. El sitio
tiene su propio fallback de datos, así que una release no depende de este hook.

---

## 4. Dominio, DNS y HTTPS

### Apex + www

1. En Pages → **Custom domains**, añadir `roleplay-manager.com`.
   Cloudflare crea el CNAME del apex (flattening) automáticamente.
2. Añadir también `www.roleplay-manager.com` si se quiere cubrir el prefijo.
3. Elegir **apex canónico**: `https://roleplay-manager.com`.
4. Crear una **Redirect Rule** en Cloudflare:
   - Si `http.host eq "www.roleplay-manager.com"`.
   - Redirigir a `https://roleplay-manager.com` con 301.
5. No crear el CNAME a mano antes de asociar el dominio en Pages: el flujo
   manual puede dar error 522.

### SSL/TLS

- SSL/TLS mode: **Full (strict)**.
- **Always Use HTTPS**: on.
- HSTS: activar solo después de comprobar que apex y www funcionan; empezar con
  `max-age` bajo e ir subiendo.
- Certificado: Cloudflare lo emite automáticamente. No hace falta ACME manual.
- Si hay CAA, permitir los CA de Cloudflare; si no hay CAA, no crear una que
  bloquee la emisión.

### Comprobaciones

```bash
dig +short A roleplay-manager.com
dig +short CNAME www.roleplay-manager.com
curl -I https://roleplay-manager.com
curl -I https://www.roleplay-manager.com
```

Esperado: 200 en apex, 301 de www a apex, HTTPS válido, HSTS si se activó.

### Correo

No tocar MX. Si en el futuro se quiere `hola@roleplay-manager.com`, se configura
aparte (Cloudflare Email Routing o un proveedor); el sitio no lo necesita.

---

## 5. Estructura del paquete `packages/website`

```text
packages/website/
├── astro.config.mjs
├── package.json
├── tsconfig.json
├── public/
│   ├── _headers
│   ├── _redirects          # solo si hace falta; los host redirects van en Cloudflare
│   ├── robots.txt
│   └── brand/              # iconos y OG images generados
├── scripts/
│   └── fetch-release.mjs
├── src/
│   ├── assets/
│   │   ├── brand/          # mascota, wordmark, OG
│   │   └── screenshots/    # capturas EN/ES optimizadas
│   ├── components/
│   │   ├── landing/        # Hero, Trust, Ledger, Gallery, Steps, DataBand...
│   │   ├── download/       # DownloadButton, PlatformDialog
│   │   └── shared/         # Header, Footer, ThemeToggle, LanguageToggle
│   ├── content/
│   │   ├── docs/
│   │   │   └── docs/       # docs EN → /docs/...
│   │   │       ├── index.mdx
│   │   │       ├── getting-started/
│   │   │       ├── guides/
│   │   │       ├── reference/
│   │   │       └── contributing/
│   │   └── docs/es/
│   │       └── docs/       # docs ES → /es/docs/...
│   ├── data/
│   │   ├── release.json    # generado en build
│   │   └── release.fallback.json
│   ├── i18n/
│   │   ├── en.ts
│   │   └── es.ts
│   ├── layouts/
│   │   ├── LandingLayout.astro
│   │   └── DocsLayout.astro (si se necesita un wrapper)
│   ├── pages/
│   │   ├── index.astro
│   │   ├── download.astro
│   │   ├── es/index.astro
│   │   ├── es/download.astro
│   │   └── 404.astro
│   ├── styles/
│   │   ├── tokens.css
│   │   ├── landing.css
│   │   └── starlight.css
│   └── content.config.ts
└── README.md
```

### Dependencias

- `astro` 7.3.x.
- `@astrojs/starlight` 0.42.x (compatible con Astro 7.2.10+).
- `@astrojs/sitemap`.
- `@fontsource/dela-gothic-one`, `@fontsource/zen-maru-gothic`,
  `@fontsource/zen-kaku-gothic-new` (subsets latin + latin-ext).
- `sharp` ya está en el root para generar assets; Astro lo usa para optimizar.
- Nada de React en la web. Las islas son scripts TS pequeños.
- `typescript` y `@astrojs/check` para typecheck.

### Astro config

```js
import { defineConfig } from "astro/config"
import starlight from "@astrojs/starlight"
import sitemap from "@astrojs/sitemap"

export default defineConfig({
  site: "https://roleplay-manager.com",
  output: "static",
  integrations: [
    starlight({
      title: { en: "Roleplay Manager", es: "Roleplay Manager" },
      // Root locale: Starlight serves English at `/` without `defaultLocale`.
      locales: {
        root: { label: "English", lang: "en" },
        es: { label: "Español", lang: "es" },
      },
      customCss: ["./src/styles/starlight.css"],
      social: [
        {
          icon: "github",
          label: "GitHub",
          href: "https://github.com/TheFallen0000/roleplay-manager",
        },
      ],
      sidebar: [
        // grupos con translations; slugs bajo docs/
      ],
    }),
    sitemap(),
  ],
})
```

Starlight 0.42 permite `locales.root` y no necesita `defaultLocale` cuando el
inglés es el locale raíz. El contenido de docs va bajo `docs/` para que las URLs
sean `/docs/...` y `/es/docs/...`, sin chocar con la portada.

---

## 6. Idioma y rutas

### URLs

| Ruta                                             | Contenido             |
| ------------------------------------------------ | --------------------- |
| `/`                                              | Portada EN.           |
| `/es/`                                           | Portada ES.           |
| `/download`                                      | Selector completo EN. |
| `/es/download`                                   | Selector completo ES. |
| `/docs/`                                         | Docs home EN.         |
| `/es/docs/`                                      | Docs home ES.         |
| `/docs/getting-started/installation/windows/`    | Guía EN.              |
| `/es/docs/getting-started/installation/windows/` | Guía ES.              |

Los slugs se mantienen en inglés en ambos idiomas para no romper enlaces.

### Detección en la primera visita

Script en `<head>` de `/` (no en `/es/`):

```js
;(() => {
  const stored = localStorage.getItem("rm-lang")
  if (stored) return
  const langs = navigator.languages || [navigator.language]
  const spanishBrowser = langs.some((l) => l?.toLowerCase().startsWith("es"))
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ""
  const spanishZone = [
    "America/Mexico",
    "America/Bogota",
    "America/Lima",
    "America/Santiago",
    "America/Argentina",
    "America/Caracas",
    "America/Panama",
    "America/Costa_Rica",
    "America/El_Salvador",
    "America/Guatemala",
    "America/Havana",
    "America/La_Paz",
    "America/Asuncion",
    "America/Montevideo",
    "America/Puerto_Rico",
    "America/Santo_Domingo",
    "Europe/Madrid",
    "Atlantic/Canary",
    "Africa/Ceuta",
    "Pacific/Galapagos",
  ].some((zone) => tz.startsWith(zone))
  if (spanishBrowser || spanishZone) {
    document.documentElement.dataset.redirecting = "true"
    location.replace("/es/")
  }
})()
```

- Si el usuario ya eligió idioma (`rm-lang`), no redirigir.
- El toggle guarda `rm-lang` y navega a la ruta equivalente.
- No redirigir desde `/es/` a `/` automáticamente: si alguien entra directo a
  español, se respeta.
- La redirección debe ser instantánea y no bloquear el render; usar un script
  inline mínimo, no un fetch.
- `hreflang` en `<head>`:

```html
<link rel="alternate" hreflang="en" href="https://roleplay-manager.com/" />
<link rel="alternate" hreflang="es" href="https://roleplay-manager.com/es/" />
<link
  rel="alternate"
  hreflang="x-default"
  href="https://roleplay-manager.com/"
/>
```

- Si más adelante se quiere geo de Cloudflare, usar una Pages Function que lea
  `request.cf.country` y devuelva una sugerencia, no un redirect duro. La
  client-side heurística es suficiente para el lanzamiento.

---

## 7. Datos de release y descarga

### `fetch-release.mjs`

- Llama a `https://api.github.com/repos/TheFallen0000/roleplay-manager/releases/latest`.
- Si existe `GITHUB_TOKEN`, lo usa como `Authorization: Bearer`.
- Extrae `tag_name`, `html_url`, `published_at` y los assets que cumplen
  `roleplay-manager-<version>-<os>-<arch>.(zip|tar.gz)`.
- Calcula tamaño legible y conserva `browser_download_url`.
- Escribe `src/data/release.json`.
- Si falla, no rompe el build: usa `release.fallback.json` y deja un warning.
- El fallback se actualiza a mano en cada release importante.

### Componente de descarga

- Server-renderiza los enlaces reales (sin JS).
- Un script pequeño detecta SO/arquitectura y cambia el CTA principal.
- En Windows, enlace directo al ZIP x64.
- En macOS/Linux, abre el selector porque hay dos arquitecturas.
- En móvil, CTA «Download for your PC» y selector.
- El selector muestra la opción recomendada y los tamaños.
- `/download` es la página completa con todos los assets y notas de primera
  ejecución; sirve de fallback sin JS y para SEO.

---

## 8. Documentación con Starlight

### Contenido

- `src/content/docs/docs/index.mdx` → `/docs/`.
- `src/content/docs/es/docs/index.mdx` → `/es/docs/`.
- Cada guía es Markdown/MDX con frontmatter `title`, `description`.
- Sidebar manual por grupos, con `translations` para español.
- Pagefind indexa por idioma; comprobar que la búsqueda en `/es/` devuelve
  resultados en español.
- `editLink` apunta a `https://github.com/TheFallen0000/roleplay-manager/edit/master/`.
- `lastUpdated` opcional; el clone de Cloudflare puede ser shallow. Si no es
  fiable, desactivarlo.
- `credits: false`; el footer es nuestro.

### Estilo

- `customCss` con tokens Ink & Violet.
- Fuentes Fontsource, no Google Fonts.
- Sidebar de papel, activa en violeta suave.
- Contenido 60–75ch; TOC a la derecha.
- Callouts con hairline; warning en crimson.
- Código con Expressive Code y botón de copiar.
- 404 personalizada con la mascota (`disable404Route: true` + `src/pages/404.astro`).

### Búsqueda

- Pagefind viene con Starlight.
- Atajo `/` o `Ctrl/Cmd+K`.
- Resultados por idioma; sin resultados vacíos.
- Añadir términos naturales en el cuerpo: «descargar», «instalar», «actualizar»,
  «memoria», «ramas», «Tailscale», «Ollama».

### Mantenimiento

- Docs en el mismo repo y en el mismo PR que el cambio de UI.
- Regla en `AGENTS.md`: si cambia una pantalla o un menú, actualizar el tutorial
  in-app y la página de docs.
- Capturas con script reproducible; revisar en cada release que cambie la UI.

---

## 9. Capturas y assets

### Capturas necesarias

| Captura              | Uso                                             | Locale |
| -------------------- | ----------------------------------------------- | ------ |
| Biblioteca           | Hero, sección de funciones, docs de personajes. | EN/ES  |
| Chat (novela visual) | Hero, galería, docs de chat.                    | EN/ES  |
| Chat móvil           | Sección de teléfono, docs de PWA.               | EN/ES  |
| Proveedores          | Guía de proveedores.                            | EN/ES  |
| Memoria/resúmenes    | Guía de memoria.                                | EN/ES  |
| Actualización        | Guía de datos/actualizaciones.                  | EN/ES  |
| QR / acceso móvil    | Guía de teléfono.                               | EN/ES  |

- Usar datos sintéticos, como las capturas actuales; etiquetarlas como tales.
- Guardar en `src/assets/screenshots/<locale>/` y optimizar con Astro
  (`<Picture>` / `<Image>`), AVIF/WebP, `srcset`, width/height.
- La mascota se genera desde `docs/brand/logo-source.png` a 320/640/960 px
  transparente; reutilizar `scripts/generate-brand-assets.mjs` o un script
  equivalente para la web.
- OG image 1200×630 por idioma: papel, mascota, wordmark y tagline. Sin degradados.

---

## 10. Rendimiento, SEO y seguridad

### Presupuesto

| Métrica          | Objetivo                                                 |
| ---------------- | -------------------------------------------------------- |
| JS de portada    | < 30 KB gzip                                             |
| CSS              | < 30 KB gzip                                             |
| LCP móvil 4G     | < 2.5 s                                                  |
| CLS              | < 0.1                                                    |
| Lighthouse móvil | ≥ 95 en Performance, Accessibility, Best Practices y SEO |
| Fuentes          | 2–3 WOFF2, subsets latin + latin-ext                     |
| Imágenes         | AVIF/WebP responsive; lazy salvo hero                    |

### SEO

- `@astrojs/sitemap`.
- `robots.txt` con sitemap.
- Canonical por página.
- `hreflang` EN/ES + `x-default`.
- Títulos y descripciones únicos.
- JSON-LD `SoftwareApplication`:
  - `name`, `applicationCategory`, `operatingSystem`,
    `softwareVersion`, `license`, `downloadUrl`, `offers` con `price: 0`.
  - Sin `aggregateRating` ni reseñas inventadas.
- OG/Twitter cards.
- 404 real, no soft-404.

### Seguridad (Cloudflare Pages `_headers`)

Ejemplo base, ajustar CSP cuando se conozcan los scripts finales:

```text
/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  X-Frame-Options: DENY
  Permissions-Policy: camera=(), microphone=(), geolocation=()
  Content-Security-Policy: default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; font-src 'self'; script-src 'self' 'unsafe-inline'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'

/_astro/*
  Cache-Control: public, max-age=31536000, immutable

https://:project.pages.dev/*
  X-Robots-Tag: noindex

https://:version.:project.pages.dev/*
  X-Robots-Tag: noindex
```

- Astro genera scripts inline/hashed; una CSP estricta requiere hashes o nonces.
  Empezar con `'unsafe-inline'` solo si es necesario y endurecer después.
- No cargar Google Fonts, YouTube embeds ni analytics de terceros.
- HTTPS y HSTS desde Cloudflare.

### Privacidad

- Sin analytics por defecto.
- Sin cookies de marketing.
- Solo `localStorage` para idioma/tema.
- Las descargas se miden en GitHub Releases; no hace falta pixel.

---

## 11. CI/CD

### En cada PR

- `pnpm install --frozen-lockfile`.
- `pnpm check:arch` (no toca website; sigue protegiendo app).
- `pnpm --filter @workspace/website build`.
- `astro check`.
- Comprobación de enlaces internos (Lychee o script propio).
- Previews de Cloudflare Pages.

### En `master`

- Deploy automático de producción.
- Si el PR cambia solo docs, el build es igual de rápido.

### En release publicada

- Workflow de release publica assets.
- Paso final `curl -X POST $CLOUDFLARE_DEPLOY_HOOK`.
- El sitio reconstruye `release.json` con la nueva versión.
- Si el hook falla, la release sigue siendo válida; el sitio puede actualizarse a
  mano o en el siguiente push.

### Rollback

- Cloudflare Pages conserva deployments; rollback desde el dashboard.
- El contenido está en git; revertir el commit y redeploy.
- El actualizador de la app tiene su propio rollback; no confundir con el del
  sitio.

---

## 12. Plan por slices

### S82 — Portada + descarga

**Alcance**

- Crear `packages/website` con Astro.
- Portada EN/ES, header, hero, trust, ledger, galería, pasos, funciones, banda de
  datos, teléfono, índice de docs, FAQ, cierre y footer.
- `DownloadButton` con detección de SO y `PlatformDialog`.
- `/download` EN/ES.
- `fetch-release.mjs` + fallback.
- Tokens, fuentes Fontsource, imágenes optimizadas.
- Cloudflare Pages + dominio + HTTPS + redirect www.
- `_headers` y `robots.txt`.
- Tests manuales en 360/390/768/1024/1440.

**Criterios**

- CTA visible sin scroll a 360 px.
- Windows descarga directa; macOS/Linux abren selector; móvil dice «tu PC».
- Los 5 assets se alcanzan en ≤2 toques y los tamaños son correctos.
- Sin overflow horizontal; foco visible; contraste AA.
- Lighthouse móvil ≥95.
- Sin testimonios ni cifras inventadas.
- `CHANGELOG.md` bajo `[Unreleased]` y `docs/10-slices/S82-progress.md`.

### S83 — Documentación

**Alcance**

- Starlight bajo `/docs` y `/es/docs`.
- Docs home con buscador y tarjetas de inicio.
- 10–12 páginas ES/EN: qué es, instalación Windows/Linux/macOS, primeros pasos,
  actualizar, proveedores, personajes, chats/ramas, memoria, teléfono, datos,
  troubleshooting, glosario.
- Sidebar, TOC, callouts, código, feedback, editar en GitHub.
- Pagefind y búsqueda móvil.
- Enlaces desde la portada y desde la app (si se decide).
- Regla de mantenimiento en `AGENTS.md`.

**Criterios**

- Toda página alcanzable en ≤3 toques desde `/docs`.
- Paridad ES/EN; una página sin traducción no se publica.
- Búsqueda devuelve resultados en el idioma activo.
- Sin enlaces internos rotos.
- Capturas con alt y pie.
- `S83-progress.md` + CHANGELOG.

### S84 — Pulido y automatización

**Alcance**

- Capturas EN/ES definitivas.
- OG images, 404 con mascota.
- Auditoría Lighthouse y accesibilidad.
- `hreflang`, sitemap, JSON-LD.
- Deploy hook en release.
- Dominio y HSTS finales.
- Revisión de copy con hablantes nativos si es posible.

**Criterios**

- Lighthouse ≥95 en portada y docs.
- `hreflang` y canonical correctos.
- Deploy automático al publicar release.
- Sin warnings de consola.
- `S84-progress.md` + CHANGELOG.

---

## 13. Riesgos técnicos

| Riesgo                                          | Mitigación                                                                                     |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Cloudflare no detecta pnpm o la versión de Node | Fijar `NODE_VERSION` y `PNPM_VERSION`; probar build en una rama.                               |
| Conflicto de rutas `/` y `/docs` con Starlight  | Contenido de docs bajo `docs/`; portada en `src/pages/index.astro`; verificar rutas generadas. |
| Pagefind no indexa español                      | Comprobar `lang` en `<html>` y el índice por locale.                                           |
| La API de GitHub falla en build                 | `release.fallback.json` y enlace a `/releases/latest`.                                         |
| CSP rompe scripts de Astro/Starlight            | Empezar permisiva, revisar consola, endurecer con hashes.                                      |
| Redirect www mal configurado                    | Redirect Rule 301 + prueba con `curl -I`.                                                      |
| Capturas desactualizadas                        | Script de captura y checklist por release.                                                     |
| Duplicación tutoriales/docs                     | Regla en `AGENTS.md` y revisión en PR.                                                         |
| El dominio se renueva en un año                 | Añadir recordatorio de renovación antes de octubre de 2027.                                    |

---

## 14. Checklist de salida

- [ ] `pnpm --filter @workspace/website build` pasa en local.
- [ ] Build pasa en Cloudflare Pages.
- [ ] `roleplay-manager.com` responde 200 con HTTPS.
- [ ] `www.roleplay-manager.com` responde 301 al apex.
- [ ] `http://` redirige a `https://`.
- [ ] `/` y `/es/` tienen `hreflang` recíproco.
- [ ] `/docs` y `/es/docs` cargan y buscan.
- [ ] Los 5 assets de la última release descargan.
- [ ] El CTA cambia en Windows, macOS, Linux y móvil.
- [ ] SmartScreen/Gatekeeper documentados.
- [ ] Lighthouse móvil ≥95.
- [ ] Sin errores de consola.
- [ ] `_headers` aplica seguridad y cache.
- [ ] Previews de PR no se indexan.
- [ ] Deploy hook probado.
- [ ] `CHANGELOG.md` y slice docs actualizados.

---

## 15. Comandos de referencia

```bash
# desarrollo del sitio (cuando exista)
pnpm --filter @workspace/website dev

# build de producción
pnpm --filter @workspace/website build

# preview local del build
pnpm --filter @workspace/website preview

# comprobar tipos
pnpm --filter @workspace/website typecheck

# build completo del monorepo (incluye app)
pnpm build
```

## 16. Lo que no se ha hecho todavía

- No se ha creado el proyecto de Cloudflare Pages.
- No se ha modificado ningún registro DNS.
- No se ha creado `packages/website`.
- No se ha migrado contenido a Markdown/MDX.
- No se han generado capturas EN/ES ni OG images.
- No se ha añadido el deploy hook al workflow de release.
- No se ha tocado `CHANGELOG.md` (se hará en S82, no en esta fase de diseño).
