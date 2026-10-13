import { describe, it, expect, vi, afterEach } from "vitest"

import { getBaseUrl, getCharacterAssetUrl } from "./client"

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe("getBaseUrl", () => {
  it("uses the same origin in the browser (empty base)", () => {
    expect(getBaseUrl()).toBe("")
  })

  it("points directly at the backend during SSR (no window)", () => {
    vi.stubGlobal("window", undefined)

    expect(getBaseUrl()).toBe("http://localhost:3001")
  })

  it("honors PUBLIC_API_URL in both contexts", () => {
    vi.stubEnv("PUBLIC_API_URL", "https://api.example.com")
    expect(getBaseUrl()).toBe("https://api.example.com")

    vi.stubGlobal("window", undefined)
    expect(getBaseUrl()).toBe("https://api.example.com")
  })

  it("uses the runtime PUBLIC_API_URL on the server (packaged app port)", () => {
    vi.stubGlobal("window", undefined)
    process.env.PUBLIC_API_URL = "http://localhost:4321"
    try {
      expect(getBaseUrl()).toBe("http://localhost:4321")
    } finally {
      delete process.env.PUBLIC_API_URL
    }
  })

  // The browser never sees the runtime variable: `import.meta.env.PUBLIC_API_URL`
  // is inlined at build time and `process` does not exist there, so the runtime
  // branch is unreachable outside the server (and is gated by `window`).
})

describe("getCharacterAssetUrl", () => {
  it("builds a relative asset URL so it goes through the same-origin proxy", () => {
    expect(getCharacterAssetUrl("char-1", "asset-1")).toBe(
      "/api/characters/char-1/assets/asset-1",
    )
  })

  it("appends the variant query parameter", () => {
    expect(getCharacterAssetUrl("char-1", "asset-1", "small")).toBe(
      "/api/characters/char-1/assets/asset-1?variant=small",
    )
  })

  it("stays relative even when PUBLIC_API_URL is configured", () => {
    vi.stubEnv("PUBLIC_API_URL", "https://api.example.com")
    expect(getCharacterAssetUrl("char-1", "asset-1", "thumbnail")).toBe(
      "/api/characters/char-1/assets/asset-1?variant=thumbnail",
    )

    // Server context (SSR): the runtime variable must never reach markup.
    vi.stubGlobal("window", undefined)
    process.env.PUBLIC_API_URL = "http://localhost:3001"
    try {
      expect(getCharacterAssetUrl("char-1", "asset-1")).toBe(
        "/api/characters/char-1/assets/asset-1",
      )
    } finally {
      delete process.env.PUBLIC_API_URL
    }
  })
})
