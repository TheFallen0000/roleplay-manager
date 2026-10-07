import type {
  BackupResultDTO,
  UpdateStatusDTO,
} from "@workspace/shared/types/update"

/**
 * Puerto de actualizaciones de la aplicación.
 *
 * La implementación concreta (hoy por git; en el futuro por releases) vive en
 * infraestructura; los casos de uso solo ven este contrato.
 */
export interface UpdateController {
  /** Last known status (no network access). */
  getStatus(): Promise<UpdateStatusDTO>
  /** Fetches the tracked branch and refreshes the status. */
  check(): Promise<UpdateStatusDTO>
  /** Starts applying the update in the background (progress in `status.job`). */
  apply(options: { withBackup: boolean }): Promise<UpdateStatusDTO>
  /** Creates a backup of the app data. */
  createBackup(): Promise<BackupResultDTO>
}
