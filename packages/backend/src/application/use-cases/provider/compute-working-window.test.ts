import { describe, expect, it } from "vitest"

import { computeWorkingWindow } from "@workspace/shared/lib/model-capabilities"

describe("computeWorkingWindow", () => {
  it("keeps a normal window ok with the requested reserve and a 5% margin", () => {
    expect(
      computeWorkingWindow({
        contextWindow: 8_192,
        requestedMaxTokens: 2_048,
        modelMaxOutputTokens: 4_096,
      })
    ).toEqual({
      status: "ok",
      contextWindow: 8_192,
      outputReserve: 2_048,
      safetyMargin: 409,
      workingWindow: 5_735,
      warnings: [],
    })
  })

  it("uses the requested reserve when the model max output is unknown", () => {
    expect(
      computeWorkingWindow({
        contextWindow: 4_096,
        requestedMaxTokens: 2_048,
        modelMaxOutputTokens: null,
      })
    ).toEqual({
      status: "ok",
      contextWindow: 4_096,
      outputReserve: 2_048,
      safetyMargin: 204,
      workingWindow: 1_844,
      warnings: [],
    })
  })

  it("clamps the reserve to the model max output and warns", () => {
    expect(
      computeWorkingWindow({
        contextWindow: 8_192,
        requestedMaxTokens: 8_192,
        modelMaxOutputTokens: 2_048,
      })
    ).toEqual({
      status: "ok",
      contextWindow: 8_192,
      outputReserve: 2_048,
      safetyMargin: 409,
      workingWindow: 5_735,
      warnings: ["OUTPUT_RESERVE_CLAMPED"],
    })
  })

  it("reports an unknown window when the context window is null", () => {
    expect(
      computeWorkingWindow({
        contextWindow: null,
        requestedMaxTokens: 2_048,
        modelMaxOutputTokens: 4_096,
      })
    ).toEqual({
      status: "unknown",
      contextWindow: null,
      outputReserve: null,
      safetyMargin: null,
      workingWindow: null,
      warnings: [],
    })
  })

  it("never returns a negative window and marks the configuration infeasible", () => {
    expect(
      computeWorkingWindow({
        contextWindow: 256,
        requestedMaxTokens: 2_048,
        modelMaxOutputTokens: 4_096,
      })
    ).toEqual({
      status: "infeasible",
      contextWindow: 256,
      outputReserve: 2_048,
      safetyMargin: 128,
      workingWindow: 0,
      warnings: ["WORKING_WINDOW_NEGATIVE", "OUTPUT_RESERVE_TOO_LARGE"],
    })
  })

  it("marks a working window below the minimum as degraded", () => {
    expect(
      computeWorkingWindow({
        contextWindow: 2_304,
        requestedMaxTokens: 2_048,
        modelMaxOutputTokens: 4_096,
      })
    ).toEqual({
      status: "degraded",
      contextWindow: 2_304,
      outputReserve: 2_048,
      safetyMargin: 128,
      workingWindow: 128,
      warnings: [],
    })
  })
})
