import type { PhoneAccessMode } from "@workspace/shared/types/phone-access"

import type { LanAccessController } from "../../domain/ports/lan-access-controller"
import type { Logger } from "../../domain/ports/logger.port"
import type { PhoneAccessActivity } from "../../domain/ports/phone-access-activity"
import type { SettingsRepository } from "../../domain/ports/settings.repository"
import type { TunnelController } from "../../domain/ports/tunnel-controller"
import { readPhoneAccessPreferences } from "./phone-access-preferences"

export interface PhoneAccessServiceOptions {
  settings: SettingsRepository
  tunnel: TunnelController
  lan: LanAccessController
  activity: PhoneAccessActivity
  logger: Logger
  /** Auto-enable on start only runs in the packaged app (dev restarts a lot). */
  packaged: boolean
  /** Injectable for tests. */
  now?: () => number
}

const IDLE_CHECK_CLOCK_MS = 60_000

/**
 * Applies phone link settings outside requests: enable on startup, disable on
 * shutdown, and auto-disable on inactivity (no remote requests for N minutes).
 * Everything is *best effort*: a failure is logged and never brings the app
 * down.
 */
export class PhoneAccessService {
  private readonly settings: SettingsRepository
  private readonly tunnel: TunnelController
  private readonly lan: LanAccessController
  private readonly activity: PhoneAccessActivity
  private readonly logger: Logger
  private readonly packaged: boolean
  private readonly now: () => number

  constructor(options: PhoneAccessServiceOptions) {
    this.settings = options.settings
    this.tunnel = options.tunnel
    this.lan = options.lan
    this.activity = options.activity
    this.logger = options.logger
    this.packaged = options.packaged
    this.now = options.now ?? Date.now
  }

  /** Turns on the modes the user asked to enable on start. */
  async applyOnStartup(): Promise<void> {
    if (!this.packaged) {
      this.logger.debug(
        "Skipping phone-access auto-enable outside the packaged app",
      )
      return
    }
    const preferences = await readPhoneAccessPreferences(this.settings)
    if (preferences.tailscale.autoEnableOnStart) {
      await this.enableTunnelOnStartup()
    }
    if (preferences.lan.autoEnableOnStart) {
      await this.enableLanOnStartup()
    }
  }

  /** Turns off the tunnel when the user asked to disable it on close. */
  async applyOnShutdown(): Promise<void> {
    const preferences = await readPhoneAccessPreferences(this.settings)
    if (!preferences.tailscale.disableOnClose) return
    try {
      await this.tunnel.disable()
      this.logger.info("Tunnel disabled on close")
    } catch (error) {
      this.logger.warn("Could not disable the tunnel on close", {
        error: String(error),
      })
    }
  }

  /** Turns off the modes nobody used for their idle timeout. */
  async checkIdle(): Promise<void> {
    const preferences = await readPhoneAccessPreferences(this.settings)
    await this.applyIdle(
      "tailscale",
      preferences.tailscale.idleDisableMinutes,
      () => this.tunnel.disable(),
    )
    await this.applyIdle(
      "lan",
      preferences.lan.idleDisableMinutes,
      () => this.lan.disable(),
    )
  }

  private async applyIdle(
    mode: PhoneAccessMode,
    minutes: number | null,
    disable: () => Promise<unknown>,
  ): Promise<void> {
    if (minutes === null) return
    const idleMs = this.now() - this.activity.lastActivityAt(mode)
    if (idleMs < minutes * IDLE_CHECK_CLOCK_MS) return

    try {
      await disable()
      this.logger.info("Phone access disabled after inactivity", {
        mode,
        minutes,
      })
    } catch (error) {
      this.logger.warn("Could not disable phone access after inactivity", {
        mode,
        error: String(error),
      })
    } finally {
      // Restart the countdown either way: a failing command must not be
      // retried on every tick.
      this.activity.touch(mode)
    }
  }

  private async enableTunnelOnStartup(): Promise<void> {
    try {
      const status = await this.tunnel.getStatus()
      if (status.active) return
      if (!status.available || !status.connected) {
        this.logger.warn(
          "Tunnel auto-enable skipped: Tailscale is not available or connected",
        )
        return
      }
      await this.tunnel.enable()
      this.activity.touch("tailscale")
      this.logger.info("Tunnel enabled on startup")
    } catch (error) {
      this.logger.warn("Could not enable the tunnel on startup", {
        error: String(error),
      })
    }
  }

  private async enableLanOnStartup(): Promise<void> {
    try {
      const status = await this.lan.getStatus()
      if (status.active) return
      await this.lan.enable()
      this.activity.touch("lan")
      this.logger.info("LAN access enabled on startup")
    } catch (error) {
      this.logger.warn("Could not enable LAN access on startup", {
        error: String(error),
      })
    }
  }
}
