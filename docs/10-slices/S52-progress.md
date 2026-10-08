# S52 — Paquetes para Linux y macOS

**Estado:** Completado
**Inicio:** 2026-10-08
**Fin:** 2026-10-08

## Descripción

Hasta ahora solo se publicaba un paquete para Windows. Se generaliza el
empaquetado para producir el paquete de **la plataforma en la que se ejecuta** y
se publican cinco por release (`win-x64`, `linux-x64`, `linux-arm64`, `mac-arm64`,
`mac-x64`), cada uno construido y **probado en su propio SO** en CI. El
actualizador y el reinicio pasan a ser multiplataforma.

## Decisiones

- **`pnpm package:app`** (`scripts/package.mjs`, antes `package-windows.mjs`)
  detecta SO/arquitectura y genera `roleplay-manager-<v>-<os>-<arch>.<ext>`:
  - Windows: `.zip` (bsdtar) y lanzador `start.cmd`.
  - Linux/macOS: `.tar.gz` (preserva el bit de ejecución) y lanzador `start.sh`.
- **Runtime incluido**: se copia el `node` del equipo que empaqueta
  (`node.exe`/`node`, con permisos en unix). Los nativos se instalan en el SO de
  destino, así que **no hay compilación cruzada**: cada runner construye el suyo.
- **Lanzador unix** (`start.sh`, POSIX sh): lee `current`, fija puerto y rutas
  relativas a la raíz portátil, `RM_OPEN_BROWSER` cuando la app está lista y
  `exec` a node (Ctrl+C va directo al servidor).
- **README por plataforma**: mismo texto bilingüe con la nota de primera ejecución
  adecuada (SmartScreen / Gatekeeper con `xattr -dr com.apple.quarantine` /
  `chmod +x`).
- **Actualizador**: el asset se elige por `process.platform` + `arch`
  (`-win-x64.zip`, `-linux-arm64.tar.gz`, `-mac-arm64.tar.gz`, …), se extrae con
  `tar -x -f` (sirve para zip y tar.gz) y se refresca el lanzador de su plataforma
  (restaurando el bit de ejecución en unix).
- **Reinicio**: en unix relanza `sh start.sh` (mismo comportamiento que
  `cmd /c start.cmd` en Windows).
- **CI en matriz**: `prepare` → `gates` (una vez, ubuntu) → `build` en paralelo
  (`windows-latest`, `ubuntu-latest`, `ubuntu-24.04-arm`, `macos-latest`,
  `macos-26-intel`), cada uno con `pnpm package:app` + **smoke test nativo** +
  subida de artefacto → `publish` (descarga los cinco y crea la release).

## Criterios de aceptación

- [x] `pnpm package:app` produce el paquete correcto en Windows y en Linux.
- [x] El lanzador `start.sh` pasa `sh -n` y arranca la app con el runtime incluido.
- [x] El actualizador elige el asset de su plataforma y refresca su lanzador.
- [x] El reinicio funciona en las dos familias (cmd / sh).
- [x] El workflow construye y prueba los cinco paquetes y publica una release con
      todos los assets.
- [x] Gates: `pnpm check`, tests, build y smoke tests en verde.

## Verificación

- **Windows (local)**: `pnpm package:app` → `roleplay-manager-1.32.2-win-x64.zip` y
  smoke test **PASS** (arranca sin Node/pnpm del sistema, sirve la app, crea
  personaje y sube imagen).
- **Linux (WSL2 Ubuntu, verificación real)**: instalé Node 24 en WSL, copié el
  repo, `pnpm install`, `pnpm package:app` → `roleplay-manager-1.32.2-linux-x64.tar.gz`
  (60 MB) y smoke test **PASS**; `sh -n start.sh` **OK**.
- **macOS**: no hay forma de probarlo en local; lo valida el CI en `macos-latest`
  (arm64) y `macos-26-intel` (x64) con el smoke test nativo en cada release.
- Gates: `pnpm check` 7/7, backend y frontend en verde, `pnpm build` ✓.

## Commits

1. `feat(packaging): build the package for the current platform`
2. `feat(backend): make the updater and restart platform-aware`
3. `ci(release): build and smoke-test five packages in a matrix`
4. `docs(slice): add S52 progress and document the platform packages`
5. `release: bump to v1.33.0 and add changelog entry`
