import { describe, expect, it } from "vitest"

import { formatTokenCount } from "./format-token-count"

describe("formatTokenCount", () => {
  it("keeps small values as-is", () => {
    expect(formatTokenCount(0)).toBe("0")
    expect(formatTokenCount(999, "es")).toBe("999")
  })

  it("uses compact units", () => {
    expect(formatTokenCount(1_000, "en")).toBe("1k")
    expect(formatTokenCount(1_234, "en")).toBe("1.2k")
    expect(formatTokenCount(32_768, "en")).toBe("32.8k")
    expect(formatTokenCount(131_072, "en")).toBe("131k")
    expect(formatTokenCount(1_500_000, "en")).toBe("1.5M")
  })

  it("rounds fractions for large values", () => {
    expect(formatTokenCount(999_999, "en")).toBe("1M")
  })
})
