/**
 * Estado del túnel de acceso remoto (compartir la app en una red privada).
 *
 * Es genérico a propósito: el dominio no conoce Tailscale, solo si la
 * herramienta está disponible, si hay conexión, si se está compartiendo y la
 * URL para abrir desde el teléfono.
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
