import { describe, expect, it } from "vitest"

import { InMemoryPhoneAccessNoticeStore } from "./in-memory-phone-access-notice.adapter"

describe("InMemoryPhoneAccessNoticeStore", () => {
  it("starts empty", () => {
    const store = new InMemoryPhoneAccessNoticeStore()

    expect(store.latest()).toBeNull()
  })

  it("keeps the most recent notice", () => {
    const store = new InMemoryPhoneAccessNoticeStore()
    store.record({ mode: "tailscale", minutes: 15, at: 1_000 })
    store.record({ mode: "lan", minutes: 30, at: 2_000 })

    expect(store.latest()).toEqual({ mode: "lan", minutes: 30, at: 2_000 })
  })
})
