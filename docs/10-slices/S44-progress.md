# S44 — Releases automáticas al subir la versión

**Estado:** Completado
**Inicio:** 2026-10-07
**Fin:** 2026-10-07

## Descripción

Antes había que crear y empujar un tag `v*` a mano para publicar. Ahora **basta
con subir un cambio de versión a `master`**: el workflow detecta que esa versión
todavía no tiene release y la construye y publica solo. Se mantiene el disparo por
tag (útil para republicar una versión concreta) y `workflow_dispatch` pasa a ser
un *dry run* con opción de publicar.

## Decisiones

- **Disparadores**: `push` a `master` limitado a cambios en `package.json`
  (`paths`) + `push` de tags `v*` + `workflow_dispatch`. Los pushes que no tocan
  la versión se ignoran (los filtros de ruta no se evalúan en tags, así que estos
  siguen funcionando).
- **Job `prepare`** (ubuntu, rápido): decide `run`/`publish`. Guardia tag↔versión
  en pushes de tag; consulta a la API si ya existe release para `v<versión>`; en
  manual respeta el input `publish`.
- **Idempotencia**: si la release ya existe, no se hace nada (`run=false`), así que
  re-ejecutar o volver a empujar la misma versión es inofensivo.
- **Un solo workflow**: con el `GITHUB_TOKEN` por defecto un workflow no puede
  disparar otro (prevención de recursión), por eso la publicación va en el mismo
  workflow y `gh release create` crea el tag cuando no existe (`--target` al commit
  empujado).
- **Sin puerta humana**: publicar es automático; si el pipeline falla, se puede
  re-ejecutar el job desde *Actions*.

## Criterios de aceptación

- [x] Un push a `master` que cambia la versión publica la release de esa versión.
- [x] Un push que no cambia la versión no lanza nada (job `prepare` corta).
- [x] Un tag `v*` que no coincide con `package.json` falla con error claro.
- [x] Re-ejecutar con la release ya creada no hace nada.
- [x] `workflow_dispatch` construye y valida sin publicar (salvo `publish`).
- [x] El YAML es válido y la lógica de decisión funciona (probada en local).

## Verificación

- Parseo del YAML con `js-yaml`.
- Lógica de `prepare` simulada en bash: tag correcto, tag incorrecto, release
  existente y versión nueva.
- Gates (`pnpm check`, tests, build) en verde.
- **En GitHub**: al empujar `master` con el bump a 1.31.1, el workflow publica la
  release **v1.31.1** sin intervención manual (comprobado con la API).

## Commits

1. `ci(release): publish on version bumps to master`
2. `release: bump to v1.31.1 and add changelog entry`
