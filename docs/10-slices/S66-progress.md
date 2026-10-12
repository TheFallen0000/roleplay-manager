# S66 — El .zip de la release vuelve a abrirse con el extractor de Windows

**Estado:** Completado
**Inicio:** 2026-10-12
**Fin:** 2026-10-12

## Descripción

El paquete de Windows se creaba con bsdtar archivando `.`, lo que produce
entradas con prefijo `./` (`./current`, `./README.txt`, …). El extractor
integrado de Windows descarta esas entradas: Explorer mostraba el zip vacío /
«no válido» y solo 7-Zip o `tar` podían descomprimirlo. Reproducido en local con
`Shell.Application` (0 items) y confirmado con un A/B (`.` vs nombres explícitos
→ 0 vs 5 items).

## Decisiones

- **Listar las entradas de primer nivel** (`readdirSync(stage)`) al crear el zip
  en `scripts/package.mjs` en vez de archivar `.`: los nombres quedan limpios
  (`current`, `versions/…`) y Windows los ve. El `tar.gz` de unix no se toca
  (`./` es válido y universal allí).
- **Check anti-regresión en el smoke test**: en Windows, el artefacto se lista
  con `tar -tf` y se exige que ninguna entrada empiece por `./` y que `current`
  esté en la raíz. Es un invariante determinista (no depende de COM/Explorer).
- **Re-subida del asset de v1.40.3** con el zip corregido (mismo contenido de
  app), borrando el anterior y anotándolo en las notas de la release, para que
  quien descargue esa versión ya pueda descomprimirla.
- La verificación de compatibilidad real usa `Shell.Application` (el mismo
  componente del extractor de Explorer del sistema).

## Criterios de aceptación

- [x] El zip generado no tiene entradas `./` y Windows lo lista (5 items).
- [x] Smoke test con los checks nuevos en verde.
- [x] Asset de v1.40.3 reemplazado (mismo `sha256` que el local) + nota en las
      release notes.
- [x] Slice con PR, CI verde y release v1.40.4 con el fix.

## Verificación

- Local: `Shell.Application` lista 5 items (antes 0); smoke test **PASS**
  (incluye `zip entries have no './' prefix`).
- CI: el job `Package win-x64` corre el smoke test actualizado sobre el
  artefacto nuevo.
- El asset subido coincide en `sha256` con el archivo verificado en local.

## Commits

1. `fix(packaging): give the Windows zip clean entry names`
2. `test(packaging): fail the smoke test on './'-prefixed zip entries`
3. `docs(slice): add S66 progress`
4. `release: bump to v1.40.4 and add changelog entry`
