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

describe("conversation settings route", () => {
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
        updateConversationSettings: { execute },
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

  it("pasa el estilo de mensaje y los colores de diálogo al caso de uso", async () => {
    const execute = vi.fn(async () => ({ id: "conv-1" }))
    const baseUrl = await startServer(execute)

    const response = await fetch(`${baseUrl}/conversations/conv-1/settings`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messageStyle: "novel",
        characterDialogueColor: "#7c3aed",
        userDialogueColor: null,
      }),
    })

    expect(response.status).toBe(200)
    expect(execute).toHaveBeenCalledWith("conv-1", {
      messageStyle: "novel",
      characterDialogueColor: "#7c3aed",
      userDialogueColor: null,
    })
  })

  it("rechaza un color de diálogo que no sea #RRGGBB", async () => {
    const execute = vi.fn()
    const baseUrl = await startServer(execute)

    const response = await fetch(`${baseUrl}/conversations/conv-1/settings`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ characterDialogueColor: "violet" }),
    })

    expect(response.status).toBe(400)
    expect(execute).not.toHaveBeenCalled()
  })
})
