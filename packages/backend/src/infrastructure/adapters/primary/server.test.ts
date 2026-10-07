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
