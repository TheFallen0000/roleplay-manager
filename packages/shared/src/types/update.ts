/** Why an update cannot be applied right now (a known state). */
export type UpdateBlockedReason = "not-a-repo" | "dirty" | "no-asset"

/** Step of the background apply job. */
export type UpdateJobStep =
  | "backup"
  | "download"
  | "pull"
  | "install"
  | "done"
  | "failed"

export interface UpdateJobDTO {
  running: boolean
  step: UpdateJobStep
  message: string | null
}

export interface UpdateStatusDTO {
  /** Version of the running app (local `package.json`). */
  currentVersion: string
  /** Version on the tracked branch, when it could be read. */
  latestVersion: string | null
  /** Whether the tracked branch has commits the local checkout does not. */
  behind: boolean
  /** Short list of the new commits (newest first). */
  commits: string[]
  /** Release notes of the latest version, when available. */
  notes: string | null
  /** Whether the update can be applied right now. */
  canApply: boolean
  /** Why it cannot be applied, when it is a known state. */
  blockedReason: UpdateBlockedReason | null
  /** Message when the check itself failed (offline, no remote, ...). */
  checkError: string | null
  /** When the check last succeeded (ISO), null if it never did. */
  checkedAt: string | null
  /** Running or last finished apply job. */
  job: UpdateJobDTO | null
}

export interface BackupResultDTO {
  /** Path of the created backup folder. */
  path: string
  /** Number of files copied. */
  files: number
  /** Total bytes copied. */
  bytes: number
}
