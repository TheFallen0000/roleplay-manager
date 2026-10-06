import { describe, expect, it, vi } from "vitest"

import type { TunnelStatusDTO } from "@workspace/shared/types/tunnel"

import type { TunnelController } from "../../../domain/ports/tunnel-controller"
import { GetTunnelStatusUseCase } from "./get-tunnel-status.use-case"

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

describe("GetTunnelStatusUseCase", () => {
  it("returns the controller status as-is", async () => {
    const controller = buildController()

    const result = await new GetTunnelStatusUseCase(controller).execute()

    expect(result).toEqual(status)
    expect(controller.getStatus).toHaveBeenCalledTimes(1)
  })
})
