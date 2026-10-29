import { describe, expect, it } from "vitest"

import {
  clampContextWindow,
  clampOutputTokens,
  MAX_CONTEXT_WINDOW,
  MAX_OUTPUT_TOKENS,
} from "@workspace/shared/lib/inference"

describe("inference limits", () => {
  it("clamps output tokens to the supported range", () => {
    expect(clampOutputTokens(0)).toBe(1)
    expect(clampOutputTokens(2_048)).toBe(2_048)
    expect(clampOutputTokens(Number.NaN)).toBe(1)
    expect(clampOutputTokens(MAX_OUTPUT_TOKENS + 1)).toBe(MAX_OUTPUT_TOKENS)
  })

  it("clamps the context window and keeps null", () => {
    expect(clampContextWindow(null)).toBeNull()
    expect(clampContextWindow(undefined)).toBeNull()
    expect(clampContextWindow(Number.NaN)).toBeNull()
    expect(clampContextWindow(0)).toBe(1)
    expect(clampContextWindow(32_768)).toBe(32_768)
    expect(clampContextWindow(MAX_CONTEXT_WINDOW + 1)).toBe(MAX_CONTEXT_WINDOW)
  })
})
