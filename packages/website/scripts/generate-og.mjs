import { mkdir } from "node:fs/promises"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import sharp from "sharp"

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const SOURCE = resolve(ROOT, "screenshots-source")
const PUBLIC = resolve(ROOT, "public")

const locales = ["en", "es"]

await mkdir(PUBLIC, { recursive: true })

for (const locale of locales) {
  const input = resolve(SOURCE, locale, "welcome-sakura-desktop.png")
  const output = resolve(PUBLIC, `og-${locale}.png`)
  await sharp(input)
    .resize({ width: 1200 })
    .extract({ left: 0, top: 22, width: 1200, height: 630 })
    .png({ quality: 90, compressionLevel: 9 })
    .toFile(output)
  console.log(`Generated ${output}`)
}
