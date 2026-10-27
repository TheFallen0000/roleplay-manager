#!/usr/bin/env node
/**
 * Writes `SHA256SUMS` for every file in the given folder. The release workflow
 * uploads it next to the packages and the updater verifies it before installing.
 */
import { createHash } from "node:crypto"
import { createReadStream } from "node:fs"
import { readdir, writeFile } from "node:fs/promises"
import { join, resolve } from "node:path"

const directory = resolve(process.argv[2] ?? "release")

const sha256 = (path) =>
  new Promise((resolveHash, reject) => {
    const hash = createHash("sha256")
    createReadStream(path)
      .on("data", (chunk) => hash.update(chunk))
      .on("error", reject)
      .on("end", () => resolveHash(hash.digest("hex")))
  })

const entries = await readdir(directory, { withFileTypes: true })
const names = entries
  .filter(
    (entry) =>
      entry.isFile() &&
      entry.name !== "SHA256SUMS" &&
      entry.name !== "SHA256SUMS.sig",
  )
  .map((entry) => entry.name)
  .sort()

const lines = []
for (const name of names) {
  lines.push(`${await sha256(join(directory, name))}  ${name}`)
}

const output = join(directory, "SHA256SUMS")
await writeFile(output, `${lines.join("\n")}\n`, "utf8")
console.log(`Wrote ${output} (${names.length} files).`)
