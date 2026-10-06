import { describe, it, expect, afterEach } from "vitest"

import { useTunnelStore } from "./tunnel.store"

const cachedTunnel = {
  available: true,
  connected: true,
  active: true,
  url: "https://desktop.tailnet-abc.ts.net",
}

const cachedLan = {
  active: true,
  port: 4322,
  addresses: ["192.168.1.10"],
}

afterEach(() => {
  localStorage.clear()
  useTunnelStore.setState({ status: null, lanStatus: null })
})

describe("useTunnelStore", () => {
  it("arranca sin estados aunque haya caché (evita el mismatch de hidratación)", () => {
    localStorage.setItem("rm_tunnel_status", JSON.stringify(cachedTunnel))
    localStorage.setItem("rm_lan_status", JSON.stringify(cachedLan))

    expect(useTunnelStore.getState().status).toBeNull()
    expect(useTunnelStore.getState().lanStatus).toBeNull()
  })

  it("hydrateFromCache carga ambos estados guardados", () => {
    localStorage.setItem("rm_tunnel_status", JSON.stringify(cachedTunnel))
    localStorage.setItem("rm_lan_status", JSON.stringify(cachedLan))

    useTunnelStore.getState().hydrateFromCache()

    expect(useTunnelStore.getState().status).toEqual(cachedTunnel)
    expect(useTunnelStore.getState().lanStatus).toEqual(cachedLan)
  })

  it("hydrateFromCache no cambia nada si no hay caché", () => {
    useTunnelStore.getState().hydrateFromCache()

    expect(useTunnelStore.getState().status).toBeNull()
    expect(useTunnelStore.getState().lanStatus).toBeNull()
  })
})
