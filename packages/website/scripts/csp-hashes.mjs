import { createHash } from "node:crypto"
import { readdir, readFile, writeFile } from "node:fs/promises"
import { join, resolve } from "node:path"

/**
 * Starlight injects a few inline scripts that Astro's CSP does not hash (the
 * search shortcut and the theme picker update). Walk the built HTML and add
 * every missing inline-script hash to that page's own `script-src` directive.
 */
const root = resolve(process.argv[2] ?? "dist")

const isExecutableScript = (attributes, body) => {
  if (!body.trim()) return false
  if (/\bsrc\s*=/i.test(attributes)) return false
  const type = attributes
    .match(/\btype\s*=\s*["']([^"']+)["']/i)?.[1]
    ?.toLowerCase()
  return (
    !type ||
    type === "module" ||
    type === "text/javascript" ||
    type === "application/javascript"
  )
}

const sha256 = (value) =>
  createHash("sha256").update(value, "utf8").digest("base64")

const collectHashes = (html) => {
  const hashes = new Set()
  const regex = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi
  let match
  while ((match = regex.exec(html)) !== null) {
    if (!isExecutableScript(match[1], match[2])) continue
    hashes.add(sha256(match[2]))
  }
  return [...hashes]
}

const addHashesToCsp = (csp, hashes) => {
  if (hashes.length === 0) return csp

  const directives = csp
    .split(";")
    .map((directive) => directive.trim())
    .filter(Boolean)
  let index = directives.findIndex((directive) =>
    directive.startsWith("script-src ")
  )
  if (index === -1) {
    directives.push("script-src 'self'")
    index = directives.length - 1
  }

  const parts = directives[index].split(/\s+/)
  const existing = new Set(parts.filter((part) => part.startsWith("'sha256-")))
  for (const hash of hashes) {
    const token = `'sha256-${hash}'`
    if (!existing.has(token)) {
      parts.push(token)
      existing.add(token)
    }
  }
  directives[index] = parts.join(" ")
  return directives.join("; ")
}

const walk = async (directory) => {
  const entries = await readdir(directory, { withFileTypes: true })
  for (const entry of entries) {
    const full = join(directory, entry.name)
    if (entry.isDirectory()) {
      await walk(full)
    } else if (entry.name.endsWith(".html")) {
      await processPage(full)
    }
  }
}

const processPage = async (path) => {
  const html = await readFile(path, "utf8")
  const meta = html.match(
    /<meta\b[^>]*http-equiv=["']content-security-policy["'][^>]*>/i
  )?.[0]
  if (!meta) return

  const content = meta.match(/\bcontent=(["'])([\s\S]*?)\1/i)?.[2]
  if (!content) return

  const updated = addHashesToCsp(content, collectHashes(html))
  if (updated === content) return

  await writeFile(
    path,
    html.replace(
      meta,
      meta.replace(content, () => updated)
    )
  )
}

await walk(root)
console.log(`CSP hashes updated in ${root}`)
