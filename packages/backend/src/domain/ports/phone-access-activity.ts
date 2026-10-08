import type { PhoneAccessMode } from "@workspace/shared/types/phone-access"

/**
 * Actividad del enlace telefónico.
 *
 * Registra cuándo se usó cada modo por última vez (una petición que llegó por
 * el túnel o por la red local) para que el vigilante de inactividad pueda
 * apagarlo cuando nadie lo usa.
 */
export interface PhoneAccessActivity {
  /** Marks the mode as used right now (enabling it also counts as use). */
  touch(mode: PhoneAccessMode): void
  /** Epoch milliseconds of the last use; defaults to now when never used. */
  lastActivityAt(mode: PhoneAccessMode): number
}
