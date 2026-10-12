import { once } from "node:events"
import { mkdtemp, rm, writeFile } from "node:fs/promises"
import type { Server } from "node:http"
import { tmpdir } from "node:os"
import { join } from "node:path"

import express from "express"
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest"

import { buildErrorHandler } from "../middlewares/error-handler"
import { buildLogsRouter } from "./logs.routes"

const entry = {
  time: "2026-10-12T10:00:00.000Z",
  level: "info",
  message: "request completed",
}

const fakeLogger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  child: vi.fn(() => fakeLogger),
}

describe("logs routes", () => {
  let server: Server | undefined
  let dir: string

  beforeAll(async () => {
    dir = await mkdtemp(join(tmpdir(), "rm-logs-routes-"))
  })

  afterAll(async () => {
    await rm(dir, { recursive: true, force: true })
  })

  afterEach(async () => {
    if (!server) return
    await new Promise<void>((resolve, reject) => {
      server!.close((error) => (error ? reject(error) : resolve()))
    })
    server = undefined
  })

  const start = async (
    deps: Parameters<typeof buildLogsRouter>[0],
  ): Promise<string> => {
    const app = express()
    app.use(buildLogsRouter(deps))
    app.use(buildErrorHandler(fakeLogger as never))
    server = app.listen(0)
    await once(server, "listening")
    const address = server.address()
    if (!address || typeof address === "string") {
      throw new Error("No server port")
    }
    return `http://127.0.0.1:${address.port}`
  }

  const unused = { execute: vi.fn() } as never

  it("returns the recent entries with the parsed query", async () => {
    const execute = vi.fn(async () => [entry])
    const base = await start({
      getRecentLogs: { execute } as never,
      listLogFiles: unused,
    })

    const response = await fetch(`${base}/logs?limit=25&level=warn`)

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ entries: [entry] })
    expect(execute).toHaveBeenCalledWith({ limit: 25, level: "warn" })
  })

  it("uses the default limit and rejects an unknown level", async () => {
    const execute = vi.fn(async () => [])
    const base = await start({
      getRecentLogs: { execute } as never,
      listLogFiles: unused,
    })

    await fetch(`${base}/logs`)
    expect(execute).toHaveBeenCalledWith({ limit: 200, level: undefined })

    const invalid = await fetch(`${base}/logs?level=verbose`)
    expect(invalid.status).toBe(400)
  })

  it("downloads the log files as a text attachment", async () => {
    const file = join(dir, "app.1.log")
    await writeFile(file, "line one\nline two\n", "utf8")
    const base = await start({
      getRecentLogs: unused,
      listLogFiles: { execute: vi.fn(async () => [file]) } as never,
    })

    const response = await fetch(`${base}/logs/download`)

    expect(response.status).toBe(200)
    expect(response.headers.get("content-type")).toContain("text/plain")
    expect(response.headers.get("content-disposition")).toContain("attachment")
    expect(await response.text()).toBe("line one\nline two\n")
  })

  it("returns 404 when there are no log files yet", async () => {
    const base = await start({
      getRecentLogs: unused,
      listLogFiles: { execute: vi.fn(async () => []) } as never,
    })

    const response = await fetch(`${base}/logs/download`)

    expect(response.status).toBe(404)
  })
})
