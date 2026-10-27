import type { PhoneAccessMode } from "@workspace/shared/types/phone-access"

export interface PhoneAccessNotice {
  mode: PhoneAccessMode
  minutes: number
  /** Epoch milliseconds. */
  at: number
}

/**
 * Last automatic disable caused by the inactivity watchdog.
 *
 * Kept in memory on purpose: the watchdog lives in the running app, so a notice
 * does not need to survive a restart. A restart also resets the activity clock.
 */
export interface PhoneAccessNoticeStore {
  record(notice: PhoneAccessNotice): void
  latest(): PhoneAccessNotice | null
}
