# S55 — El reinicio ya no abre una pestaña nueva

**Estado:** Completado
**Inicio:** 2026-10-08
**Fin:** 2026-10-08

## Descripción

Al pulsar "Reiniciar ahora" se recargaba la pestaña actual (esperado: lo hace el
panel cuando `/api/health` vuelve a responder) **y además** se abría una pestaña
nueva con la portada. Se corrige la regla de arranque: un reinicio no debe abrir
el navegador nunca.

## Causa

1. El lanzador define `RM_OPEN_BROWSER` al arrancar la app normalmente (es lo que
   hace que el servidor abra el navegador al estar listo).
2. Ese proceso lleva la variable en su entorno. `ProcessRestarter` clona el
   entorno del proceso actual y añade `RM_NO_BROWSER=1`, pero **no borraba**
   `RM_OPEN_BROWSER`.
3. El lanzador obedecía (`RM_NO_BROWSER` evita que la fije), pero la heredada
   llegaba igualmente al servidor nuevo, cuyo chequeo era `if
   (env.RM_OPEN_BROWSER)`.
4. Resultado: pestaña nueva (servidor nuevo) + recarga de la actual (panel).

## Decisiones

- **`RM_NO_BROWSER` manda sobre `RM_OPEN_BROWSER`**: nueva función pura
  `browserUrlToOpen(env)` en `open-browser.ts` (con tests, al estilo de
  `browserCommand`), usada por el arranque (`index.ts`). Como el guardia viaja en
  el bundle del servidor, **el primer reinicio tras actualizar ya sale limpio**
  aunque lo lance el restarter viejo.
- **Entorno limpio en el reinicio**: `ProcessRestarter` elimina
  `RM_OPEN_BROWSER` del entorno del proceso nuevo (higiene: nadie depende de que
  el guardia esté puesto).
- **No se toca el lanzador**: el servidor es la única fuente de verdad de "abrir
  el navegador", y así también cubre entornos heredados imprevistos.

## Criterios de aceptación

- [x] `browserUrlToOpen` cubre los cuatro casos (solo `RM_OPEN_BROWSER`,
      ambos, ninguno, vacío).
- [x] El restarter no reenvía `RM_OPEN_BROWSER` (test con `vi.stubEnv` simulando
      el entorno heredado).
- [x] Gates, tests, build, paquete y smoke en verde.
- [ ] Confirmación del usuario tras actualizar (primer reinicio limpio).

## Verificación

- Unitarios nuevos: `browserUrlToOpen` (4 casos) + restarter (entorno sin
  `RM_OPEN_BROWSER`) → backend **451** tests en verde.
- `pnpm check` 7/7, frontend 249, `pnpm build` ✓, `pnpm package:app` + smoke
  **PASS** (la app arranca y se sirve igual; el smoke corre con `RM_NO_BROWSER`).

## Commits

1. `fix(backend): keep the restart from opening a browser tab`
2. `fix(backend): stop forwarding the browser instruction on restart`
3. `docs(slice): add S55 progress`
4. `release: bump to v1.35.1 and add changelog entry`
