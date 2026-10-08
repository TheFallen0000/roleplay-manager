#!/usr/bin/env node
/**
 * Regenerates the brand images served by the frontend from the source art:
 *
 *   pnpm brand:generate
 *
 * Source: docs/brand/logo-source.png (2400x2400, transparent background).
 * Output (committed to the repo):
 *   packages/frontend/public/brand/face-96.png     sidebar mark (face crop)
 *   packages/frontend/public/brand/mascot-192.png  welcome mark (full art)
 *   packages/frontend/public/favicon-16x16.png
 *   packages/frontend/public/favicon-32x32.png
 *   packages/frontend/public/favicon-48x48.png
 *   packages/frontend/public/apple-touch-icon.png
 *
 * The art is flat-colored, so the palette encoder keeps the whole set under
 * ~40 KB while staying faithful to the original PNG.
 */
import { existsSync, mkdirSync, statSync } from "node:fs"
import { dirname, join, relative, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import sharp from "sharp"

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const source = join(repoRoot, "docs/brand/logo-source.png")
const publicDir = join(repoRoot, "packages/frontend/public")

if (!existsSync(source)) {
  console.error(`Missing source art: ${source}`)
  process.exit(1)
}

mkdirSync(join(publicDir, "brand"), { recursive: true })

/**
 * Square crop around the head, in source pixels. The art content spans
 * x=316..2068, y=276..2252; this frames the face with the horns and a bit of
 * the sign, and reads well down to 16px.
 */
const FACE = { left: 630, top: 276, width: 1124, height: 1124 }

const write = async (pipeline, path) => {
  await pipeline
    .png({ palette: true, quality: 92, effort: 10, compressionLevel: 9 })
    .toFile(path)
  const size = (statSync(path).size / 1024).toFixed(1)
  console.log(`${relative(repoRoot, path).replaceAll("\\", "/")}  ${size} KB`)
}

const face = (size) => sharp(source).extract(FACE).resize(size, size)

await write(face(96), join(publicDir, "brand/face-96.png"))
await write(
  sharp(source).resize(192, 192, { fit: "inside" }),
  join(publicDir, "brand/mascot-192.png"),
)
await write(face(16), join(publicDir, "favicon-16x16.png"))
await write(face(32), join(publicDir, "favicon-32x32.png"))
await write(face(48), join(publicDir, "favicon-48x48.png"))
await write(face(180), join(publicDir, "apple-touch-icon.png"))

console.log("\nDone.")
