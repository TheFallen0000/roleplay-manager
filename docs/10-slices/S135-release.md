# S135 — Release readiness

**Fecha:** 2026-11-21
**Veredicto:** READY para PR. **No** es una release: no hay bump de versión ni
publicación.

## Alcance

S135 es un slice de refinamiento. No toca `package.json`, `pnpm-lock.yaml`,
módulos nativos ni el pipeline de empaquetado, así que no requiere release
dry-run. La release batcheada se prepara después con `/release`.

## Checks

| Check | Resultado |
| ----- | --------- |
| `pnpm check:arch` | 7/7, 0 warnings |
| `pnpm check` (typecheck + lint) | 5/5 tareas |
| `pnpm --filter @workspace/backend test` | 167 archivos / 1090 tests |
| `pnpm --filter @workspace/frontend exec vitest run` | 94 archivos / 495 tests |
| `pnpm build` | 4/4 tareas |
| `pnpm audit --prod` | Sin vulnerabilidades |
| `drizzle-kit check` | `Everything's fine` |
| `legacy-scan` frontend/website | 0 hallazgos |
| `git diff --check` | Limpio |

## Empaquetado

- Sin cambios en `package.json`, lockfile, workflows de release, dependencias
  nativas ni `scripts/package.mjs`.
- Sin migraciones nuevas.
- Release dry-run: **no aplica**.

## Revisión

- `docs/10-slices/S135-review.md`: **PASS WITH NOTES**.
- Sin bloqueantes ni mayores. Los dos menores y los cinco nits están resueltos
  con tests.
- Revisión visual manual no realizada: los cambios de UI son progresivos y no
  alteran el layout.

## Riesgos y notas

- DB-3 (subconsultas por fila en `listSummaries` e índice parcial) y DB-4
  (planes de lorebooks) quedan diferidos con disparador en
  `S135-backend-audit.md`.
- Los PRs de Dependabot #147/#148 siguen fuera de este slice.
- El snapshot de la web (`packages/website/src/data/release.json`) queda en
  1.58.0; el próximo build de la web lo refresca si hay una release nueva.

## Estado final

S135 se integró en `master` mediante el PR #150 (`1b25946`) con squash y se
publicó en la release batcheada `v1.58.1` (PR #152, merge `b0ca4ec`). El CI de
`master`, el workflow de release y el deploy de la website están en verde.

Assets verificados: cinco paquetes, `SHA256SUMS` y `SHA256SUMS.sig`; checksum y
firma Ed25519 correctos; smoke test del paquete Linux x64 PASS; `v1.58.1`
visible en `/download` y `/es/download`.
