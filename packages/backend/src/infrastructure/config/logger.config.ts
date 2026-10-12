import { join } from "node:path"

import {
  pino,
  type Logger as PinoLogger,
  type TransportTargetOptions,
} from "pino"

import type { LogLevel } from "../../domain/ports/logger.port"

export interface BuildLoggerOptions {
  level: LogLevel
  nodeEnv: "development" | "production" | "test"
  /** Folder for the rotating log files; omitted when logs stay in memory. */
  logDir?: string
}

/** ~5 MB per file and 5 rotated files ≈ 30 MB on disk at most. */
const LOG_FILE_SIZE = "5m"
const LOG_FILE_COUNT = 5

/** Credentials and session cookies never reach the log files. */
const REDACT_PATHS = [
  "req.headers.authorization",
  "req.headers.cookie",
  "req.headers['x-api-key']",
  "res.headers['set-cookie']",
]

export const buildLogger = ({
  level,
  nodeEnv,
  logDir,
}: BuildLoggerOptions): PinoLogger => {
  const targets: TransportTargetOptions[] = []

  if (logDir) {
    targets.push({
      target: "pino-roll",
      level,
      options: {
        file: join(logDir, "app"),
        size: LOG_FILE_SIZE,
        // `removeOtherLogFiles` keeps the retention honest across restarts.
        limit: { count: LOG_FILE_COUNT, removeOtherLogFiles: true },
        mkdir: true,
      },
    })
  }

  targets.push(
    nodeEnv === "production" || nodeEnv === "test"
      ? { target: "pino/file", level, options: { destination: 1 } }
      : {
          target: "pino-pretty",
          level,
          options: {
            colorize: true,
            translateTime: "HH:MM:ss.l",
            ignore: "pid,hostname,service",
          },
        },
  )

  return pino({
    level,
    base: { service: "roleplay-manager-backend" },
    redact: { paths: REDACT_PATHS, censor: "[redacted]" },
    transport: { targets },
  })
}
