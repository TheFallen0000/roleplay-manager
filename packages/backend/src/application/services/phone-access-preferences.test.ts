import { describe, expect, it, vi } from "vitest"

import type { SettingsRepository } from "../../domain/ports/settings.repository"
import {
  readPhoneAccessPreferences,
  updatePhoneAccessPreferences,
} from "./phone-access-preferences"

const DEFAULTS = {
  tailscale: {
    autoEnableOnStart: false,
    disableOnClose: true,
    idleDisableMinutes: null,
  },
  lan: { autoEnableOnStart: false, idleDisableMinutes: null },
}

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

describe("readPhoneAccessPreferences", () => {
  it("returns the defaults when nothing is stored", async () => {
    expect(await readPhoneAccessPreferences(buildSettings())).toEqual(DEFAULTS)
  })

  it("reads stored values of both modes", async () => {
    const settings = buildSettings({
      "phone-access.tailscale": JSON.stringify({
        autoEnableOnStart: true,
        disableOnClose: false,
        idleDisableMinutes: 60,
      }),
      "phone-access.lan": JSON.stringify({
        autoEnableOnStart: true,
        idleDisableMinutes: 15,
      }),
    })

    expect(await readPhoneAccessPreferences(settings)).toEqual({
      tailscale: {
        autoEnableOnStart: true,
        disableOnClose: false,
        idleDisableMinutes: 60,
      },
      lan: { autoEnableOnStart: true, idleDisableMinutes: 15 },
    })
  })

  it("falls back to defaults for corrupt or invalid values", async () => {
    const settings = buildSettings({
      "phone-access.tailscale": "{ not json",
      "phone-access.lan": JSON.stringify({
        autoEnableOnStart: "yes",
        idleDisableMinutes: 7,
      }),
    })

    expect(await readPhoneAccessPreferences(settings)).toEqual(DEFAULTS)
  })
})

describe("updatePhoneAccessPreferences", () => {
  it("patches one mode and keeps the other untouched", async () => {
    const settings = buildSettings()

    const result = await updatePhoneAccessPreferences(settings, "lan", {
      autoEnableOnStart: true,
      idleDisableMinutes: 30,
    })

    expect(result.lan).toEqual({
      autoEnableOnStart: true,
      idleDisableMinutes: 30,
    })
    expect(result.tailscale).toEqual(DEFAULTS.tailscale)
    expect(await readPhoneAccessPreferences(settings)).toEqual(result)
  })

  it("keeps the fields a partial patch does not mention", async () => {
    const settings = buildSettings({
      "phone-access.tailscale": JSON.stringify({
        autoEnableOnStart: false,
        disableOnClose: true,
        idleDisableMinutes: 60,
      }),
    })

    const result = await updatePhoneAccessPreferences(settings, "tailscale", {
      autoEnableOnStart: true,
    })

    expect(result.tailscale).toEqual({
      autoEnableOnStart: true,
      disableOnClose: true,
      idleDisableMinutes: 60,
    })
  })

  it("ignores tunnel-only fields on the LAN mode", async () => {
    const settings = buildSettings()

    const result = await updatePhoneAccessPreferences(settings, "lan", {
      disableOnClose: true,
    })

    expect(result.lan).toEqual(DEFAULTS.lan)
    expect(await readPhoneAccessPreferences(settings)).toEqual(result)
  })

  it("can turn the idle watchdog off with null", async () => {
    const settings = buildSettings({
      "phone-access.lan": JSON.stringify({
        autoEnableOnStart: false,
        idleDisableMinutes: 60,
      }),
    })

    const result = await updatePhoneAccessPreferences(settings, "lan", {
      idleDisableMinutes: null,
    })

    expect(result.lan.idleDisableMinutes).toBeNull()
  })
})
