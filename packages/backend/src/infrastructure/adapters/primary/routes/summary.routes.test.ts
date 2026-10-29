import { once } from "node:events"
import type { Server } from "node:http"

import express from "express"
import { afterEach, describe, expect, it, vi } from "vitest"

import type { Logger } from "../../../../domain/ports/logger.port"
import { buildErrorHandler } from "../middlewares/error-handler"
import { buildSummaryRouter } from "./summary.routes"

const logger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: vi.fn(),
  child: () => logger,
} as unknown as Logger

const summary = {
  id: "sum-1",
  conversationId: "conv-1",
  content: "Summary",
  firstMessageId: "msg-1",
  lastMessageId: "msg-2",
  model: null,
  provider: null,
  createdAt: "2026-10-26T12:00:00.000Z",
  editedAt: null,
}

const buildDeps = () => ({
  listSummaries: { execute: vi.fn(async () => []) },
  compactConversation: { execute: vi.fn(async () => ({ summary })) },
  updateSummary: { execute: vi.fn(async () => summary) },
  deleteSummary: { execute: vi.fn(async () => undefined) },
  generateConversationTitle: {
    execute: vi.fn(async () => ({ title: "New title", titleSource: "auto" })),
  },
  logger,
})

describe("summary routes", () => {
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
    app.use(buildSummaryRouter(deps as never))
    app.use(buildErrorHandler(logger))
    server = app.listen(0)
    await once(server, "listening")
    const address = server.address()
    if (!address || typeof address === "string") {
      throw new Error("No server port")
    }
    return { baseUrl: `http://127.0.0.1:${address.port}`, deps }
  }

  it("regenerates the title after a manual summary and returns both", async () => {
    const { baseUrl, deps } = await startServer()

    const response = await fetch(
      `${baseUrl}/conversations/conv-1/summaries/generate`,
      {
        method: "POST",
        headers: { "Accept-Language": "en-US,en;q=0.9" },
      },
    )

    expect(response.status).toBe(201)
    expect(await response.json()).toEqual({
      summary,
      title: "New title",
      titleSource: "auto",
    })
    expect(deps.generateConversationTitle.execute).toHaveBeenCalledWith(
      "conv-1",
      { locale: "en" },
    )
    expect(deps.compactConversation.execute).toHaveBeenCalledWith(
      "conv-1",
      "en",
    )
  })

  it("returns the summary even if the title cannot be generated", async () => {
    const deps = buildDeps()
    deps.generateConversationTitle.execute.mockRejectedValueOnce(
      new Error("provider down"),
    )
    const { baseUrl } = await startServer(deps)

    const response = await fetch(
      `${baseUrl}/conversations/conv-1/summaries/generate`,
      { method: "POST" },
    )

    expect(response.status).toBe(201)
    expect(await response.json()).toEqual({ summary })
    expect(logger.error).toHaveBeenCalledWith(
      "Failed to generate conversation title after manual summary",
      expect.any(Error),
      { conversationId: "conv-1" },
    )
  })

  it("does not generate a title when the summary has no new messages", async () => {
    const deps = buildDeps()
    deps.compactConversation.execute.mockResolvedValueOnce({
      error: { code: "NO_NEW_MESSAGES", message: "No new messages" },
    } as never)
    const { baseUrl } = await startServer(deps)

    const response = await fetch(
      `${baseUrl}/conversations/conv-1/summaries/generate`,
      { method: "POST" },
    )

    expect(response.status).toBe(400)
    expect(deps.generateConversationTitle.execute).not.toHaveBeenCalled()
  })
})
