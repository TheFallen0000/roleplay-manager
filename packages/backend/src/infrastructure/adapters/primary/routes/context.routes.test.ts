import { once } from "node:events"
import type { Server } from "node:http"

import express from "express"
import { afterEach, describe, expect, it, vi } from "vitest"

import type { Logger } from "../../../../domain/ports/logger.port"
import { buildErrorHandler } from "../middlewares/error-handler"
import { buildContextRouter } from "./context.routes"

const logger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: vi.fn(),
  child: () => logger,
} as unknown as Logger

const metadata = {
  characterName: "Test",
  characterVersion: 1,
  summaryId: null,
  memoryCount: 0,
  recentMessageCount: 2,
  totalContextMessages: 2,
  totalCharacters: 100,
  systemTokens: 500,
  messageTokens: 100,
  inputTokens: 600,
  outputReserve: 2_048,
  totalTokens: 2_648,
  contextWindow: 8_000,
  contextPercent: 33,
  compactionThreshold: 80,
}

const manifest = {
  version: 1,
  model: "llama3",
  contextWindow: 8_000,
  outputReserve: 2_048,
  estimatedInputTokens: 600,
  estimatedTotalTokens: 2_648,
  compaction: { needed: false, applied: false, threshold: 80 },
  summary: {
    id: null,
    firstMessageId: null,
    lastMessageId: null,
    messagesAfter: 2,
  },
  memories: { total: 0, included: 0, excluded: 0 },
  messages: { afterSummary: 2, pending: 0, excluded: 0, total: 2 },
  sections: [
    {
      id: "character",
      source: "system",
      tokens: 500,
      characters: 1_500,
      included: true,
      reason: "character",
    },
  ],
}

const context = {
  systemPrompt: "You are Test.",
  messages: [
    { role: "user", content: "Hello" },
    { role: "assistant", content: "Hi" },
  ],
  metadata,
  manifest,
}

const buildDeps = () => ({
  getPromptContext: {
    execute: vi.fn(async () => context),
  },
})

describe("context routes", () => {
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
    app.use(buildContextRouter(deps as never))
    app.use(buildErrorHandler(logger))
    server = app.listen(0)
    await once(server, "listening")
    const address = server.address()
    if (!address || typeof address === "string") {
      throw new Error("No server port")
    }
    return { baseUrl: `http://127.0.0.1:${address.port}`, deps }
  }

  it("exposes the manifest on GET /context", async () => {
    const { baseUrl } = await startServer()

    const response = await fetch(`${baseUrl}/conversations/conv-1/context`)
    const body = (await response.json()) as typeof context

    expect(response.status).toBe(200)
    expect(body.systemPrompt).toBe("You are Test.")
    expect(body.messages).toHaveLength(2)
    expect(body.metadata).toEqual(metadata)
    expect(body.manifest).toEqual(manifest)
  })

  it("keeps GET /context/stats to the metadata shape only", async () => {
    const { baseUrl } = await startServer()

    const response = await fetch(
      `${baseUrl}/conversations/conv-1/context/stats`
    )
    const body = (await response.json()) as Record<string, unknown>

    expect(response.status).toBe(200)
    expect(body).toEqual(metadata)
    expect(body).not.toHaveProperty("systemPrompt")
    expect(body).not.toHaveProperty("messages")
    expect(body).not.toHaveProperty("manifest")
  })

  it("passes the pending message and locale to the use case", async () => {
    const { baseUrl, deps } = await startServer()

    await fetch(
      `${baseUrl}/conversations/conv-1/context?pendingMessage=Hello%20pending`,
      { headers: { "Accept-Language": "es-ES,es;q=0.9" } }
    )

    expect(deps.getPromptContext.execute).toHaveBeenCalledWith(
      "conv-1",
      "Hello pending",
      "es"
    )
  })
})
