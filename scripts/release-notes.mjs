import { readFileSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

/**
 * Prints the CHANGELOG section of a version (used as GitHub Release notes).
 *
 * Usage: node scripts/release-notes.mjs <version>
 */
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const version = process.argv[2]

if (!version) {
  console.error("Usage: node scripts/release-notes.mjs <version>")
  process.exit(1)
}

const lines = readFileSync(join(repoRoot, "CHANGELOG.md"), "utf8").split(/\r?\n/)
const start = lines.findIndex((line) => line.startsWith(`## [${version}]`))
if (start === -1) {
  console.error(`No CHANGELOG section found for version ${version}`)
  process.exit(1)
}

let end = lines.length
for (let index = start + 1; index < lines.length; index += 1) {
  if (lines[index].startsWith("## [")) {
    end = index
    break
  }
}

const section = lines.slice(start + 1, end).join("\n").trim()
if (section.length === 0) {
  console.error(`The CHANGELOG section for ${version} is empty`)
  process.exit(1)
}

process.stdout.write(`${section}\n`)
