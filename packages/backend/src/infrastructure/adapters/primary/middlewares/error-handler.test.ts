import { once } from "node:events"
import type { Server } from "node:http"

import express from "express"
import { afterEach, describe, expect, it, vi } from "vitest"

import { buildErrorHandler } from "./error-handler"

const logger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  child: vi.fn(),
}

describe("error handler", () => {
  let server: Server | undefined

  afterEach(async () => {
    if (!server) return
    await new Promise<void>((resolve, reject) => {
      server!.close((error) => (error ? reject(error) : resolve()))
    })
    server = undefined
  })

  const start = async (
    configure: (app: express.Express) => void,
  ): Promise<string> => {
    const app = express()
    configure(app)
    app.use(buildErrorHandler(logger as never))
    server = app.listen(0)
    await once(server, "listening")
    const address = server.address()
    if (!address || typeof address === "string") {
      throw new Error("No server port")
    }
    return `http://127.0.0.1:${address.port}`
  }

  it("maps malformed JSON to 400", async () => {
    const base = await start((app) => {
      app.use(express.json())
      app.post("/echo", (_req, res) => {
        res.json({ ok: true })
      })
    })

    const response = await fetch(`${base}/echo`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{bad json",
    })

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({
      error: {
        code: "INVALID_JSON",
        message: "The request body is not valid JSON.",
      },
    })
    expect(logger.warn).toHaveBeenCalledWith("Request failed with client error", {
      status: 400,
      code: "INVALID_JSON",
    })
  })

  it("maps an oversized JSON body to 413", async () => {
    const base = await start((app) => {
      app.use(express.json({ limit: "10b" }))
      app.post("/echo", (_req, res) => {
        res.json({ ok: true })
      })
    })

    const response = await fetch(`${base}/echo`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ value: "x".repeat(100) }),
    })

    expect(response.status).toBe(413)
    expect(await response.json()).toEqual({
      error: {
        code: "PAYLOAD_TOO_LARGE",
        message: "The request body is too large.",
      },
    })
  })

  it("keeps generic 500s opaque", async () => {
    const base = await start((app) => {
      app.get("/boom", () => {
        throw new Error("secret detail")
      })
    })

    const response = await fetch(`${base}/boom`)

    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred.",
      },
    })
  })
})
