import { spawn, spawnSync } from "node:child_process"
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

/**
 * Smoke test for the packaged artifact: extracts it and runs it with the
 * bundled runtime and a stripped `PATH`, so it proves the app needs neither
 * Node nor pnpm on the machine.
 *
 * Usage: node scripts/smoke-package.mjs [path-to-zip]
 */
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const version = JSON.parse(
  readFileSync(join(repoRoot, "package.json"), "utf8"),
).version
const zip =
  process.argv[2] ??
  join(repoRoot, "release", `roleplay-manager-${version}-win-x64.zip`)
const port = Number(process.env.SMOKE_PORT ?? 3210)
const base = `http://127.0.0.1:${port}`

let failed = false
const check = (condition, message) => {
  console.log(`${condition ? "OK" : "FAIL"}: ${message}`)
  if (!condition) failed = true
}

const sleep = (ms) => new Promise((resolvePromise) => setTimeout(resolvePromise, ms))

if (!existsSync(zip)) {
  console.error(`Artifact not found: ${zip}`)
  process.exit(1)
}

const dir = mkdtempSync(join(tmpdir(), "rm-smoke-"))
const launcherOutput = []

try {
  const extract = spawnSync("tar", ["-x", "-f", zip, "-C", dir], {
    stdio: "inherit",
  })
  check(extract.status === 0, "artifact extracted")
  check(existsSync(join(dir, "start.cmd")), "start.cmd at the root")

  const pointer = readFileSync(join(dir, "current"), "utf8").trim()
  check(pointer.length > 0, `current pointer present (${pointer})`)
  const appDir = join(dir, "versions", pointer, "app")
  check(
    existsSync(join(dir, "versions", pointer, "runtime", "node.exe")),
    "bundled Node runtime present",
  )
  check(existsSync(join(appDir, "server.mjs")), "bundled backend present")
  check(
    existsSync(join(appDir, "frontend", "client")),
    "frontend client build present",
  )
  check(
    existsSync(join(appDir, "node_modules", "better-sqlite3")),
    "better-sqlite3 present",
  )

  const systemRoot = process.env.SystemRoot ?? "C:\\Windows"
  const launcher = spawn(join(systemRoot, "System32", "cmd.exe"), ["/c", "start.cmd"], {
    cwd: dir,
    env: {
      SystemRoot: systemRoot,
      // No Node/pnpm on PATH: the app must use its bundled runtime.
      PATH: join(systemRoot, "System32"),
      TEMP: tmpdir(),
      RM_NO_BROWSER: "1",
      PORT: String(port),
      LOG_LEVEL: "error",
    },
    stdio: ["ignore", "pipe", "pipe"],
  })
  launcher.stdout.on("data", (chunk) => launcherOutput.push(chunk.toString()))
  launcher.stderr.on("data", (chunk) => launcherOutput.push(chunk.toString()))

  try {
    let ready = false
    for (let attempt = 0; attempt < 120; attempt += 1) {
      try {
        const response = await fetch(`${base}/api/health`)
        if (response.ok) {
          ready = true
          break
        }
      } catch {
        // Not ready yet.
      }
      await sleep(500)
    }
    check(ready, "app started with the bundled runtime (no system Node/pnpm)")

    if (ready) {
      const home = await fetch(`${base}/`)
      const html = await home.text()
      check(
        home.status === 200 && html.includes("<html"),
        `home page (${home.status})`,
      )

      const assetPath = html.match(/\/_astro\/[^"']+\.(?:css|js)/)?.[0]
      if (assetPath) {
        const asset = await fetch(`${base}${assetPath}`)
        check(asset.status === 200, `hashed asset served (${assetPath})`)
      } else {
        check(false, "no hashed asset found in the home HTML")
      }

      const create = await fetch(`${base}/api/characters`, {
        method: "POST",
        headers: { "content-type": "application/json", origin: base },
        body: JSON.stringify({
          name: "Packaged App",
          description: "Creado desde el paquete",
          greeting: "Hola",
          cards: [],
        }),
      })
      const character = await create.json()
      check(create.status === 201, `character created (${create.status})`)

      const png = Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
        "base64",
      )
      const form = new FormData()
      form.append("file", new Blob([png], { type: "image/png" }), "pixel.png")
      const upload = await fetch(
        `${base}/api/characters/${character.id}/assets`,
        { method: "POST", headers: { origin: base }, body: form },
      )
      check(upload.status === 201, `image upload works (${upload.status})`)

      check(
        existsSync(join(dir, "data", "roleplay.db")),
        "data lives inside the portable folder",
      )
    }
  } finally {
    launcher.kill()
    await sleep(500)
    spawnSync("powershell", [
      "-NoProfile",
      "-Command",
      `Get-NetTCPConnection -LocalPort ${port} -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }`,
    ])
  }
} finally {
  rmSync(dir, { recursive: true, force: true })
}

console.log(failed ? "RESULT: FAIL" : "RESULT: PASS")
if (failed && launcherOutput.length > 0) {
  console.log("--- launcher output (tail) ---")
  console.log(launcherOutput.join("").split("\n").slice(-25).join("\n"))
}
process.exit(failed ? 1 : 0)
