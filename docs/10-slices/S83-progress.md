# S83 — Documentación bilingüe con Starlight

**Estado:** Completado; desplegado en producción (S84).
**Inicio:** 2026-10-23
**Fin:** 2026-10-23

## Descripción

Sustituye el placeholder `/docs` de S82 por una documentación real, bilingüe y
buscable con **Astro Starlight**:

- `/docs/` en inglés y `/es/docs/` en español, con el mismo árbol.
- 13 páginas por idioma: inicio, qué es Roleplay Manager, instalación Windows,
  instalación Linux/macOS, primeros pasos, proveedores, personajes y ramas,
  memoria y resúmenes, acceso desde el teléfono, datos y actualizaciones,
  solución de problemas, glosario y desarrollo.
- Sidebar manual con traducciones, TOC, navegación anterior/siguiente, enlace
  para editar en GitHub y búsqueda Pagefind.
- Tema Ink & Violet sobre Starlight: papel, tinta, violeta, tipografía de la app
  y modo claro/oscuro.
- La portada y `/download` siguen usando el layout propio de S82; Starlight solo
  gobierna `/docs`.

## Decisiones

- **Starlight 0.42.6**, compatible con Astro 7.3.5. Es el mismo framework del
  resto del sitio y añade búsqueda, i18n, TOC y navegación sin otro stack.
- **Contenido bajo `/docs`:** `src/content/docs/docs/` para inglés y
  `src/content/docs/es/docs/` para español. Así las URLs son `/docs/...` y
  `/es/docs/...` sin chocar con la portada.
- **Slugs en inglés en ambos idiomas** para no romper enlaces; los títulos,
  descripciones y contenido se traducen.
- **Sidebar manual**, no autogenerada: permite ordenar por tareas y traducir
  cada etiqueta con `translations`.
- **Una página por tarea**, no una copia del README. Cada guía tiene objetivo,
  pasos, avisos y enlaces relacionados.
- **Sin botón de descarga en el header de Starlight todavía.** El inicio de docs
  tiene acciones de instalación y descarga; S84 puede añadir el CTA al header
  mediante un override si hace falta.
- **Sin capturas nuevas todavía.** Las guías son texto; S84 añade capturas
  EN/ES, OG images y un 404 propio.
- **Pagefind** indexa las 31 páginas generadas. La búsqueda se probó en inglés
  y devuelve resultados.
- **Los enlaces del sitio** (`Docs` en la portada, footer y tarjetas) ya apuntan
  a `/docs/` y `/es/docs/`; el placeholder se eliminó.

## Criterios de aceptación

- [x] `/docs/` y `/es/docs/` se generan con Starlight.
- [x] 13 páginas equivalentes en inglés y español.
- [x] Sidebar con etiquetas traducidas y página activa.
- [x] Búsqueda Pagefind operativa.
- [x] Navegación anterior/siguiente y enlace de edición.
- [x] Tema claro/oscuro y tipografía Ink & Violet.
- [x] Sin errores de typecheck, lint ni build.
- [x] Sin enlaces internos rotos.
- [x] `CHANGELOG.md` con la entrada en `[Unreleased]`.
- [x] `AGENTS.md` actualizado con la estructura de docs.
- [x] Capturas EN/ES y OG images (S84).
- [x] Cloudflare Pages y dominio (S84).
- [x] 404 personalizado (S84).

## Verificación

- `pnpm --filter @workspace/website build`: 31 páginas, Pagefind indexado,
  sitemap generado.
- `pnpm --filter @workspace/website typecheck`: 0 errores.
- `pnpm --filter @workspace/website lint`: Prettier limpio.
- Chrome headless:
  - `/docs/` y `/es/docs/` con título y `lang` correctos.
  - Sidebar EN/ES con etiquetas traducidas.
  - Búsqueda «ollama» devuelve resultados.
  - Página de instalación en escritorio y móvil legible.
  - Sin recursos 404 ni errores de consola.

## Pendiente

- Revisar el copy con hablantes nativos si se quiere pulir el tono: **PM.43**.

> **Cierre (2026-10-26):** S84 añadió capturas, OG images, 404, Cloudflare Pages,
> dominio y el CTA de descarga en el header de Starlight. Solo queda la revisión
> editorial del copy.

## Commits

1. `feat(website): add Starlight documentation in English and Spanish`
2. `docs(website): document S83 and update changelog`
