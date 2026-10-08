import { describe, expect, it, vi } from "vitest"

import type { LanAccessStatusDTO } from "@workspace/shared/types/lan"

import type { LanAccessController } from "../../../domain/ports/lan-access-controller"
import type { PhoneAccessActivity } from "../../../domain/ports/phone-access-activity"
import { DisableLanAccessUseCase } from "./disable-lan-access.use-case"
import { EnableLanAccessUseCase } from "./enable-lan-access.use-case"
import { GetLanStatusUseCase } from "./get-lan-status.use-case"

const status: LanAccessStatusDTO = {
  active: false,
  port: 4322,
  addresses: ["192.168.1.10"],
}

const buildController = (): LanAccessController => ({
  getStatus: vi.fn(async () => status),
  enable: vi.fn(async () => ({ ...status, active: true })),
  disable: vi.fn(async () => ({ ...status, active: false })),
})

const buildActivity = (): PhoneAccessActivity => ({
  touch: vi.fn(),
  lastActivityAt: vi.fn(() => 0),
})

describe("GetLanStatusUseCase", () => {
  it("returns the controller status", async () => {
    const controller = buildController()

    expect(await new GetLanStatusUseCase(controller).execute()).toEqual(status)
  })
})

describe("EnableLanAccessUseCase", () => {
  it("enables the LAN proxy and counts it as use", async () => {
    const controller = buildController()
    const activity = buildActivity()

    const result = await new EnableLanAccessUseCase(
      controller,
      activity,
    ).execute()

    expect(result.active).toBe(true)
    expect(controller.enable).toHaveBeenCalledTimes(1)
    expect(activity.touch).toHaveBeenCalledWith("lan")
  })
})

describe("DisableLanAccessUseCase", () => {
  it("disables the LAN proxy", async () => {
    const controller = buildController()

    const result = await new DisableLanAccessUseCase(controller).execute()

    expect(result.active).toBe(false)
    expect(controller.disable).toHaveBeenCalledTimes(1)
  })
})
