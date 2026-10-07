# S39 — Actualizaciones con adaptador git (PM.23, fase 1)

**Estado:** Completado
**Inicio:** 2026-10-07
**Fin:** 2026-10-07

## Descripción

La app ahora puede **detectar y aplicar actualizaciones** desde su propia
interfaz: una pantalla **Sistema → Actualizaciones**, un **badge** en el sidebar
cuando hay commits nuevos y un **aviso único** en la pantalla de personajes.
Aplicar crea un **respaldo automático**, hace `git pull --ff-only` + `pnpm
install` en segundo plano (con pasos consultables) y pide reiniciar la app.

## Decisiones

- **Adaptador git** (fase 1 de PM.23): `git fetch` + comparación de `HEAD` con
  `origin/<rama>`, lectura de la versión remota desde el `package.json` remoto y
  lista de los commits nuevos. Preflight: es un repo, rama correcta y **árbol
  limpio** (si hay cambios locales se bloquea con `UPDATE_DIRTY_WORKTREE`).
- **Aplicar en segundo plano**: el job expone `backup → pull → install → done`
  y el frontend lo consulta mientras corre (evita una petición de minutos
  colgada). `pnpm install` se ejecuta de forma multiplataforma a través de
  `npm_execpath` (evita el shim `.cmd` de Windows).
- **Respaldo**: *online backup* de SQLite (better-sqlite3) + copia de `data/` en
  `backups/<fecha>/`; automático antes de aplicar (con opción de desactivarlo) y
  también como acción manual.
- **UI**: pantalla con versiones, commits y estado del job; **badge** en el
  sidebar (`SidebarMenuBadge`, se oculta al colapsar); **aviso único por
  versión** en personajes (persistido en `localStorage`); store con **TTL de 1
  hora** y deduplicación de comprobaciones concurrentes.
- **Endurecimiento** (hallazgos del E2E): se tolera un **BOM** en el
  `package.json` (algunos editores lo añaden) y el job marca `done` **después**
  del chequeo final para que el estado quede fresco.
- **Fuera de alcance**: adaptador de releases (PM.24, carpeta portátil),
  auto-reinicio y `pnpm build` dentro del flujo.

## Criterios de aceptación

- [x] Detecta commits nuevos y versiones (actual y remota).
- [x] Bloquea aplicar con cambios locales y explica por qué.
- [x] Respaldo automático antes de aplicar y respaldo manual.
- [x] Aplica en segundo plano con pasos y queda al día.
- [x] Pantalla, badge en el sidebar y aviso único por versión.
- [x] `pnpm check` sin warnings; backend (417) y frontend (237) en verde.
- [x] `pnpm build` correcto.

## Verificación E2E (resumen)

Escenario **aislado** con un remoto git temporal y un clon (v1 → v2), sin tocar
el repo real: versión actual 1.0.0 y remota 2.0.0, commit nuevo listado, árbol
sucio bloqueado (409), respaldo con base de datos, aplicar con respaldo →
job `done` → estado al día → clon en 2.0.0 y respaldo propio creado.

## Commits

1. `feat(shared): add update status types and strings`
2. `feat(backend): add git-based update detection, apply and backups`
3. `feat(frontend): add the updates screen, sidebar badge and notice`
4. `test(updates): cover the git adapter, backup service, routes and UI`
5. `docs(slice): add S39 progress and update PM.23`
6. `release: bump to v1.27.0 and add changelog entry`
