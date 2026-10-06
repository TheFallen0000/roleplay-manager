import { once } from "node:events"
import { createServer, type Server } from "node:http"

import { afterEach, describe, expect, it, vi } from "vitest"

import { LanPortInUseError } from "../../../../domain/errors"

vi.mock("node:os", () => ({
  networkInterfaces: () => ({
    "Wi-Fi": [
      { address: "192.168.1.10", family: "IPv4", internal: false },
      { address: "fe80::1", family: "IPv6", internal: false },
    ],
    Ethernet: [{ address: "10.0.0.5", family: "IPv4", internal: false }],
    Tailscale: [{ address: "100.100.1.2", family: "IPv4", internal: false }],
    "vEthernet (WSL)": [
      { address: "172.20.0.1", family: "IPv4", internal: false },
    ],
    "Conexión de área local* 2": [
      { address: "192.168.137.1", family: "IPv4", internal: false },
    ],
    Loopback: [{ address: "127.0.0.1", family: "IPv4", internal: true }],
  }),
}))

import {
  LanProxyServerAdapter,
  listPrivateAddresses,
} from "./lan-proxy-server.adapter"

const servers: Server[] = []

afterEach(async () => {
  await Promise.all(
    servers.splice(0).map(
      (server) =>
        new Promise<void>((resolve) => server.close(() => resolve())),
    ),
  )
})

const startTarget = async (): Promise<{
  port: number
  seenHosts: string[]
}> => {
  const seenHosts: string[] = []
  const server = createServer((request, response) => {
    seenHosts.push(request.headers.host ?? "")
    if (request.url === "/hello") {
      response.writeHead(200, { "content-type": "text/plain" })
      response.end("world")
      return
    }
    if (request.url === "/echo" && request.method === "POST") {
      const chunks: Buffer[] = []
      request.on("data", (chunk: Buffer) => chunks.push(chunk))
      request.on("end", () => {
        response.writeHead(200, { "content-type": "application/json" })
        response.end(
          JSON.stringify({
            body: Buffer.concat(chunks).toString("utf8"),
            contentType: request.headers["content-type"] ?? null,
          }),
        )
      })
      return
    }
    response.writeHead(404, { "content-type": "application/json" })
    response.end(JSON.stringify({ error: { code: "NOT_FOUND" } }))
  })
  server.listen(0, "127.0.0.1")
  await once(server, "listening")
  servers.push(server)
  const address = server.address()
  const port = typeof address === "object" && address ? address.port : 0
  return { port, seenHosts }
}

const buildAdapter = (targetPort: number, port = 0) =>
  new LanProxyServerAdapter({
    targetUrl: `http://127.0.0.1:${targetPort}`,
    port,
    listAddresses: () => ["192.168.1.10"],
  })

describe("listPrivateAddresses", () => {
  it("keeps private LAN addresses, skips CGNAT, virtual and internal ones", () => {
    expect(listPrivateAddresses()).toEqual(["192.168.1.10", "10.0.0.5"])
  })
})

describe("LanProxyServerAdapter", () => {
  it("starts inactive and reports the candidate addresses", async () => {
    const status = await buildAdapter(1).getStatus()

    expect(status.active).toBe(false)
    expect(status.addresses).toEqual(["192.168.1.10"])
  })

  it("proxies requests to the app keeping the original Host", async () => {
    const target = await startTarget()
    const adapter = buildAdapter(target.port)

    const status = await adapter.enable()
    expect(status.active).toBe(true)
    expect(status.port).toBeGreaterThan(0)

    const response = await fetch(`http://127.0.0.1:${status.port}/hello`)
    expect(response.status).toBe(200)
    expect(await response.text()).toBe("world")
    expect(target.seenHosts).toContain(`127.0.0.1:${status.port}`)
  })

  it("forwards POST bodies and content types", async () => {
    const target = await startTarget()
    const adapter = buildAdapter(target.port)
    const status = await adapter.enable()

    const response = await fetch(`http://127.0.0.1:${status.port}/echo`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ hello: "world" }),
    })

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      body: JSON.stringify({ hello: "world" }),
      contentType: "application/json",
    })
  })

  it("passes upstream errors through", async () => {
    const target = await startTarget()
    const adapter = buildAdapter(target.port)
    const status = await adapter.enable()

    const response = await fetch(`http://127.0.0.1:${status.port}/missing`)

    expect(response.status).toBe(404)
    expect(await response.json()).toEqual({ error: { code: "NOT_FOUND" } })
  })

  it("stops listening after disable", async () => {
    const target = await startTarget()
    const adapter = buildAdapter(target.port)
    const status = await adapter.enable()

    const disabled = await adapter.disable()
    expect(disabled.active).toBe(false)

    await expect(
      fetch(`http://127.0.0.1:${status.port}/hello`),
    ).rejects.toThrow()
  })

  it("is idempotent when enabling and disabling", async () => {
    const target = await startTarget()
    const adapter = buildAdapter(target.port)

    const first = await adapter.enable()
    const second = await adapter.enable()
    expect(second.port).toBe(first.port)

    await adapter.disable()
    const again = await adapter.disable()
    expect(again.active).toBe(false)
  })

  it("rejects with LanPortInUseError when the port is taken", async () => {
    const busy = createServer()
    busy.listen(0, "0.0.0.0")
    await once(busy, "listening")
    servers.push(busy)
    const address = busy.address()
    const busyPort = typeof address === "object" && address ? address.port : 0

    const adapter = buildAdapter(1, busyPort)

    await expect(adapter.enable()).rejects.toThrow(LanPortInUseError)
  })
})
