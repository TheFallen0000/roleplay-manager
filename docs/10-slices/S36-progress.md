# S36 — Cachés del optimizador separadas (v1.25.3)

**Estado:** Completado
**Inicio:** 2026-10-06
**Fin:** 2026-10-06

## Descripción

En el teléfono, la pantalla de bienvenida se veía pero **no era interactiva**:
el botón «Continue» animaba (CSS) pero no ocurría nada (sin hidratación de
React). El mismo fallo afectaba a cualquier isla.

**Causa raíz**: los módulos pre-empaquetados de Vite devolvían
`504 (Outdated Optimize Dep)` y la hidratación moría con `Failed to fetch
dynamically imported module`. El dev server tenía en memoria un conjunto de
deps cuyo hash ya no existía en disco porque **`pnpm build` reescribía la misma
caché** (`node_modules/.vite/deps`) mientras el dev server estaba en marcha.
No era un problema del túnel ni del teléfono.

## Diagnóstico

- Reproducido con un navegador **móvil headless** (Edge + `puppeteer-core`)
  contra la URL del túnel: 504 en los deps y `[astro-island] Error hydrating`.
- Experimento controlado: `vitest` **no** toca `.vite/deps`; `pnpm build`
  **sí** (el `browserHash` del metadata cambiaba con cada build).

## Decisiones

- **`cacheDir` separados por comando** en `astro.config.mjs`:
  - dev (`pnpm dev`) → `node_modules/.vite-dev`
  - build (`pnpm build`) → `node_modules/.vite-build`
  - Detección con `process.argv.includes("build")`: Astro no admite config por
    comando (el `vite` de la config es un objeto, no una función) y
    `vite.cacheDir` aplica a todos los comandos; sin la condición, el build
    seguía escribiendo en la caché del dev.
- **Prueba de regresión**: con el dev server corriendo, un build deja
  `.vite-dev` intacta (mismo hash y mtime), usa `.vite-build`, y el móvil sigue
  hidratando por el túnel (cookie `rm_onboarded=1` tras pulsar «Continue»).
- La caché antigua `node_modules/.vite` quedó en desuso y se eliminó.

## Criterios de aceptación

- [x] La bienvenida hidrata y responde por el túnel (verificado en móvil headless).
- [x] Un build con el dev server en marcha ya no invalida los deps del dev.
- [x] El build usa su propia caché.
- [x] `pnpm check` sin warnings; backend (381) y frontend (213) en verde.
- [x] `pnpm build` correcto.

## Commits

1. `fix(frontend): keep the dev and build optimizer caches apart`
2. `docs(slice): add S36 progress`
3. `release: bump to v1.25.3 and add changelog entry`
