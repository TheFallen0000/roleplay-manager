import { once } from "node:events"
import type { Server } from "node:http"

import express from "express"
import { afterEach, describe, expect, it, vi } from "vitest"
import { z } from "zod"

import { buildErrorHandler } from "./error-handler"
import { validate } from "./validation"

const logger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  child: vi.fn(),
}

describe("validate middleware", () => {
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
    app.use(express.json())
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

  it("replaces req.query with the parsed value on Express 5", async () => {
    const schema = z.object({ limit: z.coerce.number().int().default(200) })
    const base = await start((app) => {
      app.get("/query", validate(schema, "query"), (req, res) => {
        res.json(req.query)
      })
    })

    const response = await fetch(`${base}/query?limit=25`)

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ limit: 25 })
  })

  it("rejects invalid query values", async () => {
    const schema = z.object({ limit: z.coerce.number().int().min(1) })
    const base = await start((app) => {
      app.get("/query", validate(schema, "query"), (_req, res) => {
        res.json({ ok: true })
      })
    })

    const response = await fetch(`${base}/query?limit=0`)

    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({
      error: { code: "VALIDATION_ERROR" },
    })
  })

  it("keeps body validation working", async () => {
    const schema = z.object({ name: z.string().trim() })
    const base = await start((app) => {
      app.post("/body", validate(schema), (req, res) => {
        res.json(req.body)
      })
    })

    const response = await fetch(`${base}/body`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "  Ada  " }),
    })

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ name: "Ada" })
  })
})
