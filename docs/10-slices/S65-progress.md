# S65 — El release no puede publicar dos veces la misma versión

**Estado:** Completado
**Inicio:** 2026-10-12
**Fin:** 2026-10-12

## Descripción

Al fusionar el PR #1 (S64) llegaron **dos eventos push del mismo commit** a
`master` (el merge y una operación de rama/settings posteriores). Ambos lanzaron
el workflow `Release` en paralelo: una corrida publicó v1.40.2 y la otra falló
al publicar con `a release with the same tag name already exists`. La release
quedó bien (con sus 5 assets), pero `master` acumuló un run rojo — se limpió
re-ejecutándolo (su `prepare` vio que la versión ya estaba publicada y no hizo
nada).

## Decisiones

- **Serializar las corridas del release** con
  `concurrency: { group: release, cancel-in-progress: false }`: la segunda
  corrida espera a que termine la primera y su `prepare` detecta que la versión
  ya está publicada y no hace nada. Se **encola** en vez de cancelar porque
  cancelar a mitad de publicación dejaría el release incompleto.
- **Grupo fijo** (`release`, sin `${{ github.ref }}`) para serializar también
  entre refs distintos (rama y tag).
- **Publicación idempotente**: el paso `Create the release` sale con
  `::notice` si el tag ya tiene release (`gh release view`), como segunda red de
  seguridad ante corridas que llegaran a solaparse (p. ej. un tag manual).

## Criterios de aceptación

- [x] Las corridas del release se serializan entre sí.
- [x] El paso de publicación es idempotente.
- [x] El PR de este slice pasa `Checks` y el merge publica v1.40.3 una sola vez.
- [x] El run rojo anterior quedó en verde tras re-ejecutarlo.

## Verificación

- `release.yml` y `ci.yml` parsean con un parser YAML real (js-yaml/yaml del
  store) y los bloques `concurrency` son los esperados.
- PR con `Checks` verde; merge por squash; una sola corrida del workflow
  `Release` con el job `Publish the GitHub Release` en verde; v1.40.3 con sus
  5 paquetes.

## Commits

1. `fix(ci): serialize release runs and make publishing idempotent`
2. `docs(slice): add S65 progress`
3. `release: bump to v1.40.3 and add changelog entry`
