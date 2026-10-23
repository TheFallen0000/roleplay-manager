import { readFile, writeFile } from "node:fs/promises"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const REPO = "TheFallen0000/roleplay-manager"
const API = `https://api.github.com/repos/${REPO}/releases/latest`
const OUTPUT = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../src/data/release.json",
)
const ASSET_PATTERN =
  /^roleplay-manager-(?<version>\d+\.\d+\.\d+)-(?<os>win|linux|mac)-(?<arch>x64|arm64)\.(?<ext>zip|tar\.gz)$/

const formatSize = (bytes) => {
  if (!Number.isFinite(bytes)) return null
  return `${Math.round(bytes / 1_000_000)} MB`
}

const mapAssets = (assets) => {
  const mapped = {}
  for (const asset of assets) {
    const match = ASSET_PATTERN.exec(asset.name)
    if (!match?.groups) continue
    const { os, arch } = match.groups
    mapped[`${os}-${arch}`] = {
      name: asset.name,
      url: asset.browser_download_url,
      size: asset.size,
      sizeLabel: formatSize(asset.size),
    }
  }
  return mapped
}

const readFallback = async () => {
  try {
    return JSON.parse(await readFile(OUTPUT, "utf8"))
  } catch {
    return null
  }
}

const main = async () => {
  let release = null
  try {
    const headers = {
      Accept: "application/vnd.github+json",
      "User-Agent": "roleplay-manager-website",
    }
    if (process.env.GITHUB_TOKEN) {
      headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`
    }
    const response = await fetch(API, { headers })
    if (!response.ok) throw new Error(`GitHub API respondió ${response.status}`)
    const data = await response.json()
    const assets = mapAssets(data.assets ?? [])
    if (!assets["win-x64"] || !assets["linux-x64"] || !assets["mac-arm64"]) {
      throw new Error("La release no contiene los assets esperados")
    }
    release = {
      version: String(data.tag_name ?? "").replace(/^v/, ""),
      tag: data.tag_name ?? null,
      publishedAt: data.published_at ?? null,
      htmlUrl: data.html_url ?? null,
      assets,
    }
  } catch (error) {
    const fallback = await readFallback()
    if (!fallback) {
      console.error(`No se pudo leer la última release: ${error.message}`)
      process.exitCode = 1
      return
    }
    console.warn(`Usando snapshot local de release: ${error.message}`)
    return
  }

  await writeFile(OUTPUT, `${JSON.stringify(release, null, 2)}\n`)
  console.log(`Release ${release.version} guardada en ${OUTPUT}`)
}

await main()
