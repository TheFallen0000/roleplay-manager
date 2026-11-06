# S130 — Release audit

**Estado:** READY
**Auditor:** slice-release (read-only)
**Fecha:** 2026-11-06
**Rama:** `feat/s130-model-capabilities`
**Base:** `master` (`f981403`); HEAD de rama `ca3dc3a docs(slice): add S130 RFC`

## Contexto del árbol

- Sólo el RFC está commiteado en la rama (`git log --oneline master..HEAD` →
  `ca3dc3a`). La implementación, tests y docs viven **sin commitear**: 40 rutas
  en `git status --short` (22 tracked modificadas/borradas + 18 sin trackear).
- `git status` inicial no incluía `packages/website/src/data/release.json`; el
  build forzado de `packages/website` lo reescribió vía
  `scripts/fetch-release.mjs` (comportamiento documentado del build) y se
  restauró con `git checkout --` para dejar el árbol como se encontró. Ver
  «Observaciones».
- Versión raíz `1.57.2`, idéntica a `HEAD:package.json`. Sin tags en `HEAD`
  (último tag: `v1.57.2`).

## Comandos ejecutados y resultados

| Comando                                             | Resultado | Evidencia                                                       |
| --------------------------------------------------- | --------- | --------------------------------------------------------------- |
| `pnpm check`                                        | **PASS**  | `check:arch` 7/7, 0 fallos, 0 warnings; typecheck 5/5; lint 5/5 |
| `pnpm --filter @workspace/backend test`             | **PASS**  | `Test Files 128 passed (128)`, `Tests 778 passed (778)`, 4.42 s |
| `pnpm --filter @workspace/frontend exec vitest run` | **PASS**  | `Test Files 70 passed (70)`, `Tests 405 passed (405)`, 11.78 s  |
| `pnpm build`                                        | **PASS**  | `Tasks: 4 successful, 4 total`, exit 0                          |
| `pnpm audit --prod`                                 | **PASS**  | `No known vulnerabilities found`, exit 0                        |
| `git diff --check`                                  | **PASS**  | sin salida, exit 0 (`--cached` también limpio)                  |

Detalle:

- La primera pasada de `pnpm check` y `pnpm build` replayó caché de turbo
  (`FULL TURBO`). Para tener evidencia independiente se repitieron con
  `TURBO_FORCE=1`:
  - `TURBO_FORCE=1 pnpm check` → arch 7/7 fresco, typecheck
    `Cached: 0 cached, 5 total` → 5/5, lint `Cached: 0 cached, 5 total` → 5/5,
    exit 0.
  - `TURBO_FORCE=1 pnpm build` → `Cached: 0 cached, 4 total` → 4/4, exit 0.
- `astro check` del frontend: 151 archivos, 0 errores, 1 hint preexistente en
  `src/lib/clipboard.ts` (`document.execCommand` deprecado); no proviene de S130.
- `pnpm build` emite el warning preexistente `no output files found for task
@workspace/shared#build` (paquete sólo de tipos); no es un fallo.
- `pnpm audit --prod` se ejecutó antes del build forzado; no depende del árbol
  generado.

## Empaquetado y dry-run

**El dry-run de release NO es necesario y no se ha lanzado.**

- `packages/backend/package.json`: único cambio (`2 insertions, 1 deletion`) es
  añadir el script
  `"catalog:refresh": "node scripts/generate-model-catalog.mjs"`. Sin cambios en
  `dependencies`, `devDependencies`, `peerDependencies`, `engines`, `exports`,
  `files` ni `packageManager`.
- `pnpm-lock.yaml` y `pnpm-workspace.yaml`: sin modificar (no aparecen en
  `git status`).
- Sin cambios de módulos nativos: `better-sqlite3` y `sharp` intactos; la lista
  `external` de `packages/backend/build.mjs` no cambia.
- Sin cambios de empaquetado: `scripts/package.mjs`, workflows de CI/release y
  configuración de distribución no aparecen en el diff.
- Nota de tamaño (no es cambio de empaquetado): el catálogo curado generado
  (5 695 entradas, ~520 KB de TS) se importa desde el backend y esbuild lo
  inlinea en `dist/server.mjs` (4.2 MB). El artefacto crece, pero la
  configuración de empaquetado no cambia; comprobar arranque en la prueba manual.

## Versionado y CHANGELOG

- Sin bump de versión: `package.json` raíz sin modificar; `1.57.2` en `HEAD` y
  en el árbol. Ningún `package.json` de paquete cambia su `version`.
- Sin tag creado (`git tag --points-at HEAD` vacío) y sin artefactos de release
  (`dist/`, `.zip`, `.exe`, `.dmg`, `.AppImage`) en el diff.
- Las entradas de S130 están dentro de `## [Unreleased]` (línea 8), por encima
  de `## [1.57.2] - 2026-11-05` (línea 55), en `Added` / `Changed` / `Fixed`.
- El slice no toca export/import, ramas, plantillas ni migraciones de esquema
  (`packages/backend/src/infrastructure/database` sin cambios).

## Consistencia doc ↔ diff

Verificado contra el código real:

- `probeOnly` existe en `GetModelCapabilitiesUseCase` y la ruta
  `/model-context` lo pasa siempre; `provider.routes.test.ts` fija el contrato
  legacy (`{ id, model, contextWindow: null }` para OpenAI-compatible no
  detectable) y `probeOnly: true`.
- `GET /api/providers/:id/capabilities` acepta `model`, `instanceId`, `refresh`,
  `contextWindow` y `maxTokens`, y reenvía `conversationOverride`; el cliente
  `lib/api/providers.ts` sólo envía overrides numéricos positivos.
- `invalidateInstance` está cableado en los casos de uso de actualización y
  borrado de instancia y en `app-container`; hay tests de éxito, no encontrado y
  fallo del repositorio.
- `GetProviderModelContextUseCase` y su test fueron **eliminados** y sustituidos
  por `GetModelCapabilitiesUseCase`; el contrato de la ruta queda cubierto por
  `provider.routes.test.ts`.
- Extracción de UI respeta el límite de 500 líneas: `context-window-card.tsx`
  (125), `model-capabilities-suggestion.tsx` (123),
  `use-model-capabilities.ts` (119), `model-selector.tsx` (419).
- Los números de tests y checks de `S130-progress.md`, `S130-review.md` y
  `S130-pr-body.md` (128/778, 70/405, 7/7, 5/5, 4/4, audit limpio, diff limpio)
  coinciden con esta auditoría.
- Sin secretos en código nuevo: el catálogo, el resolvedor, el caché y los
  adaptadores no contienen API keys ni URLs con credenciales; los warnings de
  los sondeos sólo registran `model`, `status`/`message` e `id`/`instanceId`.

Nits de documentación (no bloquean):

- El PR body no menciona explícitamente la eliminación de
  `get-provider-model-context.use-case.ts` (el progreso sí describe la
  conversión del caso de uso).
- La sección histórica «Red tests» del progreso cita los tests de
  `get-provider-model-context` como baseline; después se eliminaron al sustituir
  el caso de uso.

## Riesgos y pendientes

1. **Prueba manual ejecutada; re-test pendiente tras la corrección.** El usuario
   probó Ollama/OpenAI-compatible, ventana manual y cambio de modelo, y detectó
   que «Aplicar detectado» no sobrescribía, «Detectar» no actuaba con valor
   manual y se aplicaba la ventana bruta. Corregido con tests de regresión
   (frontend 405 tests); falta repetir el flujo antes de publicar.
2. **Implementación sin commitear**: hay que crear los commits 2–10 del progreso
   antes de abrir el PR; `CI` (job **Checks**) debe estar en verde.
3. **NIT-3**: con ventana guardada, «Aplicar detectado» reaplica el mismo valor;
   para reemplazar una ventana obsoleta hay que usar «Detectar» (decisión de UX
   aceptada, recogida en Deferred).
4. **NIT-4**: el hook construye `conversationOverride` siempre; la capa de API
   filtra los nulos. Sin impacto funcional.
5. **Diferidos**: tokenizer real por proveedor, adopción de `workingWindow` en
   compactación/envío, models.dev como fuente alternativa, sondeo dedicado de
   llama.cpp `/props`, persistencia del caché/auto-refresco del catálogo y UI/API
   del override por instancia.
6. **Observación (preexistente, ajena a S130)**: el snapshot commiteado
   `packages/website/src/data/release.json` está en `v1.47.0` mientras el último
   release es `v1.57.2`; el build lo refresca desde la API de GitHub. No debe
   incluirse en este PR.
7. **Tamaño del bundle**: el catálogo inlinea ~520 KB de datos en
   `dist/server.mjs`; vigilar tiempo de arranque en la prueba manual.

## Checklist final del PR

- [x] `pnpm check` en verde (arch 7/7, typecheck 5/5, lint 5/5)
- [x] `pnpm --filter @workspace/backend test` en verde (128 archivos / 778 tests)
- [x] `pnpm --filter @workspace/frontend exec vitest run` en verde (70 / 405)
- [x] `pnpm build` en verde (4/4)
- [x] `pnpm audit --prod` sin vulnerabilidades
- [x] `git diff --check` limpio
- [x] Sin cambios de dependencias, lockfile, módulos nativos ni empaquetado →
      **dry-run de release no requerido**
- [x] CHANGELOG bajo `[Unreleased]`; sin bump de versión, tag ni assets
- [x] Doc de slice, review y PR body consistentes con el diff
- [x] Review independiente: **PASS WITH NOTES** (bloqueantes resueltos)
- [ ] Commits 2–10 creados sobre `feat/s130-model-capabilities`
- [x] Prueba manual ejecutada; bugs corregidos con tests de regresión
- [ ] Re-test manual tras la corrección
- [ ] `CI` / **Checks** en verde en el PR
- [ ] Aprobación humana para push/merge del PR del slice
