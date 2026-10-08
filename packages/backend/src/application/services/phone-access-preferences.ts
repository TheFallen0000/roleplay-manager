import {
  IDLE_DISABLE_MINUTES_OPTIONS,
  PHONE_ACCESS_DEFAULTS,
  type IdleDisableMinutes,
  type LanPreferencesDTO,
  type PhoneAccessMode,
  type PhoneAccessPreferencesResponseDTO,
  type TunnelPreferencesDTO,
} from "@workspace/shared/types/phone-access"

import type { SettingsRepository } from "../../domain/ports/settings.repository"

/** Keys in the `settings` table: one JSON document per mode. */
const SETTINGS_KEYS: Record<PhoneAccessMode, string> = {
  tailscale: "phone-access.tailscale",
  lan: "phone-access.lan",
}

export interface PhoneAccessPreferencesPatch {
  autoEnableOnStart?: boolean
  disableOnClose?: boolean
  idleDisableMinutes?: IdleDisableMinutes
}

const isIdleDisableMinutes = (value: unknown): value is IdleDisableMinutes =>
  value === null ||
  IDLE_DISABLE_MINUTES_OPTIONS.includes(
    value as (typeof IDLE_DISABLE_MINUTES_OPTIONS)[number],
  )

const pickBoolean = (value: unknown, fallback: boolean): boolean =>
  typeof value === "boolean" ? value : fallback

const parseJson = (raw: string | null): Record<string, unknown> => {
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw) as unknown
    return typeof parsed === "object" && parsed !== null
      ? (parsed as Record<string, unknown>)
      : {}
  } catch {
    return {}
  }
}

const parseTunnel = (raw: string | null): TunnelPreferencesDTO => {
  const defaults = PHONE_ACCESS_DEFAULTS.tailscale
  const parsed = parseJson(raw)
  return {
    autoEnableOnStart: pickBoolean(
      parsed.autoEnableOnStart,
      defaults.autoEnableOnStart,
    ),
    disableOnClose: pickBoolean(parsed.disableOnClose, defaults.disableOnClose),
    idleDisableMinutes: isIdleDisableMinutes(parsed.idleDisableMinutes)
      ? parsed.idleDisableMinutes
      : defaults.idleDisableMinutes,
  }
}

const parseLan = (raw: string | null): LanPreferencesDTO => {
  const defaults = PHONE_ACCESS_DEFAULTS.lan
  const parsed = parseJson(raw)
  return {
    autoEnableOnStart: pickBoolean(
      parsed.autoEnableOnStart,
      defaults.autoEnableOnStart,
    ),
    idleDisableMinutes: isIdleDisableMinutes(parsed.idleDisableMinutes)
      ? parsed.idleDisableMinutes
      : defaults.idleDisableMinutes,
  }
}

/**
 * Reads both modes' preferences. Missing or corrupt values fall back to the
 * defaults, so a hand-edited database can never break the app.
 */
export const readPhoneAccessPreferences = async (
  settings: SettingsRepository,
): Promise<PhoneAccessPreferencesResponseDTO> => {
  const values = await settings.getMany(Object.values(SETTINGS_KEYS))
  return {
    tailscale: parseTunnel(values[SETTINGS_KEYS.tailscale] ?? null),
    lan: parseLan(values[SETTINGS_KEYS.lan] ?? null),
  }
}

/** Persists a partial update for one mode and returns the fresh pair. */
export const updatePhoneAccessPreferences = async (
  settings: SettingsRepository,
  mode: PhoneAccessMode,
  patch: PhoneAccessPreferencesPatch,
): Promise<PhoneAccessPreferencesResponseDTO> => {
  const current = await readPhoneAccessPreferences(settings)
  const next: PhoneAccessPreferencesResponseDTO = { ...current }

  if (mode === "tailscale") {
    next.tailscale = {
      autoEnableOnStart:
        patch.autoEnableOnStart ?? current.tailscale.autoEnableOnStart,
      disableOnClose: patch.disableOnClose ?? current.tailscale.disableOnClose,
      idleDisableMinutes:
        patch.idleDisableMinutes !== undefined
          ? patch.idleDisableMinutes
          : current.tailscale.idleDisableMinutes,
    }
  } else {
    next.lan = {
      autoEnableOnStart:
        patch.autoEnableOnStart ?? current.lan.autoEnableOnStart,
      idleDisableMinutes:
        patch.idleDisableMinutes !== undefined
          ? patch.idleDisableMinutes
          : current.lan.idleDisableMinutes,
    }
  }

  await settings.set(SETTINGS_KEYS[mode], JSON.stringify(next[mode]))
  return next
}
