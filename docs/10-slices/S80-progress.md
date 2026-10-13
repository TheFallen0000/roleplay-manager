# S80 — Imágenes del chat también en acceso remoto

**Estado:** Completado
**Inicio:** 2026-10-13
**Fin:** 2026-10-13

## Descripción

Arregla las imágenes rotas del chat al entrar desde el teléfono (LAN, Tailscale
o túnel): el avatar y el fondo del chat se renderizan en el servidor (isla
`Chat` con `client:load`) y sus `<img src>` se construían con
`getPublicBaseUrl()`, que devolvía `PUBLIC_API_URL`. El release configura esa
variable en runtime (`http://localhost:<port>`), así que el HTML servido
apuntaba a `http://localhost:3001/...`: en el PC coincidía con el servidor y se
veía; en cualquier otro dispositivo apuntaba a **su propio** localhost y la
imagen quedaba rota sin llegar siquiera al backend. La hidratación de React no
corrige atributos (`src`) desajustados, así que la imagen no se recuperaba sola.

El diseño original de S32 ya lo decía: las URLs incrustadas en HTML son
**siempre relativas**, para resolver contra el origen de la página y pasar por
el proxy same-origin. El override de `PUBLIC_API_URL` (S32) y, sobre todo, su
lectura en runtime (S40) rompieron esa promesa.

## Decisiones

- **`getCharacterAssetUrl` siempre relativa**: se elimina `getPublicBaseUrl`
  (su único consumidor era esta función). `getBaseUrl()` conserva el override
  porque los `fetch` de SSR sí necesitan una URL absoluta.
- **Sin cambios en los fetchs**: la resolución del backend en SSR
  (`PUBLIC_API_URL`) y el destino del proxy (`API_PROXY_TARGET`) no se tocan.
- **Guardarraíl en el smoke del paquete**: el release ya ejecuta
  `scripts/smoke-package.mjs` antes de publicar; ahora crea una conversación y
  comprueba que el HTML servido del chat incruste el avatar con URL relativa y
  que no aparezca `http://localhost:`.

## Criterios de aceptación

- [x] El HTML SSR del chat usa `/api/characters/...` (relativo) incluso con
      `PUBLIC_API_URL` definida en runtime.
- [x] Un mismo build funciona en localhost, LAN y Tailscale (sin URLs absolutas
      a localhost en el markup).
- [x] Tests del cliente actualizados y suites en verde.
- [x] Smoke del paquete con los checks nuevos.
- [x] CHANGELOG en `[Unreleased]` (`Fixed`).

## Verificación

- **Prueba roja (release 1.46.1, con cookie `rm_onboarded=1`)**: el SSR del chat
  servía `src="http://localhost:3001/..."` (5 ocurrencias); Playwright sobre la
  URL de Tailscale reportaba `Mixed Content: ... insecure element`.
- **Prueba verde (paquete con el fix)**:
  - Smoke (corre en el release antes de publicar): *SSR chat markup embeds
    avatars with relative URLs* + *no absolute localhost URLs* → **PASS**.
  - Navegador real contra `http://100.102.126.94:3212` (IP de Tailscale, origen
    no-localhost): el avatar carga desde el propio origen
    (`…/api/characters/…?variant=thumbnail`, `naturalWidth > 0`) y la consola
    queda sin avisos de Mixed Content.
- Suites: frontend **316** tests, backend **519**, `pnpm check` 7/7.

## Commits

1. `fix(frontend): keep SSR asset URLs relative for remote clients`
2. `test(smoke): assert relative asset URLs in packaged SSR markup`
3. `docs(slice): add S80 progress`
