# S41 — Empaquetado portátil Windows x64 (PM.24-B)

**Estado:** Completado
**Inicio:** 2026-10-07
**Fin:** 2026-10-07

## Descripción

`pnpm package:win` genera un **zip portátil para Windows x64** con su propio
runtime de Node: el usuario descomprime, ejecuta `start.cmd` y la app se abre en
el navegador, **sin instalar Node ni pnpm**. El proceso es único (fase A) y los
datos viven dentro de la carpeta portátil.

## Hallazgos y correcciones previas

- **El arranque de producción del backend nunca funcionó**: `tsc` emitía
  `dist/backend/src/...` (el script `start` apuntaba a `dist/index.js`), las
  **migraciones no se copiaban** y `@workspace/shared` apuntaba a fuentes TS.
- `pnpm deploy` requiere `inject-workspace-packages` en pnpm 11 → descartado.
- pnpm 11 **bloquea los scripts de dependencias** por seguridad: `better-sqlite3`
  necesita el suyo para el binario nativo → `allowBuilds` en el paquete.
- El SSR del frontend **externaliza más paquetes** de los previstos
  (`lucide-react`, `react-easy-crop`, `react-qr-code`, `zustand`, además de
  `react`/`react-dom`).

## Decisiones

- **Bundle del backend con esbuild** (`dist/server.mjs`): resuelve el problema de
  `@workspace/shared` y hace el arranque autocontenido. Nativos
  (`better-sqlite3`, `sharp`) y `pino-pretty` quedan externos; un banner añade
  `createRequire` para los `require` dinámicos de express/body-parser.
- **Migraciones**: nueva variable `MIGRATIONS_DIR` (por defecto, la ruta de
  siempre, así dev no cambia) y el paquete las incluye. Se eliminó el
  `tsconfig.build.json` en desuso.
- **Dependencias de runtime derivadas del build**: el script escanea los imports
  externos del SSR del frontend y les suma los nativos; no hay lista a mano.
- **`pnpm install --prod` con layout `hoisted`** (carpetas reales, sin symlinks)
  para que el zip funcione al descomprimirse en otra máquina.
- **Lanzador** (`start.cmd`): lee `current`, fija el puerto y las rutas de datos
  **relativas a la raíz portátil**, apunta `WEB_HANDLER_PATH`/`WEB_CLIENT_DIR`/
  `MIGRATIONS_DIR` al paquete, usa el **runtime incluido** y abre el navegador
  (salvo `RM_NO_BROWSER`, usado por las pruebas).
- **Zip** con `tar` (bsdtar de Windows) en `release/roleplay-manager-<versión>-win-x64.zip`
  (~165 MB descomprimido).

## Criterios de aceptación

- [x] `pnpm package:win` produce el zip con la estructura documentada.
- [x] El paquete arranca **sin Node/pnpm del sistema** (PATH mínimo).
- [x] Sirve la app (página y assets hasheados) y la API.
- [x] Crea personajes y sube imágenes.
- [x] Los datos (`data/roleplay.db`) quedan en la raíz portátil.
- [x] `pnpm check` sin warnings; backend (421) y frontend (238) en verde.
- [x] `pnpm build` correcto (bundle con esbuild).

## Verificación (smoke test del artefacto)

Zip extraído en una carpeta temporal y ejecutado con el runtime incluido y un
`PATH` que solo contiene `System32` (sin Node/pnpm accesibles): estructura
correcta, home 200, `/_astro/*.css` 200, personaje 201, subida 201 y base de
datos dentro de la carpeta portátil.

## Commits

1. `fix(backend): bundle the production server and ship migrations`
2. `feat(packaging): add the Windows portable package`
3. `docs(slice): add S41 progress and update PM.24`
4. `release: bump to v1.29.0 and add changelog entry`
