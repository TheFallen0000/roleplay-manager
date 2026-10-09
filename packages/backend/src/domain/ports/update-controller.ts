import type {
  BackupResultDTO,
  UpdateStatusDTO,
} from "@workspace/shared/types/update"

/**
 * Application updates port.
 *
 * The concrete implementation (git today; releases in the future) lives in
 * infrastructure; use cases only see this contract.
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
