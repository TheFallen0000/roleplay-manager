# S43 — Actualizador por releases (PM.24-D / PM.23 fase 2)

**Estado:** Completado
**Inicio:** 2026-10-07
**Fin:** 2026-10-07

## Descripción

La app **empaquetada** se actualiza sola desde las releases publicadas: consulta la
última release, compara la versión, descarga el paquete de su plataforma y lo
instala en `versions/<v>` cambiando el puntero `current`. Reutiliza toda la UI de
S39 (pantalla, badge y aviso); solo cambia el adaptador de detección/aplicación.
Con esto se completan **PM.24** y **PM.23**.

## Decisiones

- **Selección de adaptador**: el container usa `ReleaseUpdateAdapter` cuando
  `RM_PACKAGED_ROOT` está definido (lo fija `start.cmd`) y `GitUpdateAdapter` en
  dev/clon. El puerto `UpdateController` y la UI no cambian.
- **Detección**: API pública de GitHub (`/repos/<repo>/releases/latest`, sin
  auth). El repositorio sale de `RM_UPDATE_REPOSITORY` o de `repository` en
  `version.json` (el empaquetado lo escribe desde el `package.json` raíz).
  Comparación **numérica** de versiones: una release más antigua nunca se ofrece.
- **Instalación**: descarga a `versions/.download-<v>.zip` (con **progreso** en el
  job), extrae en `versions/.staging-<v>`, valida `app/server.mjs` y renombra a
  `versions/<v>` (mismo volumen, atómico); refresca `start.cmd`/`README.txt`/
  `version.json` y escribe `current`. **Nunca toca la versión en ejecución**, así
  que no hay archivos bloqueados y hace falta reiniciar.
- **Rollback**: la versión anterior se conserva en `versions/<antigua>`; volver
  atrás es reescribir `current` (botón en la UI **deferido**).
- **Asset por plataforma**: el que termina en `-win-x64.zip`; si falta, estado
  bloqueado `no-asset` (nuevo) y botón deshabilitado.
- **Notas de la release**: nuevo campo `notes` en `UpdateStatusDTO`; el panel lo
  muestra como texto preformateado (sin dependencia de Markdown).
- **Override de API** (`RM_UPDATE_API_URL`): permite espejos y, sobre todo, un
  **E2E aislado** con una API de GitHub falsa.

## Criterios de aceptación

- [x] El adaptador detecta versión nueva (con notas), al día, más antigua, sin
      asset y fallo de API.
- [x] Aplicar hace respaldo → descarga → instalación → `current` → reinicio, y
      deja la versión anterior para rollback.
- [x] El paquete marca `RM_PACKAGED_ROOT` y `version.json` incluye `repository`.
- [x] El panel muestra las notas, el progreso de descarga y el estado `no-asset`.
- [x] `pnpm check` sin warnings; backend y frontend en verde.
- [x] **E2E**: API falsa + zip falso → instalación real en una raíz portátil
      temporal, con respaldo y puntero verificados.

## Verificación

- Unitarios del adaptador (11) y del panel (nuevos casos de notas, descarga y
  `no-asset`).
- E2E aislado (`PASS`): `check` → notas → `apply` → job `done` → `versions/9.9.9`
  instalada, `current` = 9.9.9, respaldo creado, descarga limpiada, versión previa
  conservada y `behind` = false después.

## Commits

1. `feat(shared): add release update fields`
2. `feat(backend): add the release-based update adapter`
3. `feat(frontend): show release notes and download progress`
4. `feat(packaging): mark the package and bake the repository`
5. `test(updates): cover the release adapter and the panel`
6. `docs(slice): add S43 progress and complete PM.24`
7. `release: bump to v1.31.0 and add changelog entry`
