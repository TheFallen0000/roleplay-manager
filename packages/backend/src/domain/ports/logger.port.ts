export type LogLevel = "debug" | "info" | "warn" | "error"

export type LogContext = Record<string, unknown>

/**
 * Logging port.
 *
 * The domain and use cases emit log events through this interface. The
 * backend choice (pino, winston, console) lives in infrastructure.
 *
 * `child` creates a logger with fixed bindings (e.g. `requestId`,
 * `conversationId`) that propagate to every log call without repeating
 * them manually.
 */
export interface Logger {
  debug(message: string, context?: LogContext): void
  info(message: string, context?: LogContext): void
  warn(message: string, context?: LogContext): void
  error(message: string, error?: Error, context?: LogContext): void
  child(bindings: LogContext): Logger
}
