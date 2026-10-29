import { once } from "node:events"
import type { Server } from "node:http"

import express from "express"
import { afterEach, describe, expect, it, vi } from "vitest"

import type { Logger } from "../../../../domain/ports/logger.port"
import { buildErrorHandler } from "../middlewares/error-handler"
import { buildConversationRouter } from "./conversation.routes"

const logger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
} as unknown as Logger

describe("conversation messages route", () => {
  let server: Server | undefined

  afterEach(async () => {
    if (!server) return
    await new Promise<void>((resolve, reject) => {
      server!.close((error) => (error ? reject(error) : resolve()))
    })
    server = undefined
  })

  const startServer = async (
    execute: ReturnType<typeof vi.fn>,
    extra: Record<string, unknown> = {},
  ) => {
    const app = express()
    app.use(express.json())
    app.use(
      buildConversationRouter({
        listConversationMessages: { execute },
        logger,
        ...extra,
      } as never),
    )
    app.use(buildErrorHandler(logger))
    server = app.listen(0)
    await once(server, "listening")
    const address = server.address()
    if (!address || typeof address === "string") {
      throw new Error("No server port")
    }
    return `http://127.0.0.1:${address.port}`
  }

  it("passes the cursor and limit to the use case", async () => {
    const execute = vi.fn(async () => ({
      messages: [],
      hasMore: false,
      nextCursor: null,
    }))
    const baseUrl = await startServer(execute)

    const response = await fetch(
      `${baseUrl}/conversations/conv-1/messages?before=10&limit=5`,
    )

    expect(response.status).toBe(200)
    expect(execute).toHaveBeenCalledWith("conv-1", { before: 10, limit: 5 })
  })

  it("rejects an invalid limit", async () => {
    const execute = vi.fn()
    const baseUrl = await startServer(execute)

    const response = await fetch(
      `${baseUrl}/conversations/conv-1/messages?limit=0`,
    )

    expect(response.status).toBe(400)
    expect(execute).not.toHaveBeenCalled()
  })

  it("serializes compaction events before the chunks", async () => {
    const execute = vi.fn(async function* () {
      yield { type: "compacting" }
      yield {
        type: "context-warning",
        warning: {
          code: "SUMMARY_FAILED_TRIMMED",
          message: "Old messages were trimmed.",
        },
      }
      yield {
        type: "done",
        message: {
          id: "msg-1",
          conversationId: "conv-1",
          role: "assistant",
          content: "Hi",
          position: 1,
          alternatives: [],
          alternativesCursor: 0,
          createdAt: "2026-10-28T00:00:00.000Z",
          editedAt: null,
        },
      }
    })
    const baseUrl = await startServer(vi.fn(), {
      sendMessage: { execute },
    })

    const response = await fetch(`${baseUrl}/conversations/conv-1/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: "Hello" }),
    })
    const text = await response.text()

    expect(response.status).toBe(200)
    expect(text).toContain("event: compacting")
    expect(text).toContain("event: context-warning")
    expect(text).toContain("SUMMARY_FAILED_TRIMMED")
    expect(text).toContain("event: done")
  })

  it("wraps the continue done message in the shared envelope", async () => {
    const execute = vi.fn(async function* () {
      yield {
        type: "done",
        message: {
          id: "msg-2",
          conversationId: "conv-1",
          role: "assistant",
          content: "Hi",
          position: 2,
          alternatives: [],
          alternativesCursor: 0,
          createdAt: "2026-10-28T00:00:00.000Z",
          editedAt: null,
        },
      }
    })
    const baseUrl = await startServer(vi.fn(), {
      continueConversation: { execute },
    })

    const response = await fetch(`${baseUrl}/conversations/conv-1/continue`, {
      method: "POST",
    })
    const text = await response.text()

    expect(response.status).toBe(200)
    expect(text).toContain('data: {"message":{"id":"msg-2"')
  })
})
