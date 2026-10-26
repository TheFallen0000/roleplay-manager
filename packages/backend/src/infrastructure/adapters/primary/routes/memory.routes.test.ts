import { once } from "node:events"
import type { Server } from "node:http"

import express from "express"
import { afterEach, describe, expect, it, vi } from "vitest"

import type { Logger } from "../../../../domain/ports/logger.port"
import { NotFoundError } from "../../../../domain/errors"
import { buildErrorHandler } from "../middlewares/error-handler"
import { buildMemoryRouter } from "./memory.routes"

const logger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
  child: () => logger,
} as unknown as Logger

const buildDeps = () => ({
  listMemories: { execute: vi.fn(async () => []) },
  createMemory: { execute: vi.fn(async () => ({ id: "mem-1" })) },
  updateMemory: { execute: vi.fn(async () => ({ id: "mem-1" })) },
  deleteMemory: { execute: vi.fn(async () => undefined) },
  listProposals: { execute: vi.fn(async () => []) },
  applyMemoryChanges: { execute: vi.fn(async () => []) },
  applyAllMemoryChanges: { execute: vi.fn(async () => []) },
  decayMemories: { execute: vi.fn(async () => ({ decayed: 0, deleted: 0 })) },
})

describe("memory routes", () => {
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
    app.use(express.json())
    app.use(buildMemoryRouter(deps as never))
    app.use(buildErrorHandler(logger))
    server = app.listen(0)
    await once(server, "listening")
    const address = server.address()
    if (!address || typeof address === "string") {
      throw new Error("No server port")
    }
    return { baseUrl: `http://127.0.0.1:${address.port}`, deps }
  }

  it("lists the memories of a conversation", async () => {
    const { baseUrl, deps } = await startServer()

    const response = await fetch(`${baseUrl}/conversations/conv-1/memories`)

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual([])
    expect(deps.listMemories.execute).toHaveBeenCalledWith("conv-1")
  })

  it("creates a memory and returns 201", async () => {
    const { baseUrl, deps } = await startServer()

    const response = await fetch(`${baseUrl}/conversations/conv-1/memories`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        actor: "Lyra",
        title: "Trusts Kael",
        description: "She has started to trust him.",
        priority: 8,
      }),
    })

    expect(response.status).toBe(201)
    expect(deps.createMemory.execute).toHaveBeenCalledWith("conv-1", {
      actor: "Lyra",
      title: "Trusts Kael",
      description: "She has started to trust him.",
      priority: 8,
    })
  })

  it("rejects a memory with an out-of-range priority", async () => {
    const { baseUrl, deps } = await startServer()

    const response = await fetch(`${baseUrl}/conversations/conv-1/memories`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        actor: "Lyra",
        title: "Trusts Kael",
        description: "She has started to trust him.",
        priority: 11,
      }),
    })

    expect(response.status).toBe(400)
    expect(deps.createMemory.execute).not.toHaveBeenCalled()
  })

  it("updates a memory", async () => {
    const { baseUrl, deps } = await startServer()

    const response = await fetch(
      `${baseUrl}/conversations/conv-1/memories/mem-1`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "New title" }),
      },
    )

    expect(response.status).toBe(200)
    expect(deps.updateMemory.execute).toHaveBeenCalledWith("conv-1", "mem-1", {
      title: "New title",
    })
  })

  it("maps a missing memory to 404", async () => {
    const deps = buildDeps()
    deps.updateMemory.execute.mockRejectedValueOnce(
      new NotFoundError("MEMORY_NOT_FOUND", "Memory with id 'missing' not found."),
    )
    const { baseUrl } = await startServer(deps)

    const response = await fetch(
      `${baseUrl}/conversations/conv-1/memories/missing`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "New title" }),
      },
    )

    expect(response.status).toBe(404)
    expect(await response.json()).toMatchObject({
      error: { code: "MEMORY_NOT_FOUND" },
    })
  })

  it("deletes a memory and returns 204", async () => {
    const { baseUrl, deps } = await startServer()

    const response = await fetch(
      `${baseUrl}/conversations/conv-1/memories/mem-1`,
      { method: "DELETE" },
    )

    expect(response.status).toBe(204)
    expect(deps.deleteMemory.execute).toHaveBeenCalledWith("conv-1", "mem-1")
  })

  it("lists the pending proposals", async () => {
    const { baseUrl, deps } = await startServer()

    const response = await fetch(
      `${baseUrl}/conversations/conv-1/memories/proposals`,
    )

    expect(response.status).toBe(200)
    expect(deps.listProposals.execute).toHaveBeenCalledWith("conv-1")
  })

  it("applies the selected proposals", async () => {
    const { baseUrl, deps } = await startServer()

    const response = await fetch(
      `${baseUrl}/conversations/conv-1/memories/proposals/apply`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decisions: [{ proposalId: "proposal-1", action: "apply" }],
        }),
      },
    )

    expect(response.status).toBe(200)
    expect(deps.applyMemoryChanges.execute).toHaveBeenCalledWith({
      conversationId: "conv-1",
      decisions: [{ proposalId: "proposal-1", action: "apply" }],
    })
  })

  it("rejects an invalid proposal action", async () => {
    const { baseUrl, deps } = await startServer()

    const response = await fetch(
      `${baseUrl}/conversations/conv-1/memories/proposals/apply`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decisions: [{ proposalId: "proposal-1", action: "delete" }],
        }),
      },
    )

    expect(response.status).toBe(400)
    expect(deps.applyMemoryChanges.execute).not.toHaveBeenCalled()
  })

  it("applies all pending proposals as the user", async () => {
    const { baseUrl, deps } = await startServer()

    const response = await fetch(
      `${baseUrl}/conversations/conv-1/memories/proposals/apply-all`,
      { method: "POST" },
    )

    expect(response.status).toBe(200)
    expect(deps.applyAllMemoryChanges.execute).toHaveBeenCalledWith({
      conversationId: "conv-1",
      processedBy: "user",
    })
  })

  it("runs a manual decay sweep", async () => {
    const { baseUrl, deps } = await startServer()

    const response = await fetch(
      `${baseUrl}/conversations/conv-1/memories/decay`,
      { method: "POST" },
    )

    expect(response.status).toBe(200)
    expect(deps.decayMemories.execute).toHaveBeenCalledWith({
      conversationId: "conv-1",
      manual: true,
    })
  })
})
