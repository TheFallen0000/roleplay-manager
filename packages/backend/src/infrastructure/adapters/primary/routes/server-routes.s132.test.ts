import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"

import { describe, expect, it } from "vitest"

const serverSource = readFileSync(
  fileURLToPath(new URL("../server.ts", import.meta.url)),
  "utf8"
)

/**
 * Express matches `/characters/:id` before any later route with the same
 * prefix, so the card/lorebook routers must be wired first. This is a wiring
 * test: the behavior (a request reaching the card handler) is covered by the
 * route tests.
 */
describe("server route wiring for S132", () => {
  it("mounts the card and lorebook routers before /characters/:id", () => {
    const characterMount = serverSource.lastIndexOf(
      "buildCharacterRouter(container)"
    )
    const cardMount = serverSource.indexOf("buildSillyTavernCardRouter(")
    const lorebookMount = serverSource.indexOf("buildLorebookRouter(")

    expect(cardMount).toBeGreaterThan(-1)
    expect(lorebookMount).toBeGreaterThan(-1)
    expect(characterMount).toBeGreaterThan(-1)
    expect(cardMount).toBeLessThan(characterMount)
    expect(lorebookMount).toBeLessThan(characterMount)
  })

  it("gives the card and lorebook routers a 15 MB JSON limit", () => {
    expect(serverSource).toContain('express.json({ limit: "15mb" })')
  })
})
