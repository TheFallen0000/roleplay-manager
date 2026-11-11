import { once } from "node:events"
import { readFileSync } from "node:fs"
import type { Server } from "node:http"
import { fileURLToPath } from "node:url"

import express from "express"
import { afterEach, describe, expect, it, vi } from "vitest"

import type { Logger } from "../../../../domain/ports/logger.port"
import { DomainError } from "../../../../domain/errors"
import { buildErrorHandler } from "../middlewares/error-handler"
import { buildLorebooksRouter } from "./lorebooks.routes"

const logger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
} as unknown as Logger

const lorebook = {
  id: "book-1",
  characterId: null,
  name: "Forest lore",
  description: "Facts about the forest",
  scanDepth: 4,
  tokenBudget: 400,
  recursiveScanning: false,
  extensions: {},
  unknownFields: null,
  originId: "origin-1",
  currentVersionId: "version-1",
  deletedAt: null,
  entries: [],
}

const version = {
  id: "version-1",
  lorebookId: "book-1",
  versionNumber: 1,
  name: "Forest lore",
  description: "Facts about the forest",
  scanDepth: 4,
  tokenBudget: 400,
  recursiveScanning: false,
  sourceKey: "a".repeat(64),
  entries: [],
}

const buildDeps = () => ({
  listLorebooks: { execute: vi.fn(async () => [lorebook]) },
  getLorebookById: { execute: vi.fn(async () => lorebook) },
  listLorebookVersions: { execute: vi.fn(async () => [version]) },
  getLorebookVersion: { execute: vi.fn(async () => version) },
  createLorebook: { execute: vi.fn(async () => lorebook) },
  updateLorebook: {
    execute: vi.fn(async () => ({ lorebook, createdNewVersion: false })),
  },
})

describe("lorebooks resource routes", () => {
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
    app.use(express.json({ limit: "15mb" }))
    app.use(buildLorebooksRouter(deps as never))
    app.use(buildErrorHandler(logger))
    server = app.listen(0)
    await once(server, "listening")
    const address = server.address()
    if (!address || typeof address === "string") throw new Error("No port")
    return { baseUrl: `http://127.0.0.1:${address.port}`, deps }
  }

  it("lists live lorebooks", async () => {
    const { baseUrl, deps } = await startServer()

    const response = await fetch(`${baseUrl}/lorebooks`)

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual([lorebook])
    expect(deps.listLorebooks.execute).toHaveBeenCalledTimes(1)
  })

  it("gets a container, its versions and one immutable version", async () => {
    const { baseUrl, deps } = await startServer()

    const book = await fetch(`${baseUrl}/lorebooks/book-1`)
    expect(book.status).toBe(200)
    expect(await book.json()).toEqual(lorebook)

    const versions = await fetch(`${baseUrl}/lorebooks/book-1/versions`)
    expect(versions.status).toBe(200)
    expect(await versions.json()).toEqual([version])

    const one = await fetch(
      `${baseUrl}/lorebooks/book-1/versions/version-1`,
    )
    expect(one.status).toBe(200)
    expect(await one.json()).toEqual(version)

    expect(deps.getLorebookById.execute).toHaveBeenCalledWith({
      id: "book-1",
    })
    expect(deps.listLorebookVersions.execute).toHaveBeenCalledWith({
      lorebookId: "book-1",
    })
    expect(deps.getLorebookVersion.execute).toHaveBeenCalledWith({
      lorebookId: "book-1",
      versionId: "version-1",
    })
  })

  it("creates a standalone lorebook and returns 201", async () => {
    const { baseUrl, deps } = await startServer()
    const body = {
      name: "Forest lore",
      description: "Facts about the forest",
      entries: [{ keys: ["dragon"], content: "Dragons dwell here." }],
    }

    const response = await fetch(`${baseUrl}/lorebooks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })

    expect(response.status).toBe(201)
    expect(await response.json()).toEqual(lorebook)
    expect(deps.createLorebook.execute).toHaveBeenCalledWith(body)
  })

  it("updates the live head and reports createdNewVersion", async () => {
    const { baseUrl, deps } = await startServer()
    deps.updateLorebook.execute.mockResolvedValueOnce({
      lorebook: { ...lorebook, name: "Renamed" },
      createdNewVersion: true,
    })

    const response = await fetch(`${baseUrl}/lorebooks/book-1`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Renamed" }),
    })

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      lorebook: { name: "Renamed" },
      createdNewVersion: true,
    })
    expect(deps.updateLorebook.execute).toHaveBeenCalledWith({
      id: "book-1",
      name: "Renamed",
    })
  })

  it("maps LOREBOOK_NOT_FOUND and LOREBOOK_VERSION_NOT_FOUND to 404", async () => {
    const deps = buildDeps()
    deps.getLorebookById.execute.mockRejectedValueOnce(
      new DomainError("LOREBOOK_NOT_FOUND", "No lorebook.", 404),
    )
    deps.getLorebookVersion.execute.mockRejectedValueOnce(
      new DomainError("LOREBOOK_VERSION_NOT_FOUND", "No version.", 404),
    )
    const { baseUrl } = await startServer(deps)

    const missingBook = await fetch(`${baseUrl}/lorebooks/missing`)
    expect(missingBook.status).toBe(404)
    expect(await missingBook.json()).toMatchObject({
      error: { code: "LOREBOOK_NOT_FOUND" },
    })

    const missingVersion = await fetch(
      `${baseUrl}/lorebooks/book-1/versions/missing`,
    )
    expect(missingVersion.status).toBe(404)
    expect(await missingVersion.json()).toMatchObject({
      error: { code: "LOREBOOK_VERSION_NOT_FOUND" },
    })
  })

  it("has no write route for an immutable version", async () => {
    const { baseUrl } = await startServer()

    const response = await fetch(
      `${baseUrl}/lorebooks/book-1/versions/version-1`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Nope" }),
      },
    )

    expect(response.status).toBe(404)
  })
})

describe("server wiring for the lorebooks resource", () => {
  it("mounts the lorebooks router before /characters/:id", () => {
    const serverSource = readFileSync(
      fileURLToPath(new URL("../server.ts", import.meta.url)),
      "utf8",
    )
    const lorebooksMount = serverSource.indexOf("buildLorebooksRouter(")
    const characterMount = serverSource.lastIndexOf(
      "buildCharacterRouter(container)",
    )

    expect(lorebooksMount).toBeGreaterThan(-1)
    expect(characterMount).toBeGreaterThan(-1)
    expect(lorebooksMount).toBeLessThan(characterMount)
  })
})
