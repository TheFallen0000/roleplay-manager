import { once } from "node:events"
import type { Server } from "node:http"

import express from "express"
import { afterEach, describe, expect, it, vi } from "vitest"

import type { Logger } from "../../../../domain/ports/logger.port"
import { buildErrorHandler } from "../middlewares/error-handler"
import { buildCharacterRouter } from "./character.routes"

const logger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
} as unknown as Logger

describe("POST /characters with a standalone lorebook", () => {
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
    app.use(buildCharacterRouter({ createCharacter: { execute } } as never))
    app.use(buildErrorHandler(logger))
    server = app.listen(0)
    await once(server, "listening")
    const address = server.address()
    if (!address || typeof address === "string") throw new Error("No port")
    return `http://127.0.0.1:${address.port}`
  }

  it("passes CreateCharacterInput.lorebook to the use case", async () => {
    const execute = vi.fn(async () => ({ id: "char-1", name: "Lyra" }))
    const baseUrl = await startServer(execute)

    const response = await fetch(`${baseUrl}/characters`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Lyra",
        description: "A guardian of the forest.",
        greeting: "Hello!",
        lorebook: {
          format: "ccv3",
          payload: '{"spec":"lorebook_v3","data":{"entries":[]}}',
        },
      }),
    })

    expect(response.status).toBe(201)
    expect(execute).toHaveBeenCalledWith(
      expect.objectContaining({
        lorebook: {
          format: "ccv3",
          payload: '{"spec":"lorebook_v3","data":{"entries":[]}}',
        },
      })
    )
  })

  it("rejects an unknown lorebook format", async () => {
    const execute = vi.fn()
    const baseUrl = await startServer(execute)

    const response = await fetch(`${baseUrl}/characters`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Lyra",
        description: "A guardian of the forest.",
        greeting: "Hello!",
        lorebook: { format: "v9", payload: "{}" },
      }),
    })

    expect(response.status).toBe(400)
    expect(execute).not.toHaveBeenCalled()
  })
})
