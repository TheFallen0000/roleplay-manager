import { describe, expect, it } from "vitest"

import { InMemoryPhoneAccessActivity } from "./in-memory-phone-access-activity.adapter"

describe("InMemoryPhoneAccessActivity", () => {
  it("tracks each mode independently", () => {
    let now = 1_000
    const activity = new InMemoryPhoneAccessActivity({ now: () => now })

    now = 2_000
    activity.touch("lan")

    expect(activity.lastActivityAt("lan")).toBe(2_000)
    expect(activity.lastActivityAt("tailscale")).toBe(2_000)
  })

  it("reports now for a mode that was never used", () => {
    let now = 5_000
    const activity = new InMemoryPhoneAccessActivity({ now: () => now })

    expect(activity.lastActivityAt("tailscale")).toBe(5_000)

    now = 9_000
    expect(activity.lastActivityAt("tailscale")).toBe(9_000)
  })
})
