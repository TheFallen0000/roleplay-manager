import type { PhoneAccessMode } from "@workspace/shared/types/phone-access"

import type { PhoneAccessActivity } from "../../../../domain/ports/phone-access-activity"

export interface InMemoryPhoneAccessActivityOptions {
  /** Injectable for tests. */
  now?: () => number
}

/**
 * Last use instants of each phone link mode, kept in memory.
 *
 * An app restart resets the clock on purpose: startup counts as activity and
 * the watchdog countdown starts from there (or from the moment the user turns
 * the link on, which also calls `touch`).
 */
export class InMemoryPhoneAccessActivity implements PhoneAccessActivity {
  private readonly now: () => number
  private readonly last = new Map<PhoneAccessMode, number>()

  constructor(options: InMemoryPhoneAccessActivityOptions = {}) {
    this.now = options.now ?? Date.now
  }

  touch(mode: PhoneAccessMode): void {
    this.last.set(mode, this.now())
  }

  lastActivityAt(mode: PhoneAccessMode): number {
    return this.last.get(mode) ?? this.now()
  }
}
