/**
 * LAN access state (same Wi-Fi network).
 *
 * The backend runs a small proxy on the local network that forwards to the
 * frontend; this DTO exposes whether it is active, the port, and the machine's
 * candidate addresses (most likely first).
 */
export interface LanAccessStatusDTO {
  /** Whether the LAN sharing proxy is running. */
  active: boolean
  /** Port the LAN proxy listens on. */
  port: number
  /** Candidate LAN addresses of this machine, most likely first. */
  addresses: string[]
}
