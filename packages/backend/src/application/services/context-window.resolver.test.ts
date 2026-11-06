import { describe, expect, it } from "vitest"

import { resolveEffectiveWindow } from "@workspace/shared/lib/context-window"

describe("resolveEffectiveWindow", () => {
  it("uses a positive working window as a net budget", () => {
    expect(
      resolveEffectiveWindow({
        contextWindow: 8_192,
        workingWindow: 5_735,
        maxTokens: 2_048,
      }),
    ).toEqual({ window: 5_735, outputReserve: 0, net: true })

    expect(
      resolveEffectiveWindow({
        contextWindow: 8_192,
        workingWindow: 128,
        maxTokens: 2_048,
      }),
    ).toEqual({ window: 128, outputReserve: 0, net: true })
  })

  it("falls back to the raw window when the working window is not usable", () => {
    const cases = [null, undefined, 0, -5, Number.NaN, 8_000, 9_000]

    for (const workingWindow of cases) {
      expect(
        resolveEffectiveWindow({
          contextWindow: 8_192,
          workingWindow,
          maxTokens: 2_048,
        }),
      ).toEqual({ window: 8_192, outputReserve: 2_048, net: false })
    }
  })

  it("returns a null window when there is no positive context window", () => {
    expect(
      resolveEffectiveWindow({
        contextWindow: null,
        workingWindow: 5_735,
        maxTokens: 2_048,
      }),
    ).toEqual({ window: null, outputReserve: 2_048, net: false })

    expect(
      resolveEffectiveWindow({
        contextWindow: 0,
        workingWindow: 5_735,
        maxTokens: 2_048,
      }),
    ).toEqual({ window: null, outputReserve: 2_048, net: false })
  })
})
