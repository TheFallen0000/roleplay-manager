import { describe, it, expect, vi, afterEach } from "vitest"

import { getBaseUrl, getCharacterAssetUrl, getPublicBaseUrl } from "./client"

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
})

describe("getPublicBaseUrl", () => {
  it("stays relative during SSR so embedded URLs resolve against the page origin", () => {
    vi.stubGlobal("window", undefined)

    expect(getPublicBaseUrl()).toBe("")
  })

  it("honors PUBLIC_API_URL", () => {
    vi.stubEnv("PUBLIC_API_URL", "https://api.example.com")

    expect(getPublicBaseUrl()).toBe("https://api.example.com")
  })
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
})
