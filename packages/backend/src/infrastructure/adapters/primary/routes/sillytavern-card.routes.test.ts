import { once } from "node:events"
import type { Server } from "node:http"

import express from "express"
import { afterEach, describe, expect, it, vi } from "vitest"

import type { Logger } from "../../../../domain/ports/logger.port"
import { DomainError } from "../../../../domain/errors"
import { buildErrorHandler } from "../middlewares/error-handler"
import { buildCharacterRouter } from "./character.routes"
import { buildSillyTavernCardRouter } from "./sillytavern-card.routes"

const logger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
} as unknown as Logger

const preview = {
  name: "Lyra",
  description: "A guardian.",
  tags: ["fantasy"],
  creator: "Author",
  lorebookEntryCount: 2,
  cardVersion: "v3",
  warnings: [],
}

const summary = {
  id: "char-1",
  name: "Lyra",
  subtitle: null,
  profileImageAssetId: null,
  versionNumber: 1,
  createdAt: "2026-11-07T12:00:00.000Z",
  updatedAt: "2026-11-07T12:00:00.000Z",
}

const buildDeps = () => ({
  previewSillyTavernCard: { execute: vi.fn(async () => preview) },
  importSillyTavernCard: { execute: vi.fn(async () => summary) },
  exportSillyTavernCard: {
    execute: vi.fn(async () => ({
      format: "json" as const,
      body: { spec: "chara_card_v3", data: { name: "Lyra" } },
    })),
  },
})

describe("sillytavern card routes", () => {
  let server: Server | undefined

  afterEach(async () => {
    if (!server) return
    await new Promise<void>((resolve, reject) => {
      server!.close((error) => (error ? reject(error) : resolve()))
    })
    server = undefined
  })

  const startServer = async (
    deps = buildDeps(),
    options: { withCharacterRouter?: boolean } = {}
  ) => {
    const app = express()
    app.use(buildSillyTavernCardRouter(deps as never))
    if (options.withCharacterRouter) {
      const getCharacter = { execute: vi.fn() }
      app.use(buildCharacterRouter({ getCharacter } as never))
    }
    app.use(buildErrorHandler(logger))
    server = app.listen(0)
    await once(server, "listening")
    const address = server.address()
    if (!address || typeof address === "string") throw new Error("No port")
    return { baseUrl: `http://127.0.0.1:${address.port}`, deps }
  }

  it("previews a card without persisting it", async () => {
    const { baseUrl, deps } = await startServer()

    const response = await fetch(`${baseUrl}/characters/cards/preview`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ format: "json", payload: '{"name":"Lyra"}' }),
    })

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual(preview)
    expect(deps.previewSillyTavernCard.execute).toHaveBeenCalledWith({
      format: "json",
      payload: '{"name":"Lyra"}',
    })
    expect(deps.importSillyTavernCard.execute).not.toHaveBeenCalled()
  })

  it("imports a card and returns 201", async () => {
    const { baseUrl, deps } = await startServer()

    const response = await fetch(`${baseUrl}/characters/cards/import`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ format: "png", payload: "iVBORw0KGgo=" }),
    })

    expect(response.status).toBe(201)
    expect(await response.json()).toEqual(summary)
    expect(deps.importSillyTavernCard.execute).toHaveBeenCalledWith({
      format: "png",
      payload: "iVBORw0KGgo=",
    })
  })

  it("exports JSON and PNG with the right content type", async () => {
    const deps = buildDeps()
    deps.exportSillyTavernCard.execute = vi
      .fn()
      .mockResolvedValueOnce({
        format: "json",
        body: { spec: "chara_card_v3", data: { name: "Lyra" } },
      })
      .mockResolvedValueOnce({
        format: "png",
        body: Buffer.from([0x89, 0x50, 0x4e, 0x47]),
      })
    const { baseUrl } = await startServer(deps)

    const json = await fetch(`${baseUrl}/characters/char-1/cards/export`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ format: "json", spec: "v3" }),
    })
    expect(json.status).toBe(200)
    expect(json.headers.get("content-type")).toContain("application/json")
    expect(await json.json()).toMatchObject({ spec: "chara_card_v3" })

    const png = await fetch(`${baseUrl}/characters/char-1/cards/export`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ format: "png", spec: "v2" }),
    })
    expect(png.status).toBe(200)
    expect(png.headers.get("content-type")).toContain("image/png")
    expect(Buffer.from(await png.arrayBuffer()).subarray(0, 4)).toEqual(
      Buffer.from([0x89, 0x50, 0x4e, 0x47])
    )
  })

  it("maps INVALID_CARD_NAME to 400", async () => {
    const deps = buildDeps()
    deps.previewSillyTavernCard.execute = vi.fn(async () => {
      throw new DomainError("INVALID_CARD_NAME", "The card name is required.", 400)
    })
    const { baseUrl } = await startServer(deps)

    const response = await fetch(`${baseUrl}/characters/cards/preview`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ format: "json", payload: "{}" }),
    })

    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({
      error: { code: "INVALID_CARD_NAME" },
    })
  })

  it("rejects an unknown format with a validation error", async () => {
    const { baseUrl, deps } = await startServer()

    const response = await fetch(`${baseUrl}/characters/cards/preview`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ format: "xml", payload: "{}" }),
    })

    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({
      error: { code: "VALIDATION_ERROR" },
    })
    expect(deps.previewSillyTavernCard.execute).not.toHaveBeenCalled()
  })

  it("accepts a payload over the global 1 MB JSON limit", async () => {
    const { baseUrl } = await startServer()
    const payload = `{"name":"${"x".repeat(2 * 1024 * 1024)}"}`

    const response = await fetch(`${baseUrl}/characters/cards/preview`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ format: "json", payload }),
    })

    expect(response.status).toBe(200)
  })

  it("mounts card routes before /characters/:id", async () => {
    const { baseUrl } = await startServer(buildDeps(), {
      withCharacterRouter: true,
    })

    const response = await fetch(`${baseUrl}/characters/cards/preview`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ format: "json", payload: "{}" }),
    })

    expect(response.status).toBe(200)
  })
})
