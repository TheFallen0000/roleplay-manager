/**
 * Application logs exposed to the in-app viewer.
 *
 * The backend writes JSON lines with pino (size-based rotation in
 * `data/logs/`) and the viewer receives them already parsed.
 */
export type LogLevelName = "debug" | "info" | "warn" | "error"

export interface LogEntryDTO {
  /** ISO timestamp of the entry. */
  time: string
  level: LogLevelName
  message: string
  /** Extra structured fields (request info, ids, errors…). */
  context?: Record<string, unknown>
}

export interface RecentLogsDTO {
  /** Most recent first. */
  entries: LogEntryDTO[]
}
