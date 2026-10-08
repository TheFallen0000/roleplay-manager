import type { PhoneAccessMode } from "@workspace/shared/types/phone-access"

import type { PhoneAccessActivity } from "../../../../domain/ports/phone-access-activity"

export interface InMemoryPhoneAccessActivityOptions {
  /** Injectable for tests. */
  now?: () => number
}

/**
 * Últimos instantes de uso de cada modo del enlace telefónico, en memoria.
 *
 * Un reinicio de la app resetea el reloj a propósito: el arranque cuenta como
 * actividad y la cuenta atrás del vigilante empieza desde ahí (o desde el
 * momento en que el usuario enciende el enlace, que también hace `touch`).
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
