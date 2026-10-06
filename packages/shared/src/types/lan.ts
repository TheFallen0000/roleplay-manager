/**
 * Estado del acceso por red local (misma WiFi).
 *
 * El backend levanta un pequeño proxy en la red local que reenvía al frontend;
 * este DTO expone si está activo, el puerto y las direcciones candidatas de la
 * máquina (la más probable primero).
 */
export interface LanAccessStatusDTO {
  /** Whether the LAN sharing proxy is running. */
  active: boolean
  /** Port the LAN proxy listens on. */
  port: number
  /** Candidate LAN addresses of this machine, most likely first. */
  addresses: string[]
}
