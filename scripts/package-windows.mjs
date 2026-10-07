import { spawnSync } from "node:child_process"
import {
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
  if (process.platform === "win32") {
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
  if (process.platform === "win32") {
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

const readme = `Roleplay Manager — User manual / Manual de usuario
==================================================

This manual is available in two languages: English first, then Spanish.
Este manual está disponible en dos idiomas: primero inglés y después español.

English
=======

How to use
----------
1. Unzip this folder wherever you want to keep it (for example, Documents).
2. Double-click "start.cmd".
3. The browser opens at http://localhost:3001 once the app is ready.

You do not need to install Node or pnpm: the runtime is bundled.

Where your data lives
---------------------
- data\\      database and images (your content)
- backups\\   backups created before updating

Those two folders are yours: updates never touch them.

First run
---------
If Windows shows a firewall prompt, allow access on private networks.
If "Windows protected your PC" appears, choose "More info" and "Run anyway"
(the executable is not signed).

Updates
-------
The app checks for new versions (System - Updates) and can install them by
itself: it downloads the new version into versions\\ and switches the "current"
pointer. Your data and backups are not touched. The previous version is kept in
case you want to go back. After updating, close and reopen the app.

Stopping the app
----------------
Close the console window or press Ctrl+C.

Español
=======

Cómo usar
---------
1. Descomprime esta carpeta donde quieras conservarla (por ejemplo, Documentos).
2. Haz doble clic en "start.cmd".
3. El navegador se abre en http://localhost:3001 cuando la app está lista.

No necesitas instalar Node ni pnpm: el runtime va incluido.

Dónde se guardan tus datos
--------------------------
- data\\      base de datos e imágenes (tu contenido)
- backups\\   respaldos creados antes de actualizar

Esas dos carpetas son tuyas: las actualizaciones no las tocan.

Primera ejecución
-----------------
Si Windows muestra un aviso de firewall, permite el acceso en redes privadas.
Si aparece "Windows protegió tu PC", elige "Más información" y "Ejecutar de
todas formas" (el ejecutable no está firmado).

Actualizaciones
---------------
La app comprueba si hay versiones nuevas (Sistema - Actualizaciones) y puede
instalarlas sola: descarga la versión nueva a versions\\ y cambia el puntero
"current". Tus datos y respaldos no se tocan. La versión anterior se conserva
por si quieres volver atrás. Después de actualizar, cierra y vuelve a abrir la
app.

Detener la app
--------------
Cierra la ventana de la consola o pulsa Ctrl+C.
`

const version = readJson(join(repoRoot, "package.json")).version
const repository = parseRepository(
  readJson(join(repoRoot, "package.json")).repository?.url,
)
const platform = "win-x64"
const releaseDir = join(repoRoot, "release")
const zipName = `roleplay-manager-${version}-${platform}.zip`
const zipPath = join(releaseDir, zipName)
const stage = join(tmpdir(), `rm-package-${version}`)
const versionDir = join(stage, "versions", version)
const appDir = join(versionDir, "app")
const runtimeDir = join(versionDir, "runtime")

console.log(`Packaging Roleplay Manager ${version} (${platform})`)

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
  join(
    repoRoot,
    "packages/backend/src/infrastructure/database/migrations",
  ),
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
copyFileSync(process.execPath, join(runtimeDir, "node.exe"))

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
    // Hoisted layout: real folders instead of symlinks, so the zip works when
    // extracted on another machine (Windows symlinks need privileges).
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
      platform,
      node: process.version,
      ...(repository ? { repository } : {}),
    },
    null,
    2,
  )}\n`,
)
writeFileSync(join(stage, "start.cmd"), startCmd)
// UTF-8 with BOM so Windows editors render the accents correctly.
writeFileSync(join(stage, "README.txt"), `\uFEFF${readme}`)

console.log("- Zipping...")
mkdirSync(releaseDir, { recursive: true })
rmSync(zipPath, { force: true })
run(tarBinary(), ["-a", "-c", "-f", zipPath, "-C", stage, "."])

const size = formatBytes(dirSize(stage))
rmSync(stage, { recursive: true, force: true })

console.log(`\nDone: ${zipPath}`)
console.log(`Unpacked size: ${size}`)
