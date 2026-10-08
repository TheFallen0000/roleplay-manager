# S54 — PWA instalable (manifest + iconos; sin service worker)

**Estado:** Completado
**Inicio:** 2026-10-08
**Fin:** 2026-10-08

## Descripción

La app se puede instalar como PWA: icono en la pantalla de inicio/escritorio y
ventana propia sin barra del navegador. Incluye manifest, iconos de instalación
opacos (192/512/maskable) y los metas que iOS necesita. Sin service worker: no
hay offline.

## Decisiones

- **Sin service worker** (decidido con el usuario): el offline no aporta aquí (la
  app depende del servidor local) y añade riesgo de servir una shell
  desactualizada tras una actualización.
- **Iconos de instalación opacos** sobre placa crema `#f7f1ec` (a tono con el
  arte): iOS/Android rellenan la transparencia con un color que no controlamos.
  Los favicons siguen **transparentes** (se ven mejor en la pestaña).
- **Maskable**: `icon-maskable-512.png` con la cara al 70% para quedar dentro de
  la zona segura (~80%) del recorte circular/squircle de Android.
- **Manifest estático** (`public/manifest.webmanifest`): `name` "Roleplay
  Manager", `short_name` "Roleplay", `start_url` y `scope` "/", `display`
  "standalone", colores crema e iconos 192/512/maskable.
- **iOS**: `apple-mobile-web-app-title` + metas `*-web-app-capable` (iOS < 16.4
  los necesita para abrir en modo standalone).
- **Alcance real**: instalable por `localhost` (escritorio) y por HTTPS
  (Tailscale); **no** por LAN con IP (no es contexto seguro: no aparece la opción
  de instalar, es esperado).
- **Smoke test**: comprueba que el manifest se sirve y cumple los criterios de
  instalación de Chrome (`name`, `display: standalone`, `start_url`, iconos
  192/512 y un maskable) y que los tres iconos responden como `image/png`.

## Criterios de aceptación

- [x] `pnpm brand:generate` produce los iconos 192/512/maskable y el
      `apple-touch-icon` opacos.
- [x] El manifest se sirve y cumple los criterios de instalación de Chrome.
- [x] `base.astro` enlaza el manifest y los metas de iOS.
- [x] Smoke test del paquete en verde con las nuevas comprobaciones.
- [x] Gates: `pnpm check`, tests y build en verde.

## Verificación

- Iconos revisados visualmente (placa crema; margen del maskable).
- `pnpm check` 7/7, backend y frontend en verde, `pnpm build` ✓.
- `pnpm package:app` + smoke test ✓ (manifest + 3 iconos servidos).
- Pendiente del usuario: probar "Instalar" en Chrome (localhost) y en el móvil
  por Tailscale (por LAN con IP no aparecerá la opción, es esperado).

## Fuera de alcance

- Service worker / modo offline.
- `screenshots`, `shortcuts` y `display_override` en el manifest.
- Botón de instalar propio en la UI (`beforeinstallprompt`).
- Empaquetado para stores (TWA/PWABuilder).

## Commits

1. `feat(brand): generate the opaque install icons`
2. `feat(frontend): make the app installable (manifest + icons)`
3. `test(packaging): smoke-test the manifest and install icons`
4. `docs(slice): add S54 progress and document the PWA setup`
5. `release: bump to v1.35.0 and add changelog entry`
