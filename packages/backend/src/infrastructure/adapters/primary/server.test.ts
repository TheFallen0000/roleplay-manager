import { once } from "node:events"
import type { Server } from "node:http"
import { mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

import pino from "pino"
import { afterEach, describe, expect, it, vi } from "vitest"

import { buildServer, type WebHandler } from "./server"

const fakeLogger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  child: vi.fn(() => fakeLogger),
}

describe("buildServer with a web handler", () => {
  let server: Server | undefined

  afterEach(async () => {
    if (!server) return
    await new Promise<void>((resolve, reject) => {
      server!.close((error) => (error ? reject(error) : resolve()))
    })
    server = undefined
  })

  const start = async (
    webHandler?: WebHandler,
    clientDir?: string,
  ): Promise<string> => {
    const app = buildServer({
      container: {
        logger: fakeLogger,
        pino: pino({ level: "silent" }),
      } as never,
      corsOrigin: "http://localhost:4321",
      webHandler,
      clientDir,
    })
    server = app.listen(0)
    await once(server, "listening")
    const address = server.address()
    if (!address || typeof address === "string") {
      throw new Error("No server port")
    }
    return `http://127.0.0.1:${address.port}`
  }

  it("serves non-API requests through the web handler", async () => {
    const webHandler = vi.fn((_req, res) => {
      res.status(200).send("<html>app</html>")
    })
    const base = await start(webHandler as unknown as WebHandler)

    const response = await fetch(`${base}/characters/abc`)

    expect(response.status).toBe(200)
    expect(await response.text()).toBe("<html>app</html>")
    expect(webHandler).toHaveBeenCalledTimes(1)
  })

  it("keeps /api routes ahead of the web handler", async () => {
    const webHandler = vi.fn((_req, res) => {
      res.status(200).send("web")
    })
    const base = await start(webHandler as unknown as WebHandler)

    // The stub container has no health use case, so the API route errors; the
    // point is that the web handler is never reached.
    const response = await fetch(`${base}/api/health`)

    expect(response.status).toBe(500)
    expect(webHandler).not.toHaveBeenCalled()
  })

  it("returns 404 for non-API requests when there is no web handler", async () => {
    const base = await start()

    const response = await fetch(`${base}/characters/abc`)

    expect(response.status).toBe(404)
  })

  it("sets security headers and keeps API responses out of caches", async () => {
    const webHandler = vi.fn((_req, res) => {
      res.status(200).send("<html>app</html>")
    })
    const base = await start(webHandler as unknown as WebHandler)

    const page = await fetch(`${base}/characters/abc`)
    expect(page.headers.get("x-powered-by")).toBeNull()
    expect(page.headers.get("x-content-type-options")).toBe("nosniff")
    expect(page.headers.get("x-frame-options")).toBe("DENY")
    expect(page.headers.get("referrer-policy")).toBe("no-referrer")
    expect(page.headers.get("permissions-policy")).toContain("camera=()")
    expect(page.headers.get("content-security-policy")).toContain(
      "frame-ancestors 'none'",
    )

    const api = await fetch(`${base}/api/health`)
    expect(api.headers.get("cache-control")).toBe("no-store")
  })

  it("rejects cross-origin state-changing API requests", async () => {
    const base = await start()

    const response = await fetch(`${base}/api/updates/backup`, {
      method: "POST",
      headers: {
        origin: "https://evil.example",
        "content-type": "application/x-www-form-urlencoded",
      },
    })

    expect(response.status).toBe(403)
    expect(await response.json()).toEqual({
      error: {
        code: "CROSS_ORIGIN_REQUEST",
        message: "Cross-origin request rejected.",
      },
    })
  })

  it("returns JSON 404 for unknown API routes", async () => {
    const base = await start()

    const response = await fetch(`${base}/api/not-a-route`)

    expect(response.status).toBe(404)
    expect(await response.json()).toEqual({
      error: {
        code: "NOT_FOUND",
        message: "API route not found.",
      },
    })
  })

  it("serves the frontend static build from clientDir", async () => {
    const dir = await mkdtemp(join(tmpdir(), "rm-client-"))
    try {
      await writeFile(join(dir, "app.js"), "console.log('app')")
      const base = await start(undefined, dir)

      const response = await fetch(`${base}/app.js`)

      expect(response.status).toBe(200)
      expect(await response.text()).toBe("console.log('app')")
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })
})
