import { describe, it, expect, afterEach } from "vitest"

import {
  clearCachedStatus,
  clearRestartMarker,
  readRestartMarker,
  useUpdatesStore,
  writeRestartMarker,
} from "./updates.store"

const cached = {
  currentVersion: "1.0.0",
  installedVersion: "1.0.0",
  restartRequired: false,
  latestVersion: "2.0.0",
  behind: true,
  commits: ["bbbbbbb feat: something"],
  notes: null,
  canApply: true,
  canRestart: false,
  rollbackTarget: null,
  blockedReason: null,
  checkError: null,
  checkedAt: "2026-10-07T10:00:00.000Z",
  job: null,
}

afterEach(() => {
  localStorage.clear()
  useUpdatesStore.setState({ status: null, checking: false })
})

describe("useUpdatesStore", () => {
  it("arranca sin estado aunque haya caché (SSR-safe)", () => {
    localStorage.setItem("rm_update_status", JSON.stringify(cached))

    expect(useUpdatesStore.getState().status).toBeNull()
  })

  it("hydrateFromCache carga el estado guardado", () => {
    localStorage.setItem("rm_update_status", JSON.stringify(cached))

    useUpdatesStore.getState().hydrateFromCache()

    expect(useUpdatesStore.getState().status).toEqual(cached)
  })

  it("shouldCheck respeta el TTL de una hora", () => {
    expect(useUpdatesStore.getState().shouldCheck()).toBe(true)

    useUpdatesStore.setState({
      status: { ...cached, checkedAt: new Date().toISOString() },
    })
    expect(useUpdatesStore.getState().shouldCheck()).toBe(false)

    useUpdatesStore.setState({
      status: {
        ...cached,
        checkedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      },
    })
    expect(useUpdatesStore.getState().shouldCheck()).toBe(true)
  })

  it("guarda y limpia el marcador de reinicio", () => {
    writeRestartMarker({ from: "1.0.0", to: "2.0.0", kind: "update" })

    expect(readRestartMarker()).toEqual({
      from: "1.0.0",
      to: "2.0.0",
      kind: "update",
    })

    clearRestartMarker()
    expect(readRestartMarker()).toBeNull()
  })

  it("limpia la caché del estado", () => {
    localStorage.setItem("rm_update_status", JSON.stringify(cached))

    clearCachedStatus()

    expect(localStorage.getItem("rm_update_status")).toBeNull()
  })

  it("guarda el aviso por versión", () => {
    expect(useUpdatesStore.getState().wasNotified("2.0.0")).toBe(false)

    useUpdatesStore.getState().markNotified("2.0.0")

    expect(useUpdatesStore.getState().wasNotified("2.0.0")).toBe(true)
    expect(useUpdatesStore.getState().wasNotified("3.0.0")).toBe(false)
  })
})
