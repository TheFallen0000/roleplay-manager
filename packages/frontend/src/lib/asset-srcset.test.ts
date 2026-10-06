import { describe, it, expect } from "vitest"

import { createAssetSrcSet } from "./asset-srcset"

describe("createAssetSrcSet", () => {
  it("builds profile candidates capped by the original width", () => {
    const srcSet = createAssetSrcSet("char-1", "asset-1", 1200, "profile")

    expect(srcSet).toContain("variant=thumbnail 128w")
    expect(srcSet).toContain("variant=small 384w")
    expect(srcSet).toContain("variant=medium 768w")
    expect(srcSet).not.toContain("variant=large")
  })

  it("builds background candidates and dedupes equal widths", () => {
    const srcSet = createAssetSrcSet("char-1", "asset-1", 500, "background")

    expect(srcSet).toContain("variant=small 384w")
    expect(srcSet).toContain("variant=medium 500w")
    expect(srcSet).not.toContain("variant=large")
    expect(srcSet.split(", ")).toHaveLength(2)
  })

  it("includes the large candidate for big backgrounds", () => {
    const srcSet = createAssetSrcSet("char-1", "asset-1", 3000, "background")

    expect(srcSet).toContain("variant=large 1920w")
  })
})
