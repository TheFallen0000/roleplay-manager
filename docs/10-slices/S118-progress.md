# S118 — Hotfix del paquete de actualización (v1.56.1)

**Estado:** Completado (hotfix)
**Inicio:** 2026-10-28
**Fin:** 2026-10-28

## Descripción

Al intentar actualizar de 1.55.0 a 1.56.0, el updater rechazaba el paquete
con:

> The downloaded package contains an unexpected path.

El archivo era válido y estaba firmado; el problema estaba en el **listado
del tar**.

### Causa

`scripts/package.mjs` creaba el archivo con:

```sh
tar -czf paquete.tar.gz -C stage .
```

Eso incluye una entrada `./versions/` (el directorio padre). El validador
`assertSafeArchive` solo acepta:

- `versions/<version>/…` (el árbol de la versión nueva),
- `current`, `version.json`, `README.txt`, `start.cmd` y `start.sh`.

La entrada `versions/` no encajaba y el update se abortaba antes de extraer.
El fallo afectaba a los paquetes de 1.55.0 y 1.56.0, pero se hizo visible al
probar el flujo completo.

### Arreglo

- El empaquetado lista las entradas explícitamente y sustituye `versions` por
  `versions/<version>`, tanto en Unix como en Windows. El tar ya no contiene
  el directorio padre.
- `assertSafeArchive` acepta también `versions` por compatibilidad con
  paquetes antiguos.
- Test del adaptador con un listado que incluye `./versions/`.

## Decisiones

- **Hotfix 1.56.1, no repack de 1.56.0**: el updater que falla es el de
  1.55.0 y ya está en la máquina del usuario. Un paquete nuevo con la entrada
  corregida se puede aplicar con ese mismo updater; republicar 1.56.0
  obligaría a reemplazar assets, checksums y firma.
- **Compatibilidad en el validador**: aceptar `versions/` no debilita la
  comprobación (sigue rechazando rutas absolutas, `..`, unidades de Windows y
  cualquier cosa fuera del árbol de la versión).
- **Sin cambios de UI**: el fallo era de empaquetado; el flujo de S117 ya
  muestra el error y permite reintentar.

## Criterios de aceptación

- [x] El tar nuevo no contiene la entrada `versions/`.
- [x] El listado nuevo pasa la lista blanca antigua (1.55.0).
- [x] El validador acepta `versions/` por compatibilidad.
- [x] Test del adaptador con la entrada antigua.
- [x] `pnpm check`, build y suites en verde.
- [x] `[Unreleased]` actualizado.

## Verificación

- Backend: **671** tests (114 archivos).
- Frontend: **351** tests (58 archivos).
- Paquete local `1.56.0-linux-x64`: entradas superiores `current`,
  `README.txt`, `start.sh`, `version.json`; sin `versions/`.
- Simulación de la lista blanca de 1.55.0 sobre el tar nuevo: **0 entradas
  inesperadas**.
- `pnpm check` y build en verde.

## Commits

1. `fix(packaging): drop the bare versions entry from the archive`
2. `docs(slice): document S118 update package hotfix`
