# S42 — CI de releases y contrato del artefacto (PM.24-C)

**Estado:** Completado
**Inicio:** 2026-10-07
**Fin:** 2026-10-07

## Descripción

Al empujar un tag `v*` (que coincida con la versión de `package.json`), GitHub
Actions construye el paquete portátil, lo **valida** y publica una **GitHub
Release** con el zip y las notas del CHANGELOG. También se puede lanzar a mano
(`workflow_dispatch`) como **dry run** (construye y valida sin publicar).

## Decisiones

- **Workflow** `.github/workflows/release.yml` en `windows-latest`, con Node
  **24.18.0** fijado (la misma versión que se incluye en el paquete) y pnpm desde
  `packageManager`, instalando con `--frozen-lockfile`.
- **Guardia de versión**: el tag debe coincidir con `package.json`; si no, el
  workflow falla antes de publicar nada.
- **Red de seguridad**: `pnpm check` + tests de backend y frontend antes de
  empaquetar.
- **Validación del artefacto**: `pnpm package:win` → `smoke-package.mjs`; solo si
  pasa se publica.
- **Publicación**: `gh release create "v<versión>" release/*.zip` con las notas
  extraídas del CHANGELOG (`release-notes.mjs`) y `contents: write`.
- **Scripts reutilizables**: el smoke test (antes temporal) pasa a
  `scripts/smoke-package.mjs` y las notas a `scripts/release-notes.mjs`; ambos se
  pueden ejecutar en local.
- **Contrato del artefacto** (lo consumirá la fase D): tag `v<versión>`, asset
  `roleplay-manager-<versión>-win-x64.zip` y notas del CHANGELOG.

## Criterios de aceptación

- [x] `scripts/smoke-package.mjs` valida el zip (estructura, runtime incluido con
      `PATH` mínimo, app, API, assets, personaje y subida).
- [x] `scripts/release-notes.mjs <versión>` extrae la sección del CHANGELOG y
      falla con un mensaje claro si no existe.
- [x] La guardia tag↔versión acepta coincidencias y detecta discrepancias.
- [x] El YAML del workflow es válido.
- [x] `pnpm check` sin warnings; backend (421) y frontend (238) en verde.
- [x] `pnpm build` correcto.

## Verificación

En local: notas del CHANGELOG de 1.29.0 (y fallo controlado con 9.9.9), guardia
de versión (coincidencia y discrepancia), parseo del YAML y smoke test del
artefacto (PASS). El workflow en sí se prueba empujando un tag (pestaña
*Actions*), que queda en manos del usuario.

## Commits

1. `feat(release): add the package smoke test and release notes scripts`
2. `ci(release): publish the portable package on version tags`
3. `docs(slice): add S42 progress and the release contract`
4. `release: bump to v1.30.0 and add changelog entry`
