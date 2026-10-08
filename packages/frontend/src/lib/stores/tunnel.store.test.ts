import { describe, it, expect, afterEach, vi } from "vitest"

import { useTunnelStore } from "./tunnel.store"

const mocks = vi.hoisted(() => ({
  getPhoneAccessPreferences: vi.fn(),
  updatePhoneAccessPreferences: vi.fn(),
}))

vi.mock("@/lib/api/phone-access", () => ({
  getPhoneAccessPreferences: mocks.getPhoneAccessPreferences,
  updatePhoneAccessPreferences: mocks.updatePhoneAccessPreferences,
}))

const preferences = {
  tailscale: {
    autoEnableOnStart: false,
    disableOnClose: true,
    idleDisableMinutes: null,
  },
  lan: { autoEnableOnStart: false, idleDisableMinutes: null },
}

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
  vi.clearAllMocks()
  useTunnelStore.setState({ status: null, lanStatus: null, preferences: null })
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

  it("refreshPreferences guarda los ajustes de ambos modos", async () => {
    mocks.getPhoneAccessPreferences.mockResolvedValue(preferences)

    const result = await useTunnelStore.getState().refreshPreferences()

    expect(result).toEqual(preferences)
    expect(useTunnelStore.getState().preferences).toEqual(preferences)
  })

  it("updatePreferences envía el parche y guarda la respuesta", async () => {
    const updated = {
      ...preferences,
      tailscale: { ...preferences.tailscale, autoEnableOnStart: true },
    }
    mocks.updatePhoneAccessPreferences.mockResolvedValue(updated)

    await useTunnelStore
      .getState()
      .updatePreferences({ mode: "tailscale", autoEnableOnStart: true })

    expect(mocks.updatePhoneAccessPreferences).toHaveBeenCalledWith({
      mode: "tailscale",
      autoEnableOnStart: true,
    })
    expect(useTunnelStore.getState().preferences).toEqual(updated)
  })

  it("los ajustes no se guardan en localStorage", async () => {
    mocks.getPhoneAccessPreferences.mockResolvedValue(preferences)

    await useTunnelStore.getState().refreshPreferences()

    expect(localStorage.getItem("rm_phone_access_preferences")).toBeNull()
  })
})
