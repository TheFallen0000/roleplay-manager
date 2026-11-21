# S136 — Review

**Estado:** PASS WITH NOTES
**Revisor:** slice-reviewer
**Fecha:** 2026-11-21
**Veredicto:** la primera pasada devolvió **BLOCKED** por un mayor, dos menores y
tres nits. Tras las correcciones, la re-review no encuentra bloqueantes ni
mayores; solo queda una nota aceptada (cobertura de backfill de la migración) y
los nits ya corregidos o documentados.

## Verificación

- `pnpm check`: 5/5.
- Backend: 171 archivos / 1139 tests.
- Frontend: 94 archivos / 506 tests.
- `pnpm --filter @workspace/backend eval`: 2 archivos / 52 tests.
- `pnpm build`: 4/4.
- `pnpm audit --prod`: limpio.
- `git diff --check`: limpio.
- Tests dirigidos de regresión de regenerate/continue y de la frontera `thread`
  en el umbral: verdes (`c19a7d9`).
- La eval mide el presupuesto con `resolveMemoryBudget` importado del servicio,
  no con una copia local.
- Los gates se ejecutaron sobre el commit final `d6858ff`.

## Hallazgos de la primera pasada

### MAJOR 1 — Regenerate/continue perdía la señal léxica (resuelto)

- **Ubicación:** `conversation-context-loader.service.ts` (construcción de
  `pendingMessage`).
- **Problema:** `regenerate` y `continue` no reciben `pendingMessages`. El
  loader construía `pendingMessage` solo desde ellos, así que quedaba vacío y
  el retrieval perdía `actorInPending` (+4) y los keywords (+1 cada uno). La
  misma conversación seleccionaba memorias distintas según si se enviaba o se
  regeneraba.
- **Resolución:** `5e881d8` cae al **último mensaje de usuario del historial
  cargado** cuando no hay mensaje pendiente. `d6858ff` convierte el recorrido en
  un escaneo perezoso: con mensaje pendiente no se recorre el historial.
  `c19a7d9` añade el test de regresión en
  `conversation-context-loader.service.test.ts`: la selección con el último
  mensaje de usuario coincide con la del pendiente equivalente.

### MINOR 1 — Asimetría del umbral: `thread >=` frente a `fact`/`episode` `>` (resuelto y documentado)

- **Ubicación:** `memory-retrieval.service.ts` (regla de elegibilidad).
- **Problema:** un `thread` con prioridad efectiva igual al umbral de
  decaimiento seguía siendo elegible, mientras que un `fact`/`episode` idéntico
  decaía. La asimetría no estaba explicada en el código.
- **Resolución:** se mantiene como **excepción deliberada** —un hilo abierto es
  una promesa pendiente, no un hecho durable— con comentario en el servicio y
  decisión registrada en `S136-progress.md` y `S136-test-plan.md` (`5928314`).
  `c19a7d9` cubre la frontera con un test: `thread` en el umbral entra;
  `fact`/`episode` en el mismo punto salen como `decay`.

### MINOR 2 — Cobertura de backfill en `migration-0021.test.ts` (aceptado como nota)

- **Ubicación:** `migration-0021.test.ts` (`treats pre-0021 inserts without type
  as fact`).
- **Problema:** el test inserta filas **después** de migrar y comprueba el
  `DEFAULT 'fact'`, no una base creada en 0020 con filas reales que luego
  migra. Cubre el default, no el `ALTER TABLE` aplicado a datos existentes.
- **Resolución:** se acepta como nota. La migración es aditiva y el `DEFAULT`
  de SQLite se aplica a las filas existentes al añadir la columna; el coste de
  montar una base pre-0021 con datos no compensa para este slice. Queda en
  `Deferred`.

### NIT 3 — Construcción de `selection` enrevesada (aclarado)

- **Ubicación:** `memory-retrieval.service.ts` (relleno de slots de la
  selección).
- **Problema:** el relleno de las entradas incluidas en sus posiciones
  originales, con un cursor `next`, no se entendía sin contexto.
- **Resolución:** se aclara el comentario (`5e881d8`): el manifiesto conserva
  una entrada por memoria, mientras que
  `memorySelection.filter(included)` sigue el orden del prompt. No se simplifica
  la construcción porque el orden es el que exige la eval.

### NIT 4 — Presupuesto reimplementado en la eval (resuelto)

- **Ubicación:** `memory-retrieval.eval.test.ts`.
- **Problema:** la eval recalculaba el presupuesto con
  `resolveEffectiveWindow` y constantes propias; un cambio en el servicio no se
  habría detectado.
- **Resolución:** `c19a7d9` importa `resolveMemoryBudget` del servicio y borra
  el helper local.

### NIT 5 — `generate-summary` con el filtro antiguo (diferido a S138)

- **Ubicación:** `generate-summary.use-case.ts`.
- **Problema:** la compactación sigue usando `filterMemoriesForPrompt`, así que
  el prompt de resumen ve todas las memorias elegibles y no la selección del
  retrieval.
- **Resolución:** se difiere a **S138 (políticas de contexto)**, que rediseña el
  presupuesto y puede necesitar un presupuesto propio para el resumen. No es una
  regresión de S136: el envío y el preview ya comparten el retrieval nuevo.

### NIT 6 — Escaneo del historial siempre activo (resuelto en la re-review)

- **Ubicación:** `conversation-context-loader.service.ts`.
- **Problema:** `[...messages].reverse().find(...)` se calculaba incluso cuando
  `pendingText` ya tenía contenido, con una copia innecesaria del array.
- **Resolución:** `d6858ff` usa un escaneo inverso perezoso; con mensaje
  pendiente no recorre el historial y el resultado es idéntico.

## Re-review

- Sin bloqueantes ni mayores.
- El mayor se cierra con código y test de regresión; el escaneo perezoso no
  cambia el resultado con mensaje pendiente.
- La asimetría de `thread` queda documentada y probada en la frontera.
- La eval deja de duplicar el presupuesto.
- Los gates de la sección de verificación se ejecutaron sobre `d6858ff`.

## Notas aceptadas

- **Backfill de la migración:** el test cubre el `DEFAULT`, no una fila
  pre-0021 real; ver `Deferred` en `S136-progress.md`.
- **Complejidad de `selection`:** se documenta el orden que necesita la eval en
  lugar de reescribir la construcción.

## Conclusión

La review no encontró problemas de arquitectura, seguridad o rendimiento. El
mayor de regenerate/continue y los menores y nits quedan resueltos o
documentados, y el slice mantiene `pnpm check`, los tests, la eval, el build y
el audit en verde.
