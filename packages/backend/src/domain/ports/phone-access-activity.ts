import type { PhoneAccessMode } from "@workspace/shared/types/phone-access"

/**
 * Phone link activity.
 *
 * Records when each mode was last used (a request arriving through the tunnel
 * or the local network) so the inactivity watcher can turn it off when nobody
 * is using it.
 */
export interface PhoneAccessActivity {
  /** Marks the mode as used right now (enabling it also counts as use). */
  touch(mode: PhoneAccessMode): void
  /** Epoch milliseconds of the last use; defaults to now when never used. */
  lastActivityAt(mode: PhoneAccessMode): number
}
