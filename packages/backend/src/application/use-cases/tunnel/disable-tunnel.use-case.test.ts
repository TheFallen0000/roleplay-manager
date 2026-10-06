import { describe, expect, it, vi } from "vitest"

import type { TunnelStatusDTO } from "@workspace/shared/types/tunnel"

import { TunnelNotAvailableError } from "../../../domain/errors"
import type { TunnelController } from "../../../domain/ports/tunnel-controller"
import { DisableTunnelUseCase } from "./disable-tunnel.use-case"

const status: TunnelStatusDTO = {
  available: true,
  connected: true,
  active: true,
  url: "https://desktop.tailnet-abc.ts.net",
}

const buildController = (overrides: Partial<TunnelController> = {}): TunnelController => ({
  getStatus: vi.fn(async () => status),
  enable: vi.fn(async () => ({ ...status, active: true })),
  disable: vi.fn(async () => ({ ...status, active: false })),
  ...overrides,
})

describe("DisableTunnelUseCase", () => {
  it("disables the tunnel and returns the inactive status", async () => {
    const controller = buildController()

    const result = await new DisableTunnelUseCase(controller).execute()

    expect(result.active).toBe(false)
    expect(controller.disable).toHaveBeenCalledTimes(1)
  })

  it("rejects when the tool is not installed", async () => {
    const controller = buildController({
      getStatus: vi.fn(async () => ({ ...status, available: false })),
    })

    await expect(new DisableTunnelUseCase(controller).execute()).rejects.toThrow(
      TunnelNotAvailableError,
    )
    expect(controller.disable).not.toHaveBeenCalled()
  })
})
