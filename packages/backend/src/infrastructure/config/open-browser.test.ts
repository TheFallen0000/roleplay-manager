import { describe, expect, it, vi } from "vitest"

import { browserCommand, browserUrlToOpen, openBrowser } from "./open-browser"

describe("browserUrlToOpen", () => {
  it("returns the URL when only RM_OPEN_BROWSER is set", () => {
    expect(browserUrlToOpen({ RM_OPEN_BROWSER: "http://localhost:3001" })).toBe(
      "http://localhost:3001",
    )
  })

  it("returns undefined when RM_NO_BROWSER is set, even with RM_OPEN_BROWSER", () => {
    expect(
      browserUrlToOpen({
        RM_OPEN_BROWSER: "http://localhost:3001",
        RM_NO_BROWSER: "1",
      }),
    ).toBeUndefined()
  })

  it("returns undefined when nothing is set", () => {
    expect(browserUrlToOpen({})).toBeUndefined()
  })

  it("treats an empty RM_OPEN_BROWSER as nothing to open", () => {
    expect(browserUrlToOpen({ RM_OPEN_BROWSER: "" })).toBeUndefined()
  })
})

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
    const expectedCommand =
      process.platform === "win32"
        ? "cmd.exe"
        : process.platform === "darwin"
          ? "open"
          : "xdg-open"

    openBrowser("http://localhost:3001", onError, spawnImpl as never)

    expect(spawnImpl).toHaveBeenCalledWith(
      expectedCommand,
      expect.any(Array),
      expect.objectContaining({ detached: true, stdio: "ignore" }),
    )
    expect(on).toHaveBeenCalledWith("error", onError)
    expect(unref).toHaveBeenCalled()
  })
})
