import type { LogEntryDTO } from "@workspace/shared/types/log"

import type {
  LogReader,
  ReadRecentLogsOptions,
} from "../../../domain/ports/log-reader"

/** Returns the most recent log entries for the in-app viewer. */
export class GetRecentLogsUseCase {
  constructor(private readonly reader: LogReader) {}

  execute(options: ReadRecentLogsOptions): Promise<LogEntryDTO[]> {
    return this.reader.readRecent(options)
  }
}
