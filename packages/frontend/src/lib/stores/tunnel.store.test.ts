import { describe, it, expect, afterEach } from "vitest"

import { useTunnelStore } from "./tunnel.store"

const cached = {
  available: true,
  connected: true,
  active: true,
  url: "https://desktop.tailnet-abc.ts.net",
}

afterEach(() => {
  localStorage.clear()
  useTunnelStore.setState({ status: null })
})

describe("useTunnelStore", () => {
  it("arranca sin estado aunque haya caché (evita el mismatch de hidratación)", () => {
    localStorage.setItem("rm_tunnel_status", JSON.stringify(cached))

    expect(useTunnelStore.getState().status).toBeNull()
  })

  it("hydrateFromCache carga el estado guardado", () => {
    localStorage.setItem("rm_tunnel_status", JSON.stringify(cached))

    useTunnelStore.getState().hydrateFromCache()

    expect(useTunnelStore.getState().status).toEqual(cached)
  })

  it("hydrateFromCache no cambia nada si no hay caché", () => {
    useTunnelStore.getState().hydrateFromCache()

    expect(useTunnelStore.getState().status).toBeNull()
  })
})
