import { rmSync } from "node:fs"

import { build } from "esbuild"

/**
 * Bundles the backend into a single ESM file for production.
 *
 * - Native modules (`better-sqlite3`, `sharp`) stay external; they ship in the
 *   package's `node_modules`.
 * - `pino-pretty` is dev-only (production uses plain pino), so it stays external.
 * - The banner provides `require` for CJS dependencies that use dynamic
 *   requires (express/body-parser/depd), which ESM bundles cannot resolve.
 */
rmSync("dist", { recursive: true, force: true })

await build({
  entryPoints: ["src/index.ts"],
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node22",
  outfile: "dist/server.mjs",
  sourcemap: true,
  external: ["better-sqlite3", "sharp", "@img/*", "pino-pretty"],
  banner: {
    js: [
      "import { createRequire as __createRequire } from 'node:module';",
      "const require = __createRequire(import.meta.url);",
    ].join("\n"),
  },
})
