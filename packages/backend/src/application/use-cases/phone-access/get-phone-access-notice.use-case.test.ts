import { describe, expect, it } from "vitest"

import { GetPhoneAccessNoticeUseCase } from "./get-phone-access-notice.use-case"
import type { PhoneAccessNoticeStore } from "../../../domain/ports/phone-access-notice"

const buildStore = (
  notice: { mode: "tailscale" | "lan"; minutes: number; at: number } | null,
): PhoneAccessNoticeStore => ({
  record: () => {},
  latest: () => notice,
})

describe("GetPhoneAccessNoticeUseCase", () => {
  it("returns null when the watchdog has not disabled anything", () => {
    const useCase = new GetPhoneAccessNoticeUseCase(buildStore(null))

    expect(useCase.execute()).toBeNull()
  })

  it("serializes the latest notice as an ISO timestamp", () => {
    const useCase = new GetPhoneAccessNoticeUseCase(
      buildStore({
        mode: "tailscale",
        minutes: 30,
        at: new Date("2026-10-27T12:00:00.000Z").getTime(),
      }),
    )

    expect(useCase.execute()).toEqual({
      mode: "tailscale",
      minutes: 30,
      at: "2026-10-27T12:00:00.000Z",
    })
  })
})
