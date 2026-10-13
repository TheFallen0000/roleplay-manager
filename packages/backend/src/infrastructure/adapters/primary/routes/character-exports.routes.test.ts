import { once } from "node:events"
import type { Server } from "node:http"

import express from "express"
import { afterEach, describe, expect, it, vi } from "vitest"

import { ALL_EXPORT_SECTIONS } from "@workspace/shared/types/export"

import type { Logger } from "../../../../domain/ports/logger.port"
import { buildErrorHandler } from "../middlewares/error-handler"
import { buildCharacterRouter } from "./character.routes"

const logger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
} as unknown as Logger

describe("character export route", () => {
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
    app.use(buildCharacterRouter({ exportCharacter: { execute } } as never))
    app.use(buildErrorHandler(logger))
    server = app.listen(0)
    await once(server, "listening")
    const address = server.address()
    if (!address || typeof address === "string") {
      throw new Error("No server port")
    }
    return `http://127.0.0.1:${address.port}`
  }

  it("accepts every section declared in the shared list", async () => {
    const execute = vi.fn(async () => ({
      schemaVersion: 1,
      kind: "character-export",
    }))
    const baseUrl = await startServer(execute)

    const response = await fetch(`${baseUrl}/characters/char-1/exports`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sections: ALL_EXPORT_SECTIONS,
        includeProfileImageBase64: false,
      }),
    })

    expect(response.status).toBe(200)
    expect(execute).toHaveBeenCalledWith({
      characterId: "char-1",
      sections: [...ALL_EXPORT_SECTIONS],
      includeProfileImageBase64: false,
    })
  })

  it("rejects unknown sections with a validation error", async () => {
    const execute = vi.fn()
    const baseUrl = await startServer(execute)

    const response = await fetch(`${baseUrl}/characters/char-1/exports`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sections: ["nope"] }),
    })

    expect(response.status).toBe(400)
    const body = (await response.json()) as { error: { code: string } }
    expect(body.error.code).toBe("VALIDATION_ERROR")
    expect(execute).not.toHaveBeenCalled()
  })
})
