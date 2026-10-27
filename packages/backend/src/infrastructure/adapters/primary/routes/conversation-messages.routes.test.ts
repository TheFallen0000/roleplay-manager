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

  const startServer = async (execute: ReturnType<typeof vi.fn>) => {
    const app = express()
    app.use(express.json())
    app.use(
      buildConversationRouter({
        listConversationMessages: { execute },
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
})
