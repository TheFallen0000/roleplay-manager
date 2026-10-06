import type { TunnelStatusDTO } from "@workspace/shared/types/tunnel"

/**
 * Puerto del túnel de acceso remoto.
 *
 * La implementación concreta (Tailscale Serve u otra) vive en
 * infraestructura; los casos de uso solo ven este contrato.
 */
export interface TunnelController {
  /** Never throws: returns `available: false` when the tool is missing. */
  getStatus(): Promise<TunnelStatusDTO>
  /** Shares the app on the private network and returns the fresh status. */
  enable(): Promise<TunnelStatusDTO>
  /** Stops sharing and returns the fresh status. */
  disable(): Promise<TunnelStatusDTO>
}
