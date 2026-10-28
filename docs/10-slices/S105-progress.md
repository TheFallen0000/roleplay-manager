# S105 — Dependency, security and performance guardrails

**Estado:** Completado (pendiente de release batched)
**Inicio:** 2026-10-28
**Fin:** 2026-10-28

## Descripción

Consolida en `AGENTS.md` las lecciones de las últimas slices y del barrido de
seguridad/rendimiento, y añade una comprobación de seguridad al CI:

- Nueva sección **`## 11. Dependency, security and performance guardrails`**.
- `pnpm audit --prod` como paso obligatorio del workflow `CI`.
- Regla explícita de que varios slices pueden acumularse en `[Unreleased]`
  antes de una única release.
- Aclaración de la inmutabilidad de entidades (`getX()` + `withX()`, sin setters
  mutables).

No hay cambios de runtime.

## Decisiones

- **Audit de producción, no de desarrollo:** `pnpm audit --prod` debe fallar el
  CI; `pnpm audit` completo incluye `shadcn` y su toolchain (60 hallazgos
  dev-only) y no representa el artefacto que se distribuye.
- **Dependabot:** patch/minor agrupados; majors individuales y con slice propio.
- **Dry-run de release:** se documenta el comando y las cinco plataformas para
  cambios de módulos nativos, empaquetado o lockfile.
- **Seguridad:** se fijan las invariantes de CSRF/errores de API (S102), API
  keys, firmas de release y privacidad de `data/`, `backups/` y logs.
- **Rendimiento:** se documentan las reglas de selectores/memoización,
  paginación, N+1, backups y chunks grandes.
- **Batched releases:** un solo `chore(release)` al final del bloque, en lugar
  de una release por slice.
- **Fuera de alcance:** aplicar los cambios de rendimiento de S103/S104; este
  slice solo deja las reglas escritas.

## Criterios de aceptación

- [x] `AGENTS.md` incluye la sección de guardrails.
- [x] La regla de releases batched queda explícita.
- [x] La inmutabilidad de entidades queda aclarada.
- [x] `pnpm audit --prod` se ejecuta en CI.
- [x] `pnpm check` y el CI siguen verdes.
- [x] `CHANGELOG.md` actualizado en `[Unreleased]`.

## Verificación

- `pnpm check`: arquitectura 7/7, typecheck y lint verdes.
- `pnpm audit --prod`: **0 vulnerabilidades**.
- Sin cambios de código de runtime; el paquete y los tests no cambian.
- CI: el nuevo paso de audit se ejecutará en el PR.

## Commits

1. `5a45b38 docs(agents): add dependency, security and performance guardrails`
2. `c92dfda ci: audit production dependencies`
3. `docs(slice): document S105 guardrails` (this commit)
