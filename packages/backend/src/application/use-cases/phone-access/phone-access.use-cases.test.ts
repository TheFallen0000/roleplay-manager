import { describe, expect, it, vi } from "vitest"

import type { SettingsRepository } from "../../../domain/ports/settings.repository"
import { GetPhoneAccessPreferencesUseCase } from "./get-phone-access-preferences.use-case"
import { UpdatePhoneAccessPreferencesUseCase } from "./update-phone-access-preferences.use-case"

const buildSettings = (values: Record<string, string> = {}): SettingsRepository => ({
  get: vi.fn(async (key: string) => values[key] ?? null),
  getMany: vi.fn(async (keys: string[]) =>
    Object.fromEntries(keys.map((key) => [key, values[key] ?? null])),
  ),
  set: vi.fn(async (key: string, value: string) => {
    values[key] = value
  }),
  setMany: vi.fn(async (entries: Record<string, string>) => {
    Object.assign(values, entries)
  }),
})

describe("GetPhoneAccessPreferencesUseCase", () => {
  it("returns both modes' preferences", async () => {
    const settings = buildSettings()
    const result = await new GetPhoneAccessPreferencesUseCase(
      settings,
    ).execute()

    expect(result).toEqual({
      tailscale: {
        autoEnableOnStart: false,
        disableOnClose: true,
        idleDisableMinutes: null,
      },
      lan: { autoEnableOnStart: false, idleDisableMinutes: null },
    })
  })
})

describe("UpdatePhoneAccessPreferencesUseCase", () => {
  it("persists the patch and returns the fresh pair", async () => {
    const settings = buildSettings()
    const result = await new UpdatePhoneAccessPreferencesUseCase(
      settings,
    ).execute("tailscale", { autoEnableOnStart: true, idleDisableMinutes: 120 })

    expect(result.tailscale).toEqual({
      autoEnableOnStart: true,
      disableOnClose: true,
      idleDisableMinutes: 120,
    })
    expect(settings.set).toHaveBeenCalledTimes(1)
  })
})
