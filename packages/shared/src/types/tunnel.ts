/**
 * Remote access tunnel state (sharing the app on a private network).
 *
 * Deliberately generic: the domain knows nothing about Tailscale, only whether
 * the tool is available, whether the machine is connected, whether sharing is
 * active, and the URL to open on the phone.
 */
export interface TunnelStatusDTO {
  /** Whether the tunnel tool is installed on this machine. */
  available: boolean
  /** Whether the machine is connected to the private network. */
  connected: boolean
  /** Whether the app is currently being shared. */
  active: boolean
  /** URL to open on the phone (null when it cannot be built yet). */
  url: string | null
}
