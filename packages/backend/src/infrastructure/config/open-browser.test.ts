import { describe, expect, it, vi } from "vitest"

import { browserCommand, openBrowser } from "./open-browser"

describe("browserCommand", () => {
  it("uses `start` through cmd on Windows (verbatim arguments)", () => {
    expect(browserCommand("http://localhost:3001", "win32")).toEqual({
      command: "cmd.exe",
      args: ["/d", "/s", "/c", 'start "" "http://localhost:3001"'],
      windowsVerbatimArguments: true,
    })
  })

  it("uses `open` on macOS", () => {
    expect(browserCommand("http://localhost:3001", "darwin")).toEqual({
      command: "open",
      args: ["http://localhost:3001"],
    })
  })

  it("uses `xdg-open` on other platforms", () => {
    expect(browserCommand("http://localhost:3001", "linux")).toEqual({
      command: "xdg-open",
      args: ["http://localhost:3001"],
    })
  })
})

describe("openBrowser", () => {
  it("spawns a detached process and ignores its errors", () => {
    const on = vi.fn()
    const unref = vi.fn()
    const spawnImpl = vi.fn(() => ({ on, unref }))
    const onError = vi.fn()

    openBrowser("http://localhost:3001", onError, spawnImpl as never)

    expect(spawnImpl).toHaveBeenCalledWith("cmd.exe", expect.any(Array), {
      detached: true,
      stdio: "ignore",
      windowsVerbatimArguments: true,
    })
    expect(on).toHaveBeenCalledWith("error", onError)
    expect(unref).toHaveBeenCalled()
  })
})
