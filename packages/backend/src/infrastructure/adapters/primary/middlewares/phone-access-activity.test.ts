import { once } from "node:events"
import { request as httpRequest, type Server } from "node:http"

import express from "express"
import { afterEach, describe, expect, it, vi } from "vitest"

import type { PhoneAccessActivity } from "../../../../domain/ports/phone-access-activity"
import { buildPhoneAccessActivityMiddleware } from "./phone-access-activity"

describe("phone-access activity middleware", () => {
  let server: Server | undefined

  afterEach(async () => {
    if (!server) return
    await new Promise<void>((resolve, reject) => {
      server!.close((error) => (error ? reject(error) : resolve()))
    })
    server = undefined
  })

  const start = async (activity: PhoneAccessActivity): Promise<number> => {
    const app = express()
    app.use(buildPhoneAccessActivityMiddleware(activity))
    app.get("/ping", (_req, res) => res.json({ ok: true }))
    server = app.listen(0)
    await once(server, "listening")
    const address = server.address()
    if (!address || typeof address === "string") {
      throw new Error("No server port")
    }
    return address.port
  }

  const buildActivity = (): PhoneAccessActivity => ({
    touch: vi.fn(),
    lastActivityAt: vi.fn(() => 0),
  })

  const ping = (
    port: number,
    headers: Record<string, string> = {},
  ): Promise<void> =>
    new Promise((resolve, reject) => {
      const request = httpRequest(
        { host: "127.0.0.1", port, path: "/ping", headers },
        (response) => {
          response.resume()
          response.on("end", () => resolve())
        },
      )
      request.on("error", reject)
      request.end()
    })

  it("counts requests coming through Tailscale (*.ts.net host)", async () => {
    const activity = buildActivity()
    const port = await start(activity)

    await ping(port, { host: "desktop.tailnet-abc.ts.net" })

    expect(activity.touch).toHaveBeenCalledWith("tailscale")
  })

  it("counts requests marked by the LAN proxy", async () => {
    const activity = buildActivity()
    const port = await start(activity)

    await ping(port, { host: "192.168.1.10:4322", "x-rm-lan-access": "1" })

    expect(activity.touch).toHaveBeenCalledWith("lan")
  })

  it("ignores local requests (the PC's browser)", async () => {
    const activity = buildActivity()
    const port = await start(activity)

    await ping(port, { host: "localhost:4321" })

    expect(activity.touch).not.toHaveBeenCalled()
  })

  it("prefers the explicit LAN marker when both signals are present", async () => {
    const activity = buildActivity()
    const port = await start(activity)

    await ping(port, {
      host: "desktop.tailnet-abc.ts.net",
      "x-rm-lan-access": "1",
    })

    expect(activity.touch).toHaveBeenCalledWith("lan")
  })
})
