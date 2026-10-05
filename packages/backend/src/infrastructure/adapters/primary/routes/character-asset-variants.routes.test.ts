import { once } from "node:events"
import type { Server } from "node:http"
import { Readable } from "node:stream"

import express from "express"
import { afterEach, describe, expect, it, vi } from "vitest"

import { buildCharacterRouter } from "./character.routes"

describe("character asset variant route", () => {
  let server: Server | undefined

  afterEach(async () => {
    if (!server) return
    await new Promise<void>((resolve, reject) => {
      server!.close((error) => (error ? reject(error) : resolve()))
    })
    server = undefined
  })

  it("serves an immutable WebP variant when requested", async () => {
    const execute = vi.fn(async ({ assetId, variant }) => ({
      asset: {
        id: assetId,
        characterId: "char-1",
        mimeType: "image/png",
        sizeBytes: 10,
      },
      stream: Readable.from([Buffer.from("webp-data")]),
      isVariant: variant !== undefined,
    }))
    const app = express()
    app.use(
      buildCharacterRouter(
        { getCharacterAsset: { execute } } as never,
      ),
    )
    server = app.listen(0)
    await once(server, "listening")
    const address = server.address()
    if (!address || typeof address === "string") throw new Error("No server port")

    const response = await fetch(
      `http://127.0.0.1:${address.port}/characters/char-1/assets/asset-1?variant=thumbnail`,
    )

    expect(response.status).toBe(200)
    expect(response.headers.get("content-type")).toContain("image/webp")
    expect(response.headers.get("cache-control")).toBe(
      "private, max-age=31536000, immutable",
    )
    expect(response.headers.get("x-content-type-options")).toBe("nosniff")
    expect(await response.text()).toBe("webp-data")
    expect(execute).toHaveBeenCalledWith({
      assetId: "asset-1",
      variant: "thumbnail",
    })
  })
})
