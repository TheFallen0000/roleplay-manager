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

describe("settings template route", () => {
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
      buildCharacterRouter({ applySettingsTemplate: { execute } } as never),
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

  it("applies a valid settings template", async () => {
    const execute = vi.fn(async () => ({ applied: 2, warnings: [] }))
    const baseUrl = await startServer(execute)

    const response = await fetch(
      `${baseUrl}/characters/char-1/settings-imports`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "character-export",
          schemaVersion: 1,
          standaloneSettings: { temperature: 0.5, model: "gpt-4o" },
        }),
      },
    )

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ applied: 2, warnings: [] })
    expect(execute).toHaveBeenCalledWith({
      characterId: "char-1",
      settings: { temperature: 0.5, model: "gpt-4o" },
    })
  })

  it("rejects a payload without a settings template", async () => {
    const execute = vi.fn()
    const baseUrl = await startServer(execute)

    const response = await fetch(
      `${baseUrl}/characters/char-1/settings-imports`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "character-export", schemaVersion: 1 }),
      },
    )

    expect(response.status).toBe(400)
    expect(execute).not.toHaveBeenCalled()
  })
})
