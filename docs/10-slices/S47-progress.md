# S47 — Arranque más amable (navegador y README)

**Estado:** Completado
**Inicio:** 2026-10-07
**Fin:** 2026-10-07

## Descripción

Dos detalles del paquete portátil:

1. El navegador se abría **antes** de lanzar el servidor, así que mostraba
   "no se puede acceder al sitio" hasta que el backend terminaba de arrancar.
   Ahora se abre **cuando la app ya está lista**.
2. El `README.txt` tenía palabras sin tildes (por precaución de codificación) y
   solo estaba en español. Ahora es **bilingüe** (inglés primero, español
   después) y usa tildes correctas.

## Decisiones

- **Navegador cuando está listo**: `start.cmd` ya no ejecuta `start "" <url>`;
  pasa `RM_OPEN_BROWSER=<url>` al servidor, y el backend abre el navegador en el
  callback de `app.listen` (el momento exacto en que responde). `RM_NO_BROWSER`
  sigue desactivándolo (lo usan el smoke test y los E2E).
- **Helper multiplataforma** (`infrastructure/config/open-browser.ts`): `start`
  vía `cmd.exe` en Windows, `open` en macOS, `xdg-open` en el resto. Es *best
  effort*: si falla, se registra un aviso y la app sigue.
- **README bilingüe** con encabezado que lo indica; **UTF-8 con BOM** para que
  Notepad y otros visores muestren bien las tildes. La consola se mantiene en
  ASCII (`cmd.exe` no siempre pinta UTF-8).
- `start.cmd` **no** lleva BOM (rompería `cmd.exe`).

## Criterios de aceptación

- [x] El lanzador no abre el navegador; el backend lo abre al quedar escuchando.
- [x] `RM_NO_BROWSER` sigue evitando que se abra (smoke test intacto).
- [x] El helper elige el comando correcto por plataforma y no lanza excepciones.
- [x] El `README.txt` del paquete es bilingüe, con tildes y BOM.
- [x] `pnpm check` y los tests en verde.

## Verificación

- Tests del helper (comando por plataforma + spawn detached/unref).
- Inspección del artefacto: `start.cmd` contiene `RM_OPEN_BROWSER` y ya **no**
  contiene `start "" http...`; `README.txt` empieza por el encabezado bilingüe y
  lleva BOM.
- Smoke test del zip con el runtime incluido: **PASS** (y sin abrir navegador).
- Gates: `pnpm check` 4/4, tests de backend y frontend, `pnpm build`.

## Commits

1. `feat(backend): open the browser when the server is listening`
2. `feat(packaging): bilingual README and open the browser when ready`
3. `test(backend): cover the browser opener helper`
4. `docs(slice): add S47 progress`
5. `release: bump to v1.31.4 and add changelog entry`
