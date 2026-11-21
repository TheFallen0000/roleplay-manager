# S135 — Review

**Estado:** PASS WITH NOTES
**Revisor:** slice-reviewer
**Fecha:** 2026-11-21
**Veredicto:** sin bloqueantes ni mayores; dos menores y cinco nits, todos
resueltos o documentados antes del cierre.

## Verificación

- `pnpm check:arch`: 7/7, 0 warnings.
- `pnpm --filter @workspace/backend typecheck`: limpio.
- `pnpm --filter @workspace/frontend typecheck`: 0 errores, 2 hints
  (`keyCode` del fallback IME y `document.execCommand`).
- Backend: 167 archivos / 1087 tests en el momento de la review; 1090 tras
  añadir los tests de locale y el caso de `rm` obsoleto.
- Frontend: 94 archivos / 495 tests.
- Tests dirigidos de ventana efectiva, reorden, mapper de cards, settings,
  rutas de tarjetas, `message-input` y `lorebook-editor`: verdes.
- `toSorted`/`toReversed`/`fetchPriority` compilan con `target: ESNext`; no
  quedan `[...x].reverse()`/`.sort()` en `packages/frontend/src`.
- `Accept-Language` llega a preview, import y update de cards; el fallback es
  `en`.
- El reorden rechaza ids ajenos sin mutar y duplicados, y acepta reórdenes
  parciales.
- La frontera `workingWindow + maxTokens === contextWindow` es inclusiva y
  compartida.

## Hallazgos

### MINOR 1 — El `rm` nulo resucitaba un valor borrado (resuelto)

- **Ubicación:** `sillytavern-card.mapper.ts` (`versionFieldsToCardData`,
  `withRmExtensions`).
- **Problema:** al omitir `subtitle`/`instructions` nulos, el `rm` crudo
  importado se conservaba y `withRmExtensions` lo mezclaba por encima; borrar
  el campo en el editor no se propagaba al export.
- **Resolución:** las claves conocidas de `rm` se eliminan del objeto crudo y
  se re-emiten desde los campos normalizados de la versión; las claves
  desconocidas se conservan. Test de regresión con un `rm` importado obsoleto.

### MINOR 2 — Código/mensaje del id ajeno (resuelto)

- **Ubicación:** `reorder-lorebook-entries.use-case.ts`.
- **Problema:** un id de otro libro devolvía `LOREBOOK_NOT_FOUND` (404) con
  «does not exist», aunque el problema es de pertenencia.
- **Resolución:** ahora devuelve `INVALID_LOREBOOK_ORDER` (400) con un mensaje
  de pertenencia. Test actualizado.

### NIT 3 — Predicado de ventana duplicado en import (resuelto)

- **Ubicación:** `import-character.use-case.ts`.
- **Resolución:** usa `isSafeWorkingWindow` en lugar de repetir la comparación.

### NIT 4 — Faltaban tests de locale a nivel de use case (resuelto)

- **Ubicación:** `import-sillytavern-card.use-case.test.ts` y
  `update-character-card.use-case.test.ts`.
- **Resolución:** ambos cubren `locale: "es"` y el fallback persistido.

### NIT 5 — El test IME no aislaba `isComposing` (resuelto)

- **Ubicación:** `message-input.test.tsx`.
- **Resolución:** un test usa solo `isComposing: true` y otro solo
  `keyCode: 229`, de modo que cada rama se prueba por separado.

### NIT 6 — El nombre accesible reutilizaba el placeholder (resuelto)

- **Ubicación:** `message-input.tsx`, i18n.
- **Resolución:** nueva clave `chat.inputLabel` («Message»/«Mensaje»).

### NIT 7 — CHANGELOG omitía preview (resuelto)

- **Ubicación:** `CHANGELOG.md`.
- **Resolución:** la entrada dice «preview, import and update».

## Conclusión

La review no encontró bloqueantes ni problemas de arquitectura, seguridad o
rendimiento. Los dos menores y los nits quedan corregidos con tests; el slice
mantiene `pnpm check`, tests, build y audit en verde.
