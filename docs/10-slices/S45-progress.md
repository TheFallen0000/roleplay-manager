# S45 — Arreglar el empaquetado en CI (bsdtar)

**Estado:** Completado
**Inicio:** 2026-10-07
**Fin:** 2026-10-07

## Descripción

La primera ejecución real del pipeline de releases (S44, en GitHub Actions) falló
en el paso `Package (Windows x64)`. Causa: el script invocaba `tar` desde el
`PATH`, y en el runner el **GNU tar de Git** va antes que bsdtar; GNU tar
interpreta `C:\...` como un **host remoto** y falla con
`Cannot connect to C: resolve failed`. Se corrige usando el **bsdtar de Windows
(`System32\tar.exe`)** de forma explícita, tanto al crear el zip como al
descomprimirlo en el smoke test.

## Decisiones

- **Resolver el binario de tar**: en Windows se usa
  `%SystemRoot%\System32\tar.exe` (libarchive/bsdtar, incluido en el sistema) si
  existe; en el resto de plataformas, `tar` del `PATH`. Así no depende de qué
  `tar` gane en el `PATH`.
- Se aplica en los dos sitios que empaquetan/descomprimen: `scripts/package-windows.mjs`
  (crear el zip) y `scripts/smoke-package.mjs` (extraerlo).
- Sin cambios de comportamiento en el artefacto: mismo formato de zip.

## Criterios de aceptación

- [x] Reproducido el fallo en local poniendo el GNU tar de Git primero en el `PATH`.
- [x] Con el `PATH` problemático, `pnpm package:win` genera el zip correctamente.
- [x] Con el `PATH` problemático, el smoke test del zip pasa.
- [x] Gates (`pnpm check`, tests, build) en verde.

## Verificación

- `PATH` = `C:\Program Files\Git\usr\bin;...` (GNU tar primero):
  `pnpm package:win` → **OK** (antes fallaba con exit 128) y
  `node scripts/smoke-package.mjs` → **PASS**.
- La release **v1.31.3** (primera publicada) se genera al empujar el bump a
  `master`; hizo falta además el arreglo de `npm_execpath` de **S46** para que el
  pipeline llegara hasta el final.

## Commits

1. `fix(packaging): use Windows bsdtar so CI can zip the artifact`
2. `release: bump to v1.31.2 and add changelog entry`
