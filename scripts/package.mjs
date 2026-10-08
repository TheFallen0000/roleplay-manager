#!/usr/bin/env node
/**
 * Packages the portable app for the platform it runs on:
 *   - Windows       -> roleplay-manager-<v>-win-<arch>.zip      (start.cmd)
 *   - Linux / macOS -> roleplay-manager-<v>-<os>-<arch>.tar.gz  (start.sh)
 *
 * Native modules (better-sqlite3, sharp) must be installed on the target OS, so
 * each release runs this script on its own runner (see the release workflow).
 */
import { spawnSync } from "node:child_process"
import {
  chmodSync,
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..")

const OS =
  process.platform === "win32"
    ? "win"
    : process.platform === "darwin"
      ? "mac"
      : "linux"
const ARCH = process.arch === "arm64" ? "arm64" : "x64"
const TARGET = `${OS}-${ARCH}`
const IS_WINDOWS = OS === "win"
const LAUNCHER = IS_WINDOWS ? "start.cmd" : "start.sh"
const NODE_BINARY = IS_WINDOWS ? "node.exe" : "node"
const ARCHIVE_EXT = IS_WINDOWS ? "zip" : "tar.gz"
const PATH_SEP = IS_WINDOWS ? "\\" : "/"

const run = (command, args, cwd) => {
  const result = spawnSync(command, args, {
    cwd,
    stdio: "inherit",
  })
  if (result.status !== 0) {
    throw new Error(
      `${command} ${args.join(" ")} failed with code ${result.status}`,
    )
  }
}

/** Quotes an argument with spaces before handing it to a shell. */
const quoteArg = (value) =>
  /[\s"]/.test(value) ? `"${value.replace(/"/g, '\\"')}"` : value

/**
 * Ways to run pnpm, in order of preference. `npm_execpath` (the pnpm that
 * launched this script) is used when it is a real, spawnable file; otherwise
 * pnpm is resolved from `PATH`. On CI runners `npm_execpath` can point to a
 * shim that cannot be spawned directly, which used to fail with `status: null`.
 */
const pnpmCandidates = (args) => {
  const candidates = []
  const execPath = process.env.npm_execpath
  if (execPath && existsSync(execPath)) {
    // `.cjs`/`.js` (node entry) or a compiled pnpm binary.
    const isScript = /\.(cjs|js|mjs)$/i.test(execPath)
    candidates.push(
      isScript
        ? { command: process.execPath, args: [execPath, ...args] }
        : { command: execPath, args },
    )
  }
  if (IS_WINDOWS) {
    candidates.push({
      command: process.env.ComSpec ?? "cmd.exe",
      args: ["/d", "/s", "/c", `pnpm ${args.map(quoteArg).join(" ")}`],
    })
  } else {
    candidates.push({ command: "pnpm", args })
  }
  return candidates
}

/** Runs pnpm, falling back to the one on `PATH` when needed. */
const runPnpm = (args, cwd) => {
  let lastError
  for (const candidate of pnpmCandidates(args)) {
    const result = spawnSync(candidate.command, candidate.args, {
      cwd,
      stdio: "inherit",
    })
    if (result.error) {
      lastError = result.error
      continue
    }
    if (result.status !== 0) {
      throw new Error(`pnpm ${args.join(" ")} failed with code ${result.status}`)
    }
    return
  }
  throw new Error(
    `Could not run pnpm ${args.join(" ")}: ${lastError?.message ?? "no candidate worked"}`,
  )
}

const readJson = (path) => JSON.parse(readFileSync(path, "utf8"))

/**
 * Windows ships libarchive's bsdtar in System32. Use it explicitly: if a GNU
 * tar (e.g. the one bundled with Git) comes first in PATH, `-a`/`-f C:\...`
 * fails because GNU tar reads the drive letter as a remote host.
 */
const tarBinary = () => {
  if (IS_WINDOWS) {
    const bundled = join(
      process.env.SystemRoot ?? "C:\\Windows",
      "System32",
      "tar.exe",
    )
    if (existsSync(bundled)) return bundled
  }
  return "tar"
}

/** Valid npm package name (filters false positives from minified code). */
const PACKAGE_NAME = /^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/i

/**
 * Bare imports left external in the built frontend server: those are the
 * packages the packaged app must provide in `node_modules`.
 */
const collectExternalPackages = (dir) => {
  const packages = new Set()
  const pattern = /(?:from|import)\s*\(?\s*["']([^"']+)["']/g

  const walk = (current) => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const full = join(current, entry.name)
      if (entry.isDirectory()) {
        walk(full)
        continue
      }
      if (!full.endsWith(".mjs")) continue

      const source = readFileSync(full, "utf8")
      let match
      while ((match = pattern.exec(source)) !== null) {
        const specifier = match[1]
        if (
          specifier.startsWith(".") ||
          specifier.startsWith("/") ||
          specifier.startsWith("node:") ||
          specifier.startsWith("data:") ||
          specifier.startsWith("http")
        ) {
          continue
        }
        const name = specifier.startsWith("@")
          ? specifier.split("/").slice(0, 2).join("/")
          : specifier.split("/")[0]
        if (!PACKAGE_NAME.test(name)) continue
        if (name.startsWith("@workspace/")) {
          throw new Error(
            `Workspace package externalized in the frontend build: ${name}`,
          )
        }
        packages.add(name)
      }
    }
  }

  walk(dir)
  return [...packages]
}

const resolveInstalledVersion = (name) => {
  const candidates = [
    join(repoRoot, "packages/frontend/node_modules", name),
    join(repoRoot, "packages/backend/node_modules", name),
    join(repoRoot, "packages/ui/node_modules", name),
    join(repoRoot, "node_modules", name),
  ]
  for (const candidate of candidates) {
    const packageJson = join(candidate, "package.json")
    if (existsSync(packageJson)) return readJson(packageJson).version
  }
  throw new Error(`Cannot find the installed version of ${name}`)
}

const gitCommit = () => {
  const result = spawnSync("git", ["rev-parse", "--short", "HEAD"], {
    cwd: repoRoot,
    encoding: "utf8",
  })
  return result.status === 0 ? result.stdout.trim() : "unknown"
}

/** Turns a GitHub URL (`https://github.com/owner/repo.git`) into `owner/repo`. */
const parseRepository = (url) => {
  if (!url) return undefined
  const match = url.match(/github\.com[/:]([^/]+)\/([^/]+?)(?:\.git)?$/)
  return match ? `${match[1]}/${match[2]}` : undefined
}

const dirSize = (dir) => {
  let bytes = 0
  const walk = (current) => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const full = join(current, entry.name)
      if (entry.isDirectory()) walk(full)
      else bytes += statSync(full).size
    }
  }
  walk(dir)
  return bytes
}

const formatBytes = (bytes) => `${(bytes / 1024 / 1024).toFixed(1)} MB`

const startCmd = `@echo off
setlocal
set "ROOT=%~dp0"
for /f "usebackq delims=" %%v in ("%ROOT%current") do set "VERSION=%%v"
set "APP=%ROOT%versions\\%VERSION%\\app"
set "NODE=%ROOT%versions\\%VERSION%\\runtime\\node.exe"
if not defined PORT set "PORT=3001"
if not defined HOST set "HOST=127.0.0.1"
if not defined LOG_LEVEL set "LOG_LEVEL=info"
set "NODE_ENV=production"
set "DATABASE_PATH=%ROOT%data\\roleplay.db"
set "DATA_DIR=%ROOT%data"
set "BACKUP_DIR=%ROOT%backups"
set "MIGRATIONS_DIR=%APP%\\migrations"
set "WEB_HANDLER_PATH=%APP%\\frontend\\server\\entry.mjs"
set "WEB_CLIENT_DIR=%APP%\\frontend\\client"
set "PUBLIC_API_URL=http://localhost:%PORT%"
set "TUNNEL_TARGET_URL=http://localhost:%PORT%"
set "RM_PACKAGED_ROOT=%ROOT%"

echo.
echo   Roleplay Manager %VERSION%
echo   http://localhost:%PORT%
echo   (Ctrl+C para detener)
echo.

if not defined RM_NO_BROWSER set "RM_OPEN_BROWSER=http://localhost:%PORT%"
"%NODE%" "%APP%\\server.mjs"
`.replace(/\n/g, "\r\n")

const startSh = `#!/bin/sh
# Roleplay Manager launcher: reads the "current" pointer and starts that version.
set -e
ROOT="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
VERSION="$(cat "$ROOT/current")"
APP="$ROOT/versions/$VERSION/app"
NODE="$ROOT/versions/$VERSION/runtime/node"

: "\${PORT:=3001}"
: "\${HOST:=127.0.0.1}"
: "\${LOG_LEVEL:=info}"
export PORT HOST LOG_LEVEL
export NODE_ENV=production
export DATABASE_PATH="$ROOT/data/roleplay.db"
export DATA_DIR="$ROOT/data"
export BACKUP_DIR="$ROOT/backups"
export MIGRATIONS_DIR="$APP/migrations"
export WEB_HANDLER_PATH="$APP/frontend/server/entry.mjs"
export WEB_CLIENT_DIR="$APP/frontend/client"
export PUBLIC_API_URL="http://localhost:$PORT"
export TUNNEL_TARGET_URL="http://localhost:$PORT"
export RM_PACKAGED_ROOT="$ROOT"
if [ -z "\${RM_NO_BROWSER:-}" ]; then
  export RM_OPEN_BROWSER="http://localhost:$PORT"
fi

echo
echo "  Roleplay Manager $VERSION"
echo "  http://localhost:$PORT"
echo "  (Ctrl+C para detener)"
echo

exec "$NODE" "$APP/server.mjs"
`

const firstRunEnglish =
  OS === "win"
    ? `If Windows shows a firewall prompt, allow access on private networks.
If "Windows protected your PC" appears, choose "More info" and "Run anyway"
(the executable is not signed).`
    : OS === "mac"
      ? `macOS may block the bundled runtime because it is not signed: open
System Settings > Privacy & Security and allow it, or run once:
  xattr -dr com.apple.quarantine .`
      : `If the launcher is not executable, run once:
  chmod +x start.sh`

const firstRunSpanish =
  OS === "win"
    ? `Si Windows muestra un aviso de firewall, permite el acceso en redes privadas.
Si aparece "Windows protegió tu PC", elige "Más información" y "Ejecutar de
todas formas" (el ejecutable no está firmado).`
    : OS === "mac"
      ? `macOS puede bloquear el runtime incluido porque no está firmado: abre
Ajustes del Sistema > Privacidad y seguridad y permítelo, o ejecuta una vez:
  xattr -dr com.apple.quarantine .`
      : `Si el lanzador no tiene permisos de ejecución, ejecuta una vez:
  chmod +x start.sh`

const readme = `Roleplay Manager — User manual / Manual de usuario
==================================================

This manual is available in two languages: English first, then Spanish.
Este manual está disponible en dos idiomas: primero inglés y después español.

English
=======

How to use
----------
1. Unzip this folder wherever you want to keep it (for example, Documents).
2. Run "${LAUNCHER}".
3. The browser opens at http://localhost:3001 once the app is ready.

You do not need to install Node or pnpm: the runtime is bundled.

Where your data lives
---------------------
- data${PATH_SEP}      database and images (your content)
- backups${PATH_SEP}   backups created before updating

Those two folders are yours: updates never touch them.

First run
---------
${firstRunEnglish}

Updates
-------
The app checks for new versions (System - Updates) and can install them by
itself: it downloads the new version into versions${PATH_SEP} and switches the
"current" pointer. Your data and backups are not touched. The previous version
is kept in case you want to go back. After updating, close and reopen the app.

Stopping the app
----------------
Press Ctrl+C in the terminal (or close its window).

Español
=======

Cómo usar
---------
1. Descomprime esta carpeta donde quieras conservarla (por ejemplo, Documentos).
2. Ejecuta "${LAUNCHER}".
3. El navegador se abre en http://localhost:3001 cuando la app está lista.

No necesitas instalar Node ni pnpm: el runtime va incluido.

Dónde se guardan tus datos
--------------------------
- data${PATH_SEP}      base de datos e imágenes (tu contenido)
- backups${PATH_SEP}   respaldos creados antes de actualizar

Esas dos carpetas son tuyas: las actualizaciones no las tocan.

Primera ejecución
-----------------
${firstRunSpanish}

Actualizaciones
---------------
La app comprueba si hay versiones nuevas (Sistema - Actualizaciones) y puede
instalarlas sola: descarga la versión nueva a versions${PATH_SEP} y cambia el
puntero "current". Tus datos y respaldos no se tocan. La versión anterior se
conserva por si quieres volver atrás. Después de actualizar, cierra y vuelve a
abrir la app.

Detener la app
--------------
Pulsa Ctrl+C en la terminal (o cierra su ventana).
`

const rootPackage = readJson(join(repoRoot, "package.json"))
const version = rootPackage.version
const repository = parseRepository(rootPackage.repository?.url)
const releaseDir = join(repoRoot, "release")
const archiveName = `roleplay-manager-${version}-${TARGET}.${ARCHIVE_EXT}`
const archivePath = join(releaseDir, archiveName)
const stage = join(tmpdir(), `rm-package-${version}`)
const versionDir = join(stage, "versions", version)
const appDir = join(versionDir, "app")
const runtimeDir = join(versionDir, "runtime")

console.log(`Packaging Roleplay Manager ${version} (${TARGET})`)

console.log("- Building the workspace...")
runPnpm(["build"], repoRoot)

console.log("- Preparing the stage...")
rmSync(stage, { recursive: true, force: true })
mkdirSync(appDir, { recursive: true })
mkdirSync(runtimeDir, { recursive: true })
mkdirSync(join(appDir, "frontend"), { recursive: true })

console.log("- Copying artifacts...")
copyFileSync(
  join(repoRoot, "packages/backend/dist/server.mjs"),
  join(appDir, "server.mjs"),
)
cpSync(
  join(repoRoot, "packages/backend/src/infrastructure/database/migrations"),
  join(appDir, "migrations"),
  { recursive: true },
)
cpSync(
  join(repoRoot, "packages/frontend/dist/client"),
  join(appDir, "frontend/client"),
  { recursive: true },
)
cpSync(
  join(repoRoot, "packages/frontend/dist/server"),
  join(appDir, "frontend/server"),
  { recursive: true },
)
copyFileSync(process.execPath, join(runtimeDir, NODE_BINARY))
if (!IS_WINDOWS) chmodSync(join(runtimeDir, NODE_BINARY), 0o755)

console.log("- Installing the runtime dependencies...")
const externalPackages = collectExternalPackages(
  join(repoRoot, "packages/frontend/dist/server"),
)
const dependencies = Object.fromEntries(
  [...externalPackages, "better-sqlite3", "sharp"]
    .sort()
    .map((name) => [name, resolveInstalledVersion(name)]),
)
console.log(`  ${Object.keys(dependencies).join(", ")}`)
writeFileSync(
  join(appDir, "package.json"),
  `${JSON.stringify(
    {
      name: "roleplay-manager-app",
      version,
      private: true,
      dependencies,
    },
    null,
    2,
  )}\n`,
)
// pnpm 11 blocks dependency build scripts unless they are explicitly allowed;
// `better-sqlite3` needs its install script for the native binary.
writeFileSync(
  join(appDir, "pnpm-workspace.yaml"),
  ["allowBuilds:", "  better-sqlite3: true", "  sharp: true", ""].join("\n"),
)
runPnpm(
  [
    "install",
    "--prod",
    // Hoisted layout: real folders instead of symlinks, so the archive works
    // when extracted on another machine (Windows symlinks need privileges).
    "--config.node-linker=hoisted",
    "--config.confirmModulesPurge=false",
    "--reporter=silent",
  ],
  appDir,
)

console.log("- Writing the launcher...")
writeFileSync(join(stage, "current"), version)
writeFileSync(
  join(stage, "version.json"),
  `${JSON.stringify(
    {
      version,
      commit: gitCommit(),
      builtAt: new Date().toISOString(),
      platform: TARGET,
      node: process.version,
      ...(repository ? { repository } : {}),
    },
    null,
    2,
  )}\n`,
)
writeFileSync(
  join(stage, LAUNCHER),
  IS_WINDOWS ? startCmd : startSh,
)
if (!IS_WINDOWS) chmodSync(join(stage, LAUNCHER), 0o755)
// UTF-8 with BOM so Windows editors render the accents correctly.
writeFileSync(join(stage, "README.txt"), `\uFEFF${readme}`)

console.log("- Archiving...")
mkdirSync(releaseDir, { recursive: true })
rmSync(archivePath, { force: true })
if (IS_WINDOWS) {
  run(tarBinary(), ["-a", "-c", "-f", archivePath, "-C", stage, "."])
} else {
  run("tar", ["-czf", archivePath, "-C", stage, "."])
}

const size = formatBytes(dirSize(stage))
rmSync(stage, { recursive: true, force: true })

console.log(`\nDone: ${archivePath}`)
console.log(`Unpacked size: ${size}`)
