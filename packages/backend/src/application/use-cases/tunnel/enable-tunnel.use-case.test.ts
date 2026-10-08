import { describe, expect, it, vi } from "vitest"

import type { TunnelStatusDTO } from "@workspace/shared/types/tunnel"

import {
  TunnelNotAvailableError,
  TunnelNotConnectedError,
} from "../../../domain/errors"
import type { PhoneAccessActivity } from "../../../domain/ports/phone-access-activity"
import type { TunnelController } from "../../../domain/ports/tunnel-controller"
import { EnableTunnelUseCase } from "./enable-tunnel.use-case"

const status: TunnelStatusDTO = {
  available: true,
  connected: true,
  active: false,
  url: "https://desktop.tailnet-abc.ts.net",
}

const buildController = (overrides: Partial<TunnelController> = {}): TunnelController => ({
  getStatus: vi.fn(async () => status),
  enable: vi.fn(async () => ({ ...status, active: true })),
  disable: vi.fn(async () => ({ ...status, active: false })),
  ...overrides,
})

const buildActivity = (): PhoneAccessActivity => ({
  touch: vi.fn(),
  lastActivityAt: vi.fn(() => 0),
})

describe("EnableTunnelUseCase", () => {
  it("enables the tunnel, counts it as use and returns the active status", async () => {
    const controller = buildController()
    const activity = buildActivity()

    const result = await new EnableTunnelUseCase(controller, activity).execute()

    expect(result.active).toBe(true)
    expect(controller.enable).toHaveBeenCalledTimes(1)
    expect(activity.touch).toHaveBeenCalledWith("tailscale")
  })

  it("rejects when the tool is not installed", async () => {
    const controller = buildController({
      getStatus: vi.fn(async () => ({ ...status, available: false })),
    })

    await expect(
      new EnableTunnelUseCase(controller, buildActivity()).execute(),
    ).rejects.toThrow(TunnelNotAvailableError)
    expect(controller.enable).not.toHaveBeenCalled()
  })

  it("rejects when Tailscale is not connected", async () => {
    const controller = buildController({
      getStatus: vi.fn(async () => ({ ...status, connected: false })),
    })

    await expect(
      new EnableTunnelUseCase(controller, buildActivity()).execute(),
    ).rejects.toThrow(TunnelNotConnectedError)
    expect(controller.enable).not.toHaveBeenCalled()
  })
})
