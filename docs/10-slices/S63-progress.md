# S63 — Mantenimiento del pipeline de release

**Estado:** Completado
**Inicio:** 2026-10-09
**Fin:** 2026-10-09

## Descripción

Elimina los avisos que aparecieron en el release de v1.40.0 y evita que
vuelvan: las acciones del workflow pasan a sus versiones sobre **Node 24**
(las que GitHub estaba forzando por la deprecación de Node 20), los runners
se fijan a **etiquetas explícitas** — Ubuntu 26.04 incluida la variante arm64,
migración adelantada a propósito — y **Dependabot** abre una PR semanal para
que las acciones no envejezcan otra vez. Se entrega como patch **v1.40.1**,
cuyo push ejecuta el pipeline completo con los actions nuevos: esa es la
verificación end-to-end.

## Decisiones

- **Versiones elegidas** (runtimes `node24` confirmados en el `action.yml` de
  cada tag): `actions/checkout@v7`, `actions/setup-node@v7`,
  `actions/upload-artifact@v7`, `actions/download-artifact@v8` y
  `pnpm/action-setup@v6`. Los cambios «breaking» de las nuevas majors no
  afectan a este workflow (no usa `pull_request_target`, ni publica en npm,
  ni sube un solo fichero directo).
- **Ubuntu 26.04 ya, con pin explícito**: el issue oficial de
  `actions/runner-images` (14748) confirma que `ubuntu-26.04` y
  `ubuntu-26.04-arm` son GA y que `ubuntu-latest` migrará a lo largo de
  octubre-noviembre. Se migra ahora para no depender de la migración
  automática; si algo rompiera, la mitigación documentada es volver a
  `ubuntu-24.04`.
- **Todos los runners quedan fijados** (no solo Ubuntu): `windows-2025` y
  `macos-26` son los destinos actuales de sus `-latest` (verificados en la
  tabla oficial), así que hoy no cambia nada y mañana una migración de
  etiqueta no puede cambiar el sistema de compilación de un release sin
  querer.
- **Riesgo glibc anotado** (y aceptado): `better-sqlite3` y `sharp` se
  instalan en el runner, pero ambos resuelven a **binarios precompilados de
  upstream**; el paquete además se valida con el smoke test dentro del
  propio pipeline antes de publicarse.
- **Dependabot agrupado**: una PR semanal con todas las acciones, commits con
  prefijo `chore(ci)`, para que la actualización sea rutina y no un aviso de
  deprecación.
- **Nota de macOS arm64** («colas más largas»): es informativa del lado de
  GitHub; no hay acción posible en el repo.

## Criterios de aceptación

- [x] Acciones actualizadas a sus runtimes Node 24 (adiós a los avisos de
      deprecación de Node 20).
- [x] Runners fijados a etiquetas explícitas; Ubuntu migrado a 26.04
      (x64 y arm64).
- [x] Dependabot semanal para `github-actions`.
- [x] YAML válido y `pnpm check` verde.
- [ ] Push de v1.40.1 con el pipeline verde y release publicado: el run es la
      verificación real (se dispara solo con el bump).

## Verificación

- Versiones y runtimes comprobados contra el `action.yml` publicado de cada
  tag nuevo (los cinco corren sobre `node24`).
- Etiquetas `ubuntu-26.04` / `ubuntu-26.04-arm` confirmadas como GA en la
  tabla oficial de `actions/runner-images`.
- Ambos YAML parseados con `js-yaml`; `pnpm check` verde (7/7).
- El push de la versión ejercita `prepare → gates → build (×5) → publish` con
  los actions y runners nuevos; si algo falla, los labels se revierten de
  forma inmediata.

## Commits

1. `chore(ci): upgrade actions to Node 24 runtimes and pin runner images`
2. `chore(ci): add weekly Dependabot updates for workflow actions`
3. `docs(slice): add S63 progress`
4. `release: bump to v1.40.1 and add changelog entry`
