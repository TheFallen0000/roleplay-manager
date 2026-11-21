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

describe("conversation create route — alternate greeting", () => {
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
        createConversation: { execute },
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

  it("forwards greetingIndex to the use case", async () => {
    const execute = vi.fn(async () => ({ conversation: { id: "conv-1" } }))
    const baseUrl = await startServer(execute)

    const response = await fetch(`${baseUrl}/conversations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ characterId: "char-1", greetingIndex: 2 }),
    })

    expect(response.status).toBe(201)
    expect(execute).toHaveBeenCalledWith({
      characterId: "char-1",
      greetingIndex: 2,
    })
  })

  it("rejects a negative or non-integer greetingIndex before the use case", async () => {
    const execute = vi.fn(async () => ({ conversation: { id: "conv-1" } }))
    const baseUrl = await startServer(execute)

    for (const greetingIndex of [-1, 1.5]) {
      const response = await fetch(`${baseUrl}/conversations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ characterId: "char-1", greetingIndex }),
      })

      expect(response.status).toBe(400)
    }
    expect(execute).not.toHaveBeenCalled()
  })
})
