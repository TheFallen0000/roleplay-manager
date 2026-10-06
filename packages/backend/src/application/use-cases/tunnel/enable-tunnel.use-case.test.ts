import { describe, expect, it, vi } from "vitest"

import type { TunnelStatusDTO } from "@workspace/shared/types/tunnel"

import {
  TunnelNotAvailableError,
  TunnelNotConnectedError,
} from "../../../domain/errors"
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

describe("EnableTunnelUseCase", () => {
  it("enables the tunnel and returns the active status", async () => {
    const controller = buildController()

    const result = await new EnableTunnelUseCase(controller).execute()

    expect(result.active).toBe(true)
    expect(controller.enable).toHaveBeenCalledTimes(1)
  })

  it("rejects when the tool is not installed", async () => {
    const controller = buildController({
      getStatus: vi.fn(async () => ({ ...status, available: false })),
    })

    await expect(new EnableTunnelUseCase(controller).execute()).rejects.toThrow(
      TunnelNotAvailableError,
    )
    expect(controller.enable).not.toHaveBeenCalled()
  })

  it("rejects when Tailscale is not connected", async () => {
    const controller = buildController({
      getStatus: vi.fn(async () => ({ ...status, connected: false })),
    })

    await expect(new EnableTunnelUseCase(controller).execute()).rejects.toThrow(
      TunnelNotConnectedError,
    )
    expect(controller.enable).not.toHaveBeenCalled()
  })
})
