import { readdir, mkdir } from "node:fs/promises"
import { basename, dirname, extname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import sharp from "sharp"

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const SOURCE = resolve(ROOT, "screenshots-source")
const OUTPUT = resolve(ROOT, "src/assets/screenshots")
const LOCALES = ["en", "es"]

const maxWidth = (name) => (name.includes("mobile") ? 1220 : 1920)

const processLocale = async (locale) => {
  const sourceDir = resolve(SOURCE, locale)
  let files = []
  try {
    files = await readdir(sourceDir)
  } catch {
    console.warn(`No source folder for ${locale}; skipping.`)
    return
  }

  const outputDir = resolve(OUTPUT, locale)
  await mkdir(outputDir, { recursive: true })

  for (const file of files) {
    const extension = extname(file).toLowerCase()
    if (![".png", ".jpg", ".jpeg", ".webp"].includes(extension)) continue
    const name = basename(file, extension)
    const input = resolve(sourceDir, file)
    const output = resolve(outputDir, `${name}.webp`)

    const info = await sharp(input)
      .rotate()
      .resize({ width: maxWidth(name), withoutEnlargement: true })
      .webp({ quality: 92, effort: 6 })
      .toFile(output)

    console.log(
      `${locale}/${name}.webp · ${info.width}x${info.height} · ${Math.round(info.size / 1024)} KB`,
    )
  }
}

for (const locale of LOCALES) await processLocale(locale)
