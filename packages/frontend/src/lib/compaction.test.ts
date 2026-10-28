import { describe, expect, it } from "vitest"

import {
  clampCompactionThreshold,
  resolveCompactionTarget,
} from "@workspace/shared/lib/compaction"

describe("compaction thresholds", () => {
  it("clamps the threshold to the supported range", () => {
    expect(clampCompactionThreshold(10)).toBe(50)
    expect(clampCompactionThreshold(80)).toBe(80)
    expect(clampCompactionThreshold(120)).toBe(95)
  })

  it("aims 20 points below the threshold", () => {
    expect(resolveCompactionTarget(80)).toBe(60)
    expect(resolveCompactionTarget(95)).toBe(75)
  })

  it("never targets less than 30%", () => {
    expect(resolveCompactionTarget(50)).toBe(30)
  })
})
