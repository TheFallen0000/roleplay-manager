import { once } from "node:events"
import type { Server } from "node:http"

import express from "express"
import { afterEach, describe, expect, it, vi } from "vitest"

import { buildErrorHandler } from "../middlewares/error-handler"
import { buildPhoneAccessRouter } from "./phone-access.routes"

const preferences = {
  tailscale: {
    autoEnableOnStart: false,
    disableOnClose: true,
    idleDisableMinutes: null,
  },
  lan: { autoEnableOnStart: false, idleDisableMinutes: null },
}

const fakeLogger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  child: vi.fn(() => fakeLogger),
}

describe("phone-access routes", () => {
  let server: Server | undefined

  afterEach(async () => {
    if (!server) return
    await new Promise<void>((resolve, reject) => {
      server!.close((error) => (error ? reject(error) : resolve()))
    })
    server = undefined
  })

  const start = async (
    deps: Parameters<typeof buildPhoneAccessRouter>[0],
  ): Promise<string> => {
    const app = express()
    app.use(express.json())
    app.use(buildPhoneAccessRouter(deps))
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

  it("returns both modes' preferences", async () => {
    const execute = vi.fn(async () => preferences)
    const base = await start({
      getPhoneAccessPreferences: { execute } as never,
      updatePhoneAccessPreferences: unused,
    })

    const response = await fetch(`${base}/phone-access/preferences`)

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual(preferences)
  })

  it("updates one mode with a partial patch", async () => {
    const execute = vi.fn(async () => preferences)
    const base = await start({
      getPhoneAccessPreferences: unused,
      updatePhoneAccessPreferences: { execute } as never,
    })

    const response = await fetch(`${base}/phone-access/preferences`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ mode: "lan", idleDisableMinutes: 30 }),
    })

    expect(response.status).toBe(200)
    expect(execute).toHaveBeenCalledWith("lan", { idleDisableMinutes: 30 })
  })

  it("rejects an idle value outside the allowed options", async () => {
    const base = await start({
      getPhoneAccessPreferences: unused,
      updatePhoneAccessPreferences: unused,
    })

    const response = await fetch(`${base}/phone-access/preferences`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ mode: "tailscale", idleDisableMinutes: 7 }),
    })

    expect(response.status).toBe(400)
  })

  it("rejects an unknown mode", async () => {
    const base = await start({
      getPhoneAccessPreferences: unused,
      updatePhoneAccessPreferences: unused,
    })

    const response = await fetch(`${base}/phone-access/preferences`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ mode: "other", autoEnableOnStart: true }),
    })

    expect(response.status).toBe(400)
  })
})
