import type { LogReader } from "../../../domain/ports/log-reader"

/** Lists the log files (oldest first) for the download endpoint. */
export class ListLogFilesUseCase {
  constructor(private readonly reader: LogReader) {}

  execute(): Promise<string[]> {
    return this.reader.listFiles()
  }
}
