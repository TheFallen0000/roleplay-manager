/**
 * Phone-access preferences (Tailscale tunnel and home network).
 *
 * The backend persists them in the `settings` table and applies them on start
 * (enable on launch), on close (disable on close; Tailscale only, since it
 * keeps serving after the app exits) and when the link is idle
 * (auto-disable after inactivity).
 */
export type PhoneAccessMode = "tailscale" | "lan"

/** Minutes of remote silence after which the link turns itself off. */
export const IDLE_DISABLE_MINUTES_OPTIONS = [15, 30, 60, 120] as const

/** `null` means the idle watchdog is off. */
export type IdleDisableMinutes =
  | (typeof IDLE_DISABLE_MINUTES_OPTIONS)[number]
  | null

export interface PhoneAccessPreferencesDTO {
  /** Turn the link on when the app starts. */
  autoEnableOnStart: boolean
  /** Turn it off after this many minutes without remote use (`null` = off). */
  idleDisableMinutes: IdleDisableMinutes
}

export interface TunnelPreferencesDTO extends PhoneAccessPreferencesDTO {
  /**
   * Turn the link off when the app closes. Tailscale keeps serving after the
   * app exits, so this option only exists for the tunnel.
   */
  disableOnClose: boolean
}

export type LanPreferencesDTO = PhoneAccessPreferencesDTO

export interface PhoneAccessPreferencesResponseDTO {
  tailscale: TunnelPreferencesDTO
  lan: LanPreferencesDTO
}

/** Partial update of one mode's preferences. */
export interface PhoneAccessPreferencesUpdateDTO {
  mode: PhoneAccessMode
  autoEnableOnStart?: boolean
  disableOnClose?: boolean
  idleDisableMinutes?: IdleDisableMinutes
}

export const PHONE_ACCESS_DEFAULTS: PhoneAccessPreferencesResponseDTO = {
  tailscale: {
    autoEnableOnStart: false,
    disableOnClose: true,
    idleDisableMinutes: null,
  },
  lan: {
    autoEnableOnStart: false,
    idleDisableMinutes: null,
  },
}
