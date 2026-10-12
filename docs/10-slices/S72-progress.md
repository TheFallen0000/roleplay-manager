# S72 — Botón de rollback + instalación PWA

**Estado:** Completado
**Inicio:** 2026-10-12
**Fin:** 2026-10-12

## Descripción

Cierra dos pendientes anotados en el PM-backlog: la vuelta atrás desde el panel
de Actualizaciones (PM.25, diferida desde S43) y el botón propio de instalación
de la PWA (PM.26, diferido desde S54/S56). De paso corrige el tutorial de la
PWA, que decía que la app se podía instalar por la red doméstica cuando la
instalación exige HTTPS (solo la dirección de Tailscale sirve).

## Decisiones

### Rollback (PM.25)

- **Solo hacia atrás**: se ofrece la `versions/<v>` más alta que sea menor que
  la actual (comparación numérica). Volver a subir es el flujo normal de
  actualización: tras el rollback la app aparece otra vez «desactualizada», que
  es justo lo deseado.
- **Sin respaldo**: cambiar `current` no toca `data/`; no hay nada que
  respaldar. El cambio se aplica **al reiniciar**, igual que una actualización.
- **Sin job en segundo plano**: es un `writeFile` + `check()`; el adaptador git
  (desarrollo) no tiene carpetas versionadas → `rollbackTarget: null` y
  `rollback()` falla con un error claro, y el botón no aparece.
- UI: bloque en la tarjeta de versión («Volver a v1.44.0»), confirmación en
  diálogo y, tras aplicarlo, la misma guía de reinicio (extraída a un helper
  del panel para reutilizarla con el job de actualización).

### Instalación PWA (PM.26)

- **Captura temprana** del `beforeinstallprompt` en un script inline de
  `base.astro` (el evento puede dispararse antes de la hidratación) + hook
  genérico `use-install-prompt`. El estado solo se activa tras montar, así el
  SSR y el primer render del cliente coinciden (sin parpadeos).
- **Dos superficies**: bienvenida (botón a ancho completo) y menú «Teléfono»
  (ítem «Instalar la app»). En Android/Chrome dispara el diálogo nativo y, si
  se descarta, desaparece; en iOS (que nunca dispara el evento) enlaza al
  tutorial `?t=pwa-install`. Instalada (standalone) o sin nada que ofrecer: no
  se muestra.
- **Service worker passthrough** (`public/sw.js`, sin caché, con registro): es
  lo que Chrome Android necesita para conceder la instalación real (WebAPK) en
  lugar de un simple acceso directo. No hay modo offline ni assets cacheados.

### Corrección de los tutoriales (S71)

- El tutorial de la PWA pedía «la dirección compartida (Tailscale o red
  doméstica)»; ahora pide la de **Tailscale** y explica el porqué (HTTPS).
- El de red doméstica añade el aviso de que por ahí la app solo se usa en el
  navegador, y el de Tailscale explicita que con su dirección sí se instala.

## Criterios de aceptación

- [x] Rollback ofrecido cuando hay versión anterior, con confirmación,
      aplicado de verdad (`current`) y con guía de reinicio.
- [x] Rollback oculto en dev (git) y cuando no hay versión anterior.
- [x] Entrada de instalación en bienvenida y menú Teléfono: prompt nativo en
      Android, enlace al tutorial en iOS, oculta si ya está instalada.
- [x] Service worker servido y registrado; smoke ampliado con su comprobación.
- [x] Tutoriales corregidos (la instalación solo va por Tailscale).
- [x] Gates, tests, build, smoke y E2E; PR con CI verde y release v1.45.0.

## Verificación

- Backend **505** tests (+6: adaptador de releases ×3, adaptador git ×1, use
  case ×1, ruta ×1) y frontend **302** (+7: botón de instalación ×4 y panel de
  rollback ×3).
- `pnpm check` 7/7, smoke del paquete **PASS** (incluye `/sw.js`).
- **E2E con el paquete** (sembrando `versions/1.44.0`):
  - El panel ofrece «Volver a v1.44.0»; al confirmar aparece «La versión 1.44.0
    se aplicará al reiniciar» + botón de reinicio, y el archivo `current` queda
    en `1.44.0` (el lanzador arranca desde esa carpeta).
  - `/sw.js` servido; «Instalar la app» aparece en el menú Teléfono solo tras
    capturar el prompt sintético y lo dispara al pulsarlo; en escritorio sin
    prompt no se muestra.
  - iPhone (UA): el aviso de la bienvenida abre el tutorial de la PWA.
  - Capturas revisadas (panel con el bloque de rollback, bienvenida iOS y
    tutorial).

## Commits

1. `feat(updates): add the rollback endpoint and panel action`
2. `feat(frontend): add the PWA install entry points and service worker`
3. `fix(tutorials): installing the app requires the Tailscale address`
4. `docs(slice): add S72 progress and update the PM backlog`
5. `release: bump to v1.45.0 and add changelog entry`
