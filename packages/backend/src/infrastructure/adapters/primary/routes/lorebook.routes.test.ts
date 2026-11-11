import { once } from "node:events"
import type { Server } from "node:http"

import express from "express"
import { afterEach, describe, expect, it, vi } from "vitest"

import type { Logger } from "../../../../domain/ports/logger.port"
import { DomainError } from "../../../../domain/errors"
import { buildErrorHandler } from "../middlewares/error-handler"
import { buildLorebookRouter } from "./lorebook.routes"

const logger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
} as unknown as Logger

const lorebook = {
  id: "book-1",
  characterId: "char-1",
  name: "Forest lore",
  description: null,
  scanDepth: 4,
  tokenBudget: 400,
  recursiveScanning: false,
  extensions: {},
  unknownFields: null,
  entries: [
    {
      id: "entry-1",
      name: null,
      sourceId: "1",
      keys: ["dragon"],
      secondaryKeys: [],
      comment: null,
      content: "Dragons breathe fire.",
      constant: false,
      selective: false,
      selectiveLogic: 0,
      insertionOrder: 100,
      position: "after_char",
      rawPosition: "1",
      priority: 0,
      enabled: true,
      caseSensitive: false,
      wholeWords: false,
      order: 0,
      extensions: {},
      unknownFields: null,
    },
  ],
}

const buildDeps = () => ({
  previewLorebook: {
    execute: vi.fn(async () => ({
      detectedShape: "ccv3",
      entryCount: 1,
      warnings: [],
    })),
  },
  importLorebook: { execute: vi.fn(async () => lorebook) },
  exportLorebook: {
    execute: vi.fn(async () => ({
      spec: "lorebook_v3",
      data: { entries: [] },
    })),
  },
  getLorebook: { execute: vi.fn(async () => lorebook) },
  updateLorebook: { execute: vi.fn(async () => lorebook) },
  createLorebookEntry: { execute: vi.fn(async () => lorebook.entries[0]) },
  updateLorebookEntry: { execute: vi.fn(async () => lorebook.entries[0]) },
  deleteLorebookEntry: { execute: vi.fn(async () => {}) },
  reorderLorebookEntries: { execute: vi.fn(async () => {}) },
})

describe("lorebook routes", () => {
  let server: Server | undefined

  afterEach(async () => {
    if (!server) return
    await new Promise<void>((resolve, reject) => {
      server!.close((error) => (error ? reject(error) : resolve()))
    })
    server = undefined
  })

  const startServer = async (deps = buildDeps()) => {
    const app = express()
    app.use(buildLorebookRouter(deps as never))
    app.use(buildErrorHandler(logger))
    server = app.listen(0)
    await once(server, "listening")
    const address = server.address()
    if (!address || typeof address === "string") throw new Error("No port")
    return { baseUrl: `http://127.0.0.1:${address.port}`, deps }
  }

  const json = (baseUrl: string, path: string, body: unknown) =>
    fetch(`${baseUrl}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })

  it("previews a CCv3 or ST native standalone lorebook without persisting", async () => {
    const { baseUrl, deps } = await startServer()

    const response = await json(baseUrl, "/lorebooks/preview", {
      format: "json",
      payload: '{"spec":"lorebook_v3","data":{"entries":[]}}',
    })

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      detectedShape: "ccv3",
      entryCount: 1,
      warnings: [],
    })
    expect(deps.importLorebook.execute).not.toHaveBeenCalled()
  })

  it("returns 404 LOREBOOK_NOT_FOUND when the character has no book", async () => {
    const deps = buildDeps()
    deps.getLorebook.execute = vi.fn(async () => {
      throw new DomainError("LOREBOOK_NOT_FOUND", "No lorebook.", 404)
    })
    const { baseUrl } = await startServer(deps)

    const response = await fetch(`${baseUrl}/characters/char-1/lorebook`)
    expect(response.status).toBe(404)
    expect(await response.json()).toMatchObject({
      error: { code: "LOREBOOK_NOT_FOUND" },
    })
  })

  it("returns 409 when importing without replace over an existing book", async () => {
    const deps = buildDeps()
    deps.importLorebook.execute = vi.fn(async () => {
      throw new DomainError(
        "LOREBOOK_ALREADY_EXISTS",
        "The character already has a lorebook.",
        409
      )
    })
    const { baseUrl } = await startServer(deps)

    const response = await json(baseUrl, "/characters/char-1/lorebook/import", {
      format: "json",
      payload: "{}",
    })

    expect(response.status).toBe(409)
    expect(await response.json()).toMatchObject({
      error: { code: "LOREBOOK_ALREADY_EXISTS" },
    })
  })

  it("imports with replace:true", async () => {
    const { baseUrl, deps } = await startServer()

    const response = await json(baseUrl, "/characters/char-1/lorebook/import", {
      format: "json",
      payload: "{}",
      replace: true,
    })

    expect(response.status).toBe(200)
    expect(deps.importLorebook.execute).toHaveBeenCalledWith({
      characterId: "char-1",
      format: "json",
      payload: "{}",
      replace: true,
    })
  })

  it("exports ccv3 and st-native", async () => {
    const deps = buildDeps()
    deps.exportLorebook.execute = vi
      .fn()
      .mockResolvedValueOnce({ spec: "lorebook_v3", data: { entries: [] } })
      .mockResolvedValueOnce({ entries: {} })
    const { baseUrl } = await startServer(deps)

    const ccv3 = await json(baseUrl, "/characters/char-1/lorebook/export", {
      format: "ccv3",
    })
    expect(ccv3.status).toBe(200)
    expect(await ccv3.json()).toMatchObject({ spec: "lorebook_v3" })

    const stNative = await json(baseUrl, "/characters/char-1/lorebook/export", {
      format: "st-native",
    })
    expect(stNative.status).toBe(200)
    expect(await stNative.json()).toEqual({ entries: {} })
  })

  it("updates book settings and CRUD entries", async () => {
    const { baseUrl, deps } = await startServer()

    const put = await fetch(`${baseUrl}/characters/char-1/lorebook`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "New", scanDepth: 8, tokenBudget: 600 }),
    })
    expect(put.status).toBe(200)
    expect(deps.updateLorebook.execute).toHaveBeenCalledWith({
      characterId: "char-1",
      name: "New",
      scanDepth: 8,
      tokenBudget: 600,
    })

    const created = await json(baseUrl, "/characters/char-1/lorebook/entries", {
      keys: ["forest"],
      content: "The forest is old.",
      position: "before_char",
      selectiveLogic: 2,
    })
    expect(created.status).toBe(201)
    expect(deps.createLorebookEntry.execute).toHaveBeenCalledWith(
      expect.objectContaining({ characterId: "char-1", keys: ["forest"] })
    )

    const updated = await fetch(
      `${baseUrl}/characters/char-1/lorebook/entries/entry-1`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: "Updated" }),
      }
    )
    expect(updated.status).toBe(200)
    expect(deps.updateLorebookEntry.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        characterId: "char-1",
        entryId: "entry-1",
        content: "Updated",
      })
    )

    const reordered = await fetch(
      `${baseUrl}/characters/char-1/lorebook/entries`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entryIds: ["entry-2", "entry-1"] }),
      }
    )
    expect(reordered.status).toBe(200)
    expect(deps.reorderLorebookEntries.execute).toHaveBeenCalledWith({
      characterId: "char-1",
      entryIds: ["entry-2", "entry-1"],
    })

    const deleted = await fetch(
      `${baseUrl}/characters/char-1/lorebook/entries/entry-1`,
      { method: "DELETE" }
    )
    expect(deleted.status).toBe(204)
    expect(deps.deleteLorebookEntry.execute).toHaveBeenCalledWith({
      characterId: "char-1",
      entryId: "entry-1",
    })
  })

  it("validates the numeric and enum bounds with Zod", async () => {
    const { baseUrl } = await startServer()

    const responses = await Promise.all([
      json(baseUrl, "/characters/char-1/lorebook/entries", {
        keys: ["x"],
        content: "x",
        selectiveLogic: 4,
      }),
      json(baseUrl, "/characters/char-1/lorebook/entries", {
        keys: ["x"],
        content: "x",
        position: "somewhere",
      }),
      fetch(`${baseUrl}/characters/char-1/lorebook`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scanDepth: 65 }),
      }),
      fetch(`${baseUrl}/characters/char-1/lorebook`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tokenBudget: 100_001 }),
      }),
      json(baseUrl, "/characters/char-1/lorebook/entries", {
        keys: ["x"],
        content: "x",
        priority: -10_001,
      }),
    ])

    for (const response of responses) {
      expect(response.status).toBe(400)
      expect(await response.json()).toMatchObject({
        error: { code: "VALIDATION_ERROR" },
      })
    }
  })
})
