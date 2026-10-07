# S48 — Arreglar la apertura del navegador en Windows

**Estado:** Completado
**Inicio:** 2026-10-07
**Fin:** 2026-10-07

## Descripción

Al ejecutar `start.cmd`, Windows mostraba el diálogo *"Windows no encuentra el
archivo ..."* y el navegador no se abría (la app sí funcionaba si se entraba a
mano). El helper de S47 lanzaba `cmd.exe /d /s /c start "" "<url>"` pasando el
comando como **un solo argumento**: Node escapa las comillas internas con `\`
(`start \"\" \"http://...\"`) y `cmd.exe` **no** entiende ese escape, así que
`start` recibía un argumento roto y buscaba un archivo inexistente.

## Decisiones

- **Pasar los argumentos verbatim**: `windowsVerbatimArguments: true` en el
  `spawn` de Windows. Así la línea de comandos llega a `cmd.exe` tal cual
  (`start "" "http://localhost:3001"`) y `start` la interpreta bien.
- El flag vive en `BrowserCommand` (`windowsVerbatimArguments`), que sigue siendo
  una función pura testeable; `openBrowser` lo reenvía al `spawn`.
- macOS (`open`) y Linux (`xdg-open`) no cambian: no usan `cmd.exe`.

## Criterios de aceptación

- [x] Reproducido el fallo: con el código anterior, `cmd` recibe `\"\" \"url\"`.
- [x] Con `windowsVerbatimArguments`, `cmd` recibe `"" "url"`.
- [x] Con las opciones exactas del helper (detached + stdio ignore + verbatim),
      un `start` real ejecuta el comando (verificado con un payload inofensivo).
- [x] Tests y gates en verde.

## Verificación

- Diagnóstico de quoting (`echo`): actual → `\"\" \"url\"`; verbatim → `"" "url"`.
- `start "" /b /wait cmd /c md "<carpeta>"` con las opciones del helper → la
  carpeta se crea (el comando se ejecuta correctamente).
- Tests del helper (4) y `pnpm check` 4/4; backend 436.

## Commits

1. `fix(backend): pass browser-open args verbatim to cmd on Windows`
2. `test(backend): assert the verbatim flag on Windows`
3. `docs(slice): add S48 progress`
4. `release: bump to v1.31.5 and add changelog entry`
