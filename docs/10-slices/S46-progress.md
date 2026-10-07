# S46 — Arreglar el empaquetado en CI (fallback de pnpm)

**Estado:** Completado
**Inicio:** 2026-10-07
**Fin:** 2026-10-07

## Descripción

Tras arreglar el `tar` (S45), la siguiente ejecución de CI falló aún en
`Package (Windows x64)`, esta vez en el primer paso:

```
Error: pnpm build failed with code null
    at runPnpm (scripts/package-windows.mjs:51)
```

`status: null` en `spawnSync` significa que el proceso **no se pudo lanzar**.
`runPnpm` usaba `process.env.npm_execpath` (el pnpm que lanzó el script) y en el
runner ese valor apunta a un *shim* que no se puede ejecutar directamente, así que
fallaba sin intentar nada más. Se añade un **fallback** al `pnpm` del `PATH`.

## Decisiones

- **Candidatos en orden**: primero `npm_execpath` (solo si el archivo existe; si es
  `.cjs`/`.js`/`.mjs` se lanza con `node`); si el spawn devuelve `error` (no
  lanzable), se usa el `pnpm` del `PATH` (`cmd.exe /d /s /c pnpm ...` en Windows,
  `pnpm` en el resto). Si ningún candidato funciona, el error indica la causa.
- **Sin `shell: true`**: el fallback usa `cmd.exe /c` explícito, así no aparece la
  deprecación de Node por pasar argumentos con `shell: true`.
- Se mantiene el uso del pnpm que lanzó el script cuando es válido (local).

## Criterios de aceptación

- [x] Reproducido el fallo en local con un `npm_execpath` inexistente
      (`pnpm build failed with code null`).
- [x] Con `npm_execpath` inválido, el empaquetado usa el `pnpm` del `PATH` y termina.
- [x] Combinado con el `tar` de CI (GNU tar primero), el empaquetado y el smoke
      test pasan.
- [x] Gates (`pnpm check`, tests, build) en verde.

## Verificación

- `npm_execpath` inexistente + GNU tar primero en el `PATH`:
  `node scripts/package-windows.mjs` → **OK** y
  `node scripts/smoke-package.mjs` → **PASS**.
- La release **v1.31.3** (primera publicada) se genera y publica
  automáticamente al empujar el bump a `master`.

## Commits

1. `fix(packaging): fall back to the pnpm on PATH when npm_execpath is unusable`
2. `release: bump to v1.31.3 and add changelog entry`
