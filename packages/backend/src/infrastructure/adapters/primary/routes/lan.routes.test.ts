import { once } from "node:events"
import type { Server } from "node:http"

import express from "express"
import { afterEach, describe, expect, it, vi } from "vitest"

import { LanPortInUseError } from "../../../../domain/errors"
import { buildErrorHandler } from "../middlewares/error-handler"
import { buildLanRouter } from "./lan.routes"

const status = {
  active: true,
  port: 4322,
  addresses: ["192.168.1.10"],
}

const fakeLogger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  child: vi.fn(() => fakeLogger),
}

describe("lan routes", () => {
  let server: Server | undefined

  afterEach(async () => {
    if (!server) return
    await new Promise<void>((resolve, reject) => {
      server!.close((error) => (error ? reject(error) : resolve()))
    })
    server = undefined
  })

  const start = async (
    deps: Parameters<typeof buildLanRouter>[0],
  ): Promise<string> => {
    const app = express()
    app.use(buildLanRouter(deps))
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

  it("returns the LAN status", async () => {
    const execute = vi.fn(async () => status)
    const base = await start({
      getLanStatus: { execute } as never,
      enableLanAccess: unused,
      disableLanAccess: unused,
    })

    const response = await fetch(`${base}/lan`)

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual(status)
  })

  it("enables and disables LAN access", async () => {
    const enable = vi.fn(async () => status)
    const disable = vi.fn(async () => ({ ...status, active: false }))
    const base = await start({
      getLanStatus: unused,
      enableLanAccess: { execute: enable } as never,
      disableLanAccess: { execute: disable } as never,
    })

    const enableResponse = await fetch(`${base}/lan/enable`, {
      method: "POST",
    })
    expect(enableResponse.status).toBe(200)
    expect(await enableResponse.json()).toEqual(status)

    const disableResponse = await fetch(`${base}/lan/disable`, {
      method: "POST",
    })
    expect(disableResponse.status).toBe(200)
    expect((await disableResponse.json()) as { active: boolean }).toMatchObject({
      active: false,
    })
  })

  it("maps a busy port error to 409 with its code", async () => {
    const execute = vi.fn(async () => {
      throw new LanPortInUseError(4322)
    })
    const base = await start({
      getLanStatus: unused,
      enableLanAccess: { execute } as never,
      disableLanAccess: unused,
    })

    const response = await fetch(`${base}/lan/enable`, { method: "POST" })

    expect(response.status).toBe(409)
    expect(await response.json()).toEqual({
      error: {
        code: "LAN_PORT_IN_USE",
        message: "Port 4322 is already in use.",
      },
    })
  })
})
