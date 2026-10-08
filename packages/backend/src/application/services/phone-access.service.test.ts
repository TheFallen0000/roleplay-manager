import { describe, expect, it, vi } from "vitest"

import type { PhoneAccessMode } from "@workspace/shared/types/phone-access"

import type { LanAccessController } from "../../domain/ports/lan-access-controller"
import type { PhoneAccessActivity } from "../../domain/ports/phone-access-activity"
import type { SettingsRepository } from "../../domain/ports/settings.repository"
import type { TunnelController } from "../../domain/ports/tunnel-controller"
import { PhoneAccessService } from "./phone-access.service"

const fakeLogger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  child: vi.fn(() => fakeLogger),
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

const buildActivity = (
  last: Record<PhoneAccessMode, number> = { tailscale: 0, lan: 0 },
): PhoneAccessActivity => ({
  touch: vi.fn((mode: PhoneAccessMode) => {
    last[mode] = 0
  }),
  lastActivityAt: vi.fn((mode: PhoneAccessMode) => last[mode]),
})

const buildTunnel = (
  overrides: Partial<TunnelController> = {},
): TunnelController => ({
  getStatus: vi.fn(async () => ({
    available: true,
    connected: true,
    active: false,
    url: "https://desktop.tailnet-abc.ts.net",
  })),
  enable: vi.fn(async () => ({
    available: true,
    connected: true,
    active: true,
    url: "https://desktop.tailnet-abc.ts.net",
  })),
  disable: vi.fn(async () => ({
    available: true,
    connected: true,
    active: false,
    url: null,
  })),
  ...overrides,
})

const buildLan = (
  overrides: Partial<LanAccessController> = {},
): LanAccessController => ({
  getStatus: vi.fn(async () => ({ active: false, port: 4322, addresses: [] })),
  enable: vi.fn(async () => ({ active: true, port: 4322, addresses: [] })),
  disable: vi.fn(async () => ({ active: false, port: 4322, addresses: [] })),
  ...overrides,
})

const buildService = (options: {
  settings?: SettingsRepository
  tunnel?: TunnelController
  lan?: LanAccessController
  activity?: PhoneAccessActivity
  packaged?: boolean
  now?: () => number
} = {}) =>
  new PhoneAccessService({
    settings: options.settings ?? buildSettings(),
    tunnel: options.tunnel ?? buildTunnel(),
    lan: options.lan ?? buildLan(),
    activity: options.activity ?? buildActivity(),
    logger: fakeLogger as never,
    packaged: options.packaged ?? true,
    now: options.now ?? (() => 0),
  })

describe("PhoneAccessService.applyOnStartup", () => {
  it("does nothing outside the packaged app", async () => {
    const tunnel = buildTunnel()
    const lan = buildLan()

    await buildService({
      packaged: false,
      tunnel,
      lan,
      settings: buildSettings({
        "phone-access.tailscale": JSON.stringify({
          autoEnableOnStart: true,
          disableOnClose: true,
          idleDisableMinutes: null,
        }),
        "phone-access.lan": JSON.stringify({
          autoEnableOnStart: true,
          idleDisableMinutes: null,
        }),
      }),
    }).applyOnStartup()

    expect(tunnel.enable).not.toHaveBeenCalled()
    expect(lan.enable).not.toHaveBeenCalled()
  })

  it("enables the tunnel and the LAN mode when asked", async () => {
    const tunnel = buildTunnel()
    const lan = buildLan()
    const activity = buildActivity()

    await buildService({
      tunnel,
      lan,
      activity,
      settings: buildSettings({
        "phone-access.tailscale": JSON.stringify({
          autoEnableOnStart: true,
          disableOnClose: true,
          idleDisableMinutes: null,
        }),
        "phone-access.lan": JSON.stringify({
          autoEnableOnStart: true,
          idleDisableMinutes: null,
        }),
      }),
    }).applyOnStartup()

    expect(tunnel.enable).toHaveBeenCalledTimes(1)
    expect(lan.enable).toHaveBeenCalledTimes(1)
    expect(activity.touch).toHaveBeenCalledWith("tailscale")
    expect(activity.touch).toHaveBeenCalledWith("lan")
  })

  it("skips the tunnel when it is already active", async () => {
    const tunnel = buildTunnel({
      getStatus: vi.fn(async () => ({
        available: true,
        connected: true,
        active: true,
        url: "https://desktop.tailnet-abc.ts.net",
      })),
    })

    await buildService({
      tunnel,
      settings: buildSettings({
        "phone-access.tailscale": JSON.stringify({
          autoEnableOnStart: true,
          disableOnClose: true,
          idleDisableMinutes: null,
        }),
      }),
    }).applyOnStartup()

    expect(tunnel.enable).not.toHaveBeenCalled()
  })

  it("skips the tunnel when Tailscale is not available, without throwing", async () => {
    const tunnel = buildTunnel({
      getStatus: vi.fn(async () => ({
        available: false,
        connected: false,
        active: false,
        url: null,
      })),
    })

    await expect(
      buildService({
        tunnel,
        settings: buildSettings({
          "phone-access.tailscale": JSON.stringify({
            autoEnableOnStart: true,
            disableOnClose: true,
            idleDisableMinutes: null,
          }),
        }),
      }).applyOnStartup(),
    ).resolves.toBeUndefined()
    expect(tunnel.enable).not.toHaveBeenCalled()
  })

  it("survives an enable failure", async () => {
    const tunnel = buildTunnel({
      enable: vi.fn(async () => {
        throw new Error("boom")
      }),
    })

    await expect(
      buildService({
        tunnel,
        settings: buildSettings({
          "phone-access.tailscale": JSON.stringify({
            autoEnableOnStart: true,
            disableOnClose: true,
            idleDisableMinutes: null,
          }),
        }),
      }).applyOnStartup(),
    ).resolves.toBeUndefined()
  })
})

describe("PhoneAccessService.applyOnShutdown", () => {
  it("disables the tunnel when the preference is on", async () => {
    const tunnel = buildTunnel()

    await buildService({ tunnel }).applyOnShutdown()

    expect(tunnel.disable).toHaveBeenCalledTimes(1)
  })

  it("keeps the tunnel serving when the preference is off", async () => {
    const tunnel = buildTunnel()

    await buildService({
      tunnel,
      settings: buildSettings({
        "phone-access.tailscale": JSON.stringify({
          autoEnableOnStart: false,
          disableOnClose: false,
          idleDisableMinutes: null,
        }),
      }),
    }).applyOnShutdown()

    expect(tunnel.disable).not.toHaveBeenCalled()
  })
})

describe("PhoneAccessService.checkIdle", () => {
  it("does nothing when the watchdog is off", async () => {
    const tunnel = buildTunnel()
    const lan = buildLan()

    await buildService({ tunnel, lan }).checkIdle()

    expect(tunnel.disable).not.toHaveBeenCalled()
    expect(lan.disable).not.toHaveBeenCalled()
  })

  it("disables a mode after its idle minutes and restarts the countdown", async () => {
    const tunnel = buildTunnel()
    const activity = buildActivity({ tailscale: 0, lan: 0 })

    await buildService({
      tunnel,
      activity,
      now: () => 31 * 60_000,
      settings: buildSettings({
        "phone-access.tailscale": JSON.stringify({
          autoEnableOnStart: false,
          disableOnClose: true,
          idleDisableMinutes: 30,
        }),
      }),
    }).checkIdle()

    expect(tunnel.disable).toHaveBeenCalledTimes(1)
    expect(activity.touch).toHaveBeenCalledWith("tailscale")
  })

  it("keeps a mode on while it is still within its window", async () => {
    const tunnel = buildTunnel()

    await buildService({
      tunnel,
      now: () => 29 * 60_000,
      settings: buildSettings({
        "phone-access.tailscale": JSON.stringify({
          autoEnableOnStart: false,
          disableOnClose: true,
          idleDisableMinutes: 30,
        }),
      }),
    }).checkIdle()

    expect(tunnel.disable).not.toHaveBeenCalled()
  })

  it("disables the LAN mode independently", async () => {
    const tunnel = buildTunnel()
    const lan = buildLan()

    await buildService({
      tunnel,
      lan,
      now: () => 16 * 60_000,
      settings: buildSettings({
        "phone-access.lan": JSON.stringify({
          autoEnableOnStart: false,
          idleDisableMinutes: 15,
        }),
      }),
    }).checkIdle()

    expect(lan.disable).toHaveBeenCalledTimes(1)
    expect(tunnel.disable).not.toHaveBeenCalled()
  })
})
