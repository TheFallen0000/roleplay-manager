import type { LanAccessStatusDTO } from "@workspace/shared/types/lan"

/**
 * Puerto del acceso por red local.
 *
 * La implementación concreta (un proxy HTTP en el backend) vive en
 * infraestructura; los casos de uso solo ven este contrato.
 */
export interface LanAccessController {
  getStatus(): Promise<LanAccessStatusDTO>
  /** Starts sharing the app on the local network. Idempotent. */
  enable(): Promise<LanAccessStatusDTO>
  /** Stops sharing. Idempotent. */
  disable(): Promise<LanAccessStatusDTO>
}
