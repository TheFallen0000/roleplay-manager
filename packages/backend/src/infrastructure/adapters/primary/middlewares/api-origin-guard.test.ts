import { once } from "node:events"
import type { Server } from "node:http"

import express from "express"
import { afterEach, describe, expect, it, vi } from "vitest"

import { buildApiOriginGuard } from "./api-origin-guard"
import { buildErrorHandler } from "./error-handler"

const logger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  child: vi.fn(),
}

describe("API origin guard", () => {
  let server: Server | undefined

  afterEach(async () => {
    if (!server) return
    await new Promise<void>((resolve, reject) => {
      server!.close((error) => (error ? reject(error) : resolve()))
    })
    server = undefined
  })

  const start = async (
    corsOrigin = "http://localhost:4321",
  ): Promise<string> => {
    const app = express()
    app.use("/api", buildApiOriginGuard(corsOrigin))
    app.use(express.json())
    app.post("/api/echo", (_req, res) => {
      res.json({ ok: true })
    })
    app.get("/api/echo", (_req, res) => {
      res.json({ ok: true })
    })
    app.use(buildErrorHandler(logger as never))
    server = app.listen(0)
    await once(server, "listening")
    const address = server.address()
    if (!address || typeof address === "string") {
      throw new Error("No server port")
    }
    return `http://127.0.0.1:${address.port}`
  }

  it("allows a same-origin POST", async () => {
    const base = await start()

    const response = await fetch(`${base}/api/echo`, {
      method: "POST",
      headers: { origin: base, "content-type": "application/json" },
      body: "{}",
    })

    expect(response.status).toBe(200)
  })

  it("allows the configured development origin", async () => {
    const base = await start()

    const response = await fetch(`${base}/api/echo`, {
      method: "POST",
      headers: {
        origin: "http://localhost:4321",
        "content-type": "application/json",
      },
      body: "{}",
    })

    expect(response.status).toBe(200)
  })

  it("rejects a cross-origin POST", async () => {
    const base = await start()

    const response = await fetch(`${base}/api/echo`, {
      method: "POST",
      headers: {
        origin: "https://evil.example",
        "content-type": "application/json",
      },
      body: "{}",
    })

    expect(response.status).toBe(403)
    expect(await response.json()).toEqual({
      error: {
        code: "CROSS_ORIGIN_REQUEST",
        message: "Cross-origin request rejected.",
      },
    })
  })

  it("rejects a cross-site simple POST without Origin", async () => {
    const base = await start()

    const response = await fetch(`${base}/api/echo`, {
      method: "POST",
      headers: {
        "sec-fetch-site": "cross-site",
        "content-type": "application/x-www-form-urlencoded",
      },
      body: "x=1",
    })

    expect(response.status).toBe(403)
  })

  it("rejects a same-site POST without Origin", async () => {
    const base = await start()

    const response = await fetch(`${base}/api/echo`, {
      method: "POST",
      headers: { "sec-fetch-site": "same-site" },
    })

    expect(response.status).toBe(403)
  })

  it("allows cross-origin GET requests (the guard only covers mutations)", async () => {
    const base = await start()

    const response = await fetch(`${base}/api/echo`, {
      headers: { origin: "https://evil.example" },
    })

    expect(response.status).toBe(200)
  })

  it("allows non-browser clients without Origin or Sec-Fetch-Site", async () => {
    const base = await start()

    const response = await fetch(`${base}/api/echo`, { method: "POST" })

    expect(response.status).toBe(200)
  })

  it("allows a proxy-forwarded host with a matching Origin", async () => {
    const base = await start()

    const response = await fetch(`${base}/api/echo`, {
      method: "POST",
      headers: {
        "x-forwarded-host": "machine.tailnet.ts.net",
        origin: "https://machine.tailnet.ts.net",
        "content-type": "application/json",
      },
      body: "{}",
    })

    expect(response.status).toBe(200)
  })

  it("rejects a spoofed proxy-forwarded host", async () => {
    const base = await start()

    const response = await fetch(`${base}/api/echo`, {
      method: "POST",
      headers: {
        "x-forwarded-host": "machine.tailnet.ts.net",
        origin: "https://evil.example",
        "content-type": "application/json",
      },
      body: "{}",
    })

    expect(response.status).toBe(403)
  })

  it("rejects a null Origin", async () => {
    const base = await start()

    const response = await fetch(`${base}/api/echo`, {
      method: "POST",
      headers: { origin: "null" },
    })

    expect(response.status).toBe(403)
  })

  it("rejects a spoofed same-origin Sec-Fetch-Site with a foreign Origin", async () => {
    const base = await start()

    const response = await fetch(`${base}/api/echo`, {
      method: "POST",
      headers: {
        origin: "https://evil.example",
        "sec-fetch-site": "same-origin",
        "content-type": "application/json",
      },
      body: "{}",
    })

    expect(response.status).toBe(403)
  })
})
