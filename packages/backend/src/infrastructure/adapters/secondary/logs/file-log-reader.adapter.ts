import { readdir, readFile, stat } from "node:fs/promises"
import { join } from "node:path"

import type { LogEntryDTO, LogLevelName } from "@workspace/shared/types/log"

import type {
  LogReader,
  ReadRecentLogsOptions,
} from "../../../../domain/ports/log-reader"

const LOG_FILE = /^app.*\.log$/i

/** Fields pino writes on every line; the rest becomes the entry context. */
const METADATA_FIELDS = new Set([
  "time",
  "level",
  "msg",
  "pid",
  "hostname",
  "service",
])

const LEVEL_RANK: Record<LogLevelName, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

const levelName = (value: unknown): LogLevelName => {
  const level = typeof value === "number" ? value : Number(value)
  if (!Number.isFinite(level)) return "info"
  if (level >= 50) return "error"
  if (level >= 40) return "warn"
  if (level >= 30) return "info"
  return "debug"
}

const toEntry = (parsed: Record<string, unknown>): LogEntryDTO => {
  const context: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(parsed)) {
    if (!METADATA_FIELDS.has(key)) context[key] = value
  }
  const time = Number(parsed.time)
  return {
    time: Number.isFinite(time)
      ? new Date(time).toISOString()
      : new Date().toISOString(),
    level: levelName(parsed.level),
    message: typeof parsed.msg === "string" ? parsed.msg : "",
    ...(Object.keys(context).length > 0 ? { context } : {}),
  }
}

/**
 * Reads the rotating log files written by the pino transport (`app*.log`).
 *
 * Files are visited from newest to oldest and every line is parsed as JSON;
 * a partial line (the logger was writing while it was read) is skipped.
 */
export class FileLogReader implements LogReader {
  constructor(private readonly logDir: string) {}

  async readRecent({
    limit,
    level,
  }: ReadRecentLogsOptions): Promise<LogEntryDTO[]> {
    const minimum = level ? LEVEL_RANK[level] : LEVEL_RANK.debug
    const collected: LogEntryDTO[] = []

    for (const file of await this.listByMtime("desc")) {
      for (const entry of await this.readEntries(file)) {
        if (LEVEL_RANK[entry.level] >= minimum) collected.push(entry)
      }
      if (collected.length >= limit) break
    }

    return collected
      .sort((a, b) => b.time.localeCompare(a.time))
      .slice(0, limit)
  }

  async listFiles(): Promise<string[]> {
    return this.listByMtime("asc")
  }

  private async listByMtime(order: "asc" | "desc"): Promise<string[]> {
    let names: string[]
    try {
      names = await readdir(this.logDir)
    } catch {
      return []
    }

    const files: Array<{ path: string; mtime: number }> = []
    for (const name of names) {
      if (!LOG_FILE.test(name)) continue
      const path = join(this.logDir, name)
      try {
        const info = await stat(path)
        if (info.isFile()) files.push({ path, mtime: info.mtimeMs })
      } catch {
        // The file disappeared between readdir and stat.
      }
    }

    files.sort((a, b) =>
      order === "asc" ? a.mtime - b.mtime : b.mtime - a.mtime,
    )
    return files.map((file) => file.path)
  }

  private async readEntries(path: string): Promise<LogEntryDTO[]> {
    let content: string
    try {
      content = await readFile(path, "utf8")
    } catch {
      return []
    }

    const entries: LogEntryDTO[] = []
    for (const line of content.split("\n")) {
      if (line.trim().length === 0) continue
      try {
        entries.push(toEntry(JSON.parse(line) as Record<string, unknown>))
      } catch {
        // Partial line: the logger was appending while it was read.
      }
    }
    return entries
  }
}
