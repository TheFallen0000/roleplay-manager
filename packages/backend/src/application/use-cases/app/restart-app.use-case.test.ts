import { describe, expect, it, vi } from "vitest"

import type { AppRestarter } from "../../../domain/ports/app-restarter"
import { RestartAppUseCase } from "./restart-app.use-case"

const buildRestarter = (available: boolean): AppRestarter => ({
  available: vi.fn(() => available),
  restart: vi.fn(),
})

describe("RestartAppUseCase", () => {
  it("restarts the app when the launcher is available", () => {
    const restarter = buildRestarter(true)

    expect(new RestartAppUseCase(restarter).execute()).toEqual({
      restarting: true,
    })
    expect(restarter.restart).toHaveBeenCalledTimes(1)
  })

  it("reports not-available without restarting in development", () => {
    const restarter = buildRestarter(false)

    expect(new RestartAppUseCase(restarter).execute()).toEqual({
      restarting: false,
      reason: "not-available",
    })
    expect(restarter.restart).not.toHaveBeenCalled()
  })
})
