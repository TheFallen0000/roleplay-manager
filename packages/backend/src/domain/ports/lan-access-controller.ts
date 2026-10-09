import type { LanAccessStatusDTO } from "@workspace/shared/types/lan"

/**
 * Local network access port.
 *
 * The concrete implementation (an HTTP proxy in the backend) lives in
 * infrastructure; use cases only see this contract.
 */
export interface LanAccessController {
  getStatus(): Promise<LanAccessStatusDTO>
  /** Starts sharing the app on the local network. Idempotent. */
  enable(): Promise<LanAccessStatusDTO>
  /** Stops sharing. Idempotent. */
  disable(): Promise<LanAccessStatusDTO>
}
