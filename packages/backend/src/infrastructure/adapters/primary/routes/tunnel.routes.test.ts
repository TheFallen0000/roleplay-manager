import { once } from "node:events"
import type { Server } from "node:http"

import express from "express"
import { afterEach, describe, expect, it, vi } from "vitest"

import { TunnelNotConnectedError } from "../../../../domain/errors"
import { buildErrorHandler } from "../middlewares/error-handler"
import { buildTunnelRouter } from "./tunnel.routes"

const status = {
  available: true,
  connected: true,
  active: true,
  url: "https://desktop.tailnet-abc.ts.net",
}

const fakeLogger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  child: vi.fn(() => fakeLogger),
}

describe("tunnel routes", () => {
  let server: Server | undefined

  afterEach(async () => {
    if (!server) return
    await new Promise<void>((resolve, reject) => {
      server!.close((error) => (error ? reject(error) : resolve()))
    })
    server = undefined
  })

  const start = async (
    deps: Parameters<typeof buildTunnelRouter>[0],
  ): Promise<string> => {
    const app = express()
    app.use(buildTunnelRouter(deps))
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

  it("returns the tunnel status", async () => {
    const execute = vi.fn(async () => status)
    const base = await start({
      getTunnelStatus: { execute } as never,
      enableTunnel: unused,
      disableTunnel: unused,
    })

    const response = await fetch(`${base}/tunnel`)

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual(status)
    expect(execute).toHaveBeenCalledTimes(1)
  })

  it("enables the tunnel", async () => {
    const execute = vi.fn(async () => status)
    const base = await start({
      getTunnelStatus: unused,
      enableTunnel: { execute } as never,
      disableTunnel: unused,
    })

    const response = await fetch(`${base}/tunnel/enable`, { method: "POST" })

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual(status)
    expect(execute).toHaveBeenCalledTimes(1)
  })

  it("disables the tunnel", async () => {
    const execute = vi.fn(async () => ({ ...status, active: false }))
    const base = await start({
      getTunnelStatus: unused,
      enableTunnel: unused,
      disableTunnel: { execute } as never,
    })

    const response = await fetch(`${base}/tunnel/disable`, { method: "POST" })

    expect(response.status).toBe(200)
    expect((await response.json()) as { active: boolean }).toMatchObject({
      active: false,
    })
  })

  it("maps a not-connected error to 409 with its code", async () => {
    const execute = vi.fn(async () => {
      throw new TunnelNotConnectedError()
    })
    const base = await start({
      getTunnelStatus: unused,
      enableTunnel: { execute } as never,
      disableTunnel: unused,
    })

    const response = await fetch(`${base}/tunnel/enable`, { method: "POST" })

    expect(response.status).toBe(409)
    expect(await response.json()).toEqual({
      error: {
        code: "TUNNEL_NOT_CONNECTED",
        message: "Tailscale is not running or is signed out on this machine.",
      },
    })
  })
})
