import type { TunnelStatusDTO } from "@workspace/shared/types/tunnel"

/**
 * Remote access tunnel port.
 *
 * The concrete implementation (Tailscale Serve or another) lives in
 * infrastructure; use cases only see this contract.
 */
export interface TunnelController {
  /** Never throws: returns `available: false` when the tool is missing. */
  getStatus(): Promise<TunnelStatusDTO>
  /** Shares the app on the private network and returns the fresh status. */
  enable(): Promise<TunnelStatusDTO>
  /** Stops sharing and returns the fresh status. */
  disable(): Promise<TunnelStatusDTO>
}
