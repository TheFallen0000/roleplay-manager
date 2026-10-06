# S35 — Ajustes del diálogo y host de Tailscale (v1.25.2)

**Estado:** Completado
**Inicio:** 2026-10-06
**Fin:** 2026-10-06

## Descripción

Dos correcciones encontradas en la primera prueba real desde el teléfono:

1. **El diálogo «Teléfono» desbordaba por la derecha**: la fila de la URL
   (`code` + botón) imponía un ancho mínimo mayor que el contenido del diálogo,
   la columna del grid se ensanchaba y el resto del contenido (descripción,
   tarjeta del interruptor, botón) sangraba fuera del padding derecho.
2. **El servidor de desarrollo bloqueaba el hostname de Tailscale**: al abrir
   la app desde el teléfono aparecía `Blocked request. This host
   ("…ts.net") is not allowed` (chequeo de hosts de Vite).

## Decisiones

- **`min-w-0` en el contenedor del contenido** del diálogo: permite que la
  columna del grid se ajuste al ancho del diálogo y que la URL trunque con
  `truncate` en lugar de forzar el ancho. Verificado con una medición en
  navegador headless: `scrollWidth === clientWidth` y 16 px de separación en
  todos los lados (tarjeta, fila de URL y botón).
- **`server.allowedHosts: [".ts.net"]`** en `astro.config.mjs`: Astro lo pasa a
  Vite, que soporta el comodín de subdominios. Aplica a `astro dev`/`preview`
  (el servidor de producción standalone no hace ese chequeo). Verificado con
  `curl -H "Host: <equipo>.<tailnet>.ts.net"` → **200** (antes 403).
- **Reproducción y verificación con navegador headless** (Edge +
  `puppeteer-core` en la carpeta temporal): capturas del diálogo y mediciones
  reales de layout, sin tocar el tailnet ni los servidores del usuario.

## Criterios de aceptación

- [x] El diálogo ya no desborda: sin scroll horizontal y padding simétrico.
- [x] La URL trunca correctamente cuando no cabe.
- [x] El hostname de Tailscale responde 200 en el servidor de desarrollo.
- [x] `pnpm check` sin warnings; backend (381) y frontend (213) en verde.
- [x] `pnpm build` correcto.

## Commits

1. `fix(frontend): keep the phone dialog content inside its padding`
2. `fix(frontend): allow the Tailscale hostname in the dev server`
3. `docs(slice): add S35 progress`
4. `release: bump to v1.25.2 and add changelog entry`
