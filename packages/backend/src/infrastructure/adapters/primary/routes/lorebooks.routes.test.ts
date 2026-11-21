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

const jsonBody = async (response: {
  text: () => Promise<string>
}): Promise<unknown> => {
  const text = await response.text()
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

const characterVersion = {
  id: "ver-2",
  characterId: "char-1",
  name: "Lyra",
  subtitle: null,
  profileImageAssetId: null,
  description: "A guardian of the forest.",
  instructions: null,
  greeting: "Hello, traveler.",
  versionNumber: 2,
  createdAt: "2026-11-20T12:00:00.000Z",
  cards: [],
  alternateGreetings: [],
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
  exportLorebook: {
    executeById: vi.fn(async ({ format }: { format: string }) => ({
      spec: "lorebook_v3",
      data: { name: lorebook.name, format },
    })),
  },
  softDeleteLorebook: { execute: vi.fn(async () => undefined) },
  restoreLorebookVersion: {
    execute: vi.fn(async () => ({ lorebook, createdNewVersion: true })),
  },
  getLorebookUsage: {
    execute: vi.fn(async () => ({ characters: [] })),
  },
  linkLorebook: { execute: vi.fn(async () => characterVersion) },
  importLorebookPreview: {
    execute: vi.fn(async () => ({
      matched: false,
      suggestedAction: "new-book",
    })),
  },
  importLorebookStandalone: {
    execute: vi.fn(async () => ({ action: "new-book", book: lorebook })),
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

  it("exports a standalone lorebook and validates the format", async () => {
    const { baseUrl, deps } = await startServer()

    const response = await fetch(`${baseUrl}/lorebooks/book-1/export`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ format: "ccv3" }),
    })

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      spec: "lorebook_v3",
      data: { format: "ccv3" },
    })
    expect(deps.exportLorebook.executeById).toHaveBeenCalledWith({
      lorebookId: "book-1",
      format: "ccv3",
    })

    const invalid = await fetch(`${baseUrl}/lorebooks/book-1/export`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ format: "pdf" }),
    })
    expect(invalid.status).toBe(400)
  })

  it("maps a missing book on export to 404", async () => {
    const deps = buildDeps()
    deps.exportLorebook.executeById.mockRejectedValueOnce(
      new DomainError("LOREBOOK_NOT_FOUND", "No lorebook.", 404),
    )
    const { baseUrl } = await startServer(deps)

    const response = await fetch(`${baseUrl}/lorebooks/missing/export`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ format: "st-native" }),
    })

    expect(response.status).toBe(404)
    expect(await response.json()).toMatchObject({
      error: { code: "LOREBOOK_NOT_FOUND" },
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

  it("exposes the S134 restore, delete, usage, link and import endpoints", async () => {
    const { baseUrl, deps } = await startServer()

    const restored = await fetch(
      `${baseUrl}/lorebooks/book-1/versions/version-1/restore`,
      { method: "POST" },
    )
    expect(restored.status).toBe(200)
    expect(await restored.json()).toMatchObject({ createdNewVersion: true })
    expect(deps.restoreLorebookVersion.execute).toHaveBeenCalledWith({
      lorebookId: "book-1",
      versionId: "version-1",
    })

    const deleted = await fetch(`${baseUrl}/lorebooks/book-1`, {
      method: "DELETE",
    })
    expect(deleted.status).toBe(204)
    expect(deps.softDeleteLorebook.execute).toHaveBeenCalledWith("book-1")

    const usage = await fetch(
      `${baseUrl}/lorebooks/book-1/usage?versionId=version-2`,
    )
    expect(usage.status).toBe(200)
    expect(await usage.json()).toEqual({ characters: [] })
    expect(deps.getLorebookUsage.execute).toHaveBeenCalledWith({
      lorebookId: "book-1",
      versionId: "version-2",
    })

    const linked = await fetch(`${baseUrl}/lorebooks/book-1/link`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ characterId: "char-1", versionId: "version-2" }),
    })
    expect(linked.status).toBe(201)
    expect(await linked.json()).toEqual(characterVersion)
    expect(deps.linkLorebook.execute).toHaveBeenCalledWith({
      lorebookId: "book-1",
      characterId: "char-1",
      versionId: "version-2",
    })

    const previewBody = {
      format: "ccv3",
      payload: '{"spec":"lorebook_v3","data":{"entries":[]}}',
    }
    const preview = await fetch(`${baseUrl}/lorebooks/import/preview`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(previewBody),
    })
    expect(preview.status).toBe(200)
    expect(await preview.json()).toEqual({
      matched: false,
      suggestedAction: "new-book",
    })
    expect(deps.importLorebookPreview.execute).toHaveBeenCalledWith(previewBody)

    const importBody = { ...previewBody, action: "new-book" }
    const imported = await fetch(`${baseUrl}/lorebooks/import`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(importBody),
    })
    expect([200, 201]).toContain(imported.status)
    expect(deps.importLorebookStandalone.execute).toHaveBeenCalledWith(
      importBody,
    )

    const exported = await fetch(`${baseUrl}/lorebooks/book-1/export`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ format: "ccv3", versionId: "version-1" }),
    })
    expect(exported.status).toBe(200)
    expect(deps.exportLorebook.executeById).toHaveBeenCalledWith({
      lorebookId: "book-1",
      format: "ccv3",
      versionId: "version-1",
    })
  })

  it("maps the S134 error codes", async () => {
    const deps = buildDeps()
    deps.restoreLorebookVersion.execute.mockRejectedValueOnce(
      new DomainError("LOREBOOK_VERSION_NOT_FOUND", "No version.", 404),
    )
    deps.softDeleteLorebook.execute.mockRejectedValueOnce(
      new DomainError("LOREBOOK_NOT_FOUND", "No book.", 404),
    )
    deps.linkLorebook.execute.mockRejectedValueOnce(
      new DomainError("LOREBOOK_LINK_UNCHANGED", "Already linked.", 409),
    )
    deps.importLorebookStandalone.execute
      .mockRejectedValueOnce(
        new DomainError("IMPORT_ACTION_MISMATCH", "Bad action.", 409),
      )
      .mockRejectedValueOnce(
        new DomainError("IMPORT_STALE_MATCH", "Stale match.", 409),
      )
    deps.importLorebookPreview.execute.mockRejectedValueOnce(
      new DomainError("INVALID_CARD_JSON", "Bad payload.", 400),
    )
    const { baseUrl } = await startServer(deps)
    const jsonHeaders = { "Content-Type": "application/json" }

    const missingVersion = await fetch(
      `${baseUrl}/lorebooks/book-1/versions/version-1/restore`,
      { method: "POST" },
    )
    expect(missingVersion.status).toBe(404)
    expect(await jsonBody(missingVersion)).toMatchObject({
      error: { code: "LOREBOOK_VERSION_NOT_FOUND" },
    })

    const missingBook = await fetch(`${baseUrl}/lorebooks/book-1`, {
      method: "DELETE",
    })
    expect(missingBook.status).toBe(404)
    expect(await jsonBody(missingBook)).toMatchObject({
      error: { code: "LOREBOOK_NOT_FOUND" },
    })

    const unchanged = await fetch(`${baseUrl}/lorebooks/book-1/link`, {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify({ characterId: "char-1" }),
    })
    expect(unchanged.status).toBe(409)
    expect(await jsonBody(unchanged)).toMatchObject({
      error: { code: "LOREBOOK_LINK_UNCHANGED" },
    })

    const mismatch = await fetch(`${baseUrl}/lorebooks/import`, {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify({ format: "ccv3", payload: "{}", action: "reuse" }),
    })
    expect(mismatch.status).toBe(409)
    expect(await jsonBody(mismatch)).toMatchObject({
      error: { code: "IMPORT_ACTION_MISMATCH" },
    })

    const stale = await fetch(`${baseUrl}/lorebooks/import`, {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify({ format: "ccv3", payload: "{}", action: "reuse" }),
    })
    expect(stale.status).toBe(409)
    expect(await jsonBody(stale)).toMatchObject({
      error: { code: "IMPORT_STALE_MATCH" },
    })

    const invalid = await fetch(`${baseUrl}/lorebooks/import/preview`, {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify({ format: "ccv3", payload: "{}" }),
    })
    expect(invalid.status).toBe(400)
    expect(await jsonBody(invalid)).toMatchObject({
      error: { code: "INVALID_CARD_JSON" },
    })
  })
})

describe("server wiring for the lorebooks resource", () => {
  it("mounts the lorebooks router before /characters/:id behind the /api origin guard", () => {
    const serverSource = readFileSync(
      fileURLToPath(new URL("../server.ts", import.meta.url)),
      "utf8",
    )
    const lorebooksMount = serverSource.indexOf("buildLorebooksRouter(")
    const characterMount = serverSource.lastIndexOf(
      "buildCharacterRouter(container)",
    )
    const legacyMount = serverSource.indexOf("buildLorebookRouter(container)")
    const originGuardMount = serverSource.indexOf(
      "buildApiOriginGuard(corsOrigin)",
    )

    expect(lorebooksMount).toBeGreaterThan(-1)
    expect(characterMount).toBeGreaterThan(-1)
    expect(legacyMount).toBeGreaterThan(-1)
    expect(originGuardMount).toBeGreaterThan(-1)
    expect(originGuardMount).toBeLessThan(lorebooksMount)
    expect(lorebooksMount).toBeLessThan(characterMount)
  })

  it("does not add a per-route origin guard to the lorebooks router", () => {
    const routerSource = readFileSync(
      fileURLToPath(new URL("./lorebooks.routes.ts", import.meta.url)),
      "utf8",
    )

    expect(routerSource).not.toContain("buildApiOriginGuard")
  })
})
