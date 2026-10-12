import type { LogEntryDTO, LogLevelName } from "@workspace/shared/types/log"

export interface ReadRecentLogsOptions {
  limit: number
  /** Minimum level to include (`info` hides `debug` entries). */
  level?: LogLevelName
}

/**
 * Application log port.
 *
 * The adapter reads the rotated files the logger writes; the viewer and the
 * download only see this contract.
 */
export interface LogReader {
  /** Most recent entries first. */
  readRecent(options: ReadRecentLogsOptions): Promise<LogEntryDTO[]>
  /** Log files, oldest first, for the downloadable bundle. */
  listFiles(): Promise<string[]>
}
