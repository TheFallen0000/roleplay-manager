import { dirname, resolve } from "node:path"
import { pathToFileURL } from "node:url"

import { buildServer, type WebHandler } from "./infrastructure/adapters/primary/server"
import { buildContainer } from "./containers/app-container"
import { buildDatabase, runMigrations } from "./infrastructure/config/database"
import { buildLogger } from "./infrastructure/config/logger.config"
import { browserUrlToOpen, openBrowser } from "./infrastructure/config/open-browser"
import { PinoLoggerAdapter } from "./infrastructure/adapters/secondary/logger/pino-logger.adapter"
import { loadEnv } from "./infrastructure/config/env"
import type { Logger } from "./domain/ports/logger.port"

const MAX_LISTEN_ATTEMPTS = 15
const LISTEN_RETRY_MS = 1000
/** How often the idle watchdog checks the phone-access link. */
const PHONE_ACCESS_IDLE_INTERVAL_MS = 60_000

/**
 * Loads the Astro handler built in `middleware` mode, so the app (pages and
 * assets) is served by the same process as the API.
 */
const loadWebHandler = async (
  handlerPath: string,
  logger: Logger,
): Promise<WebHandler> => {
  const module = (await import(pathToFileURL(resolve(handlerPath)).href)) as {
    handler?: WebHandler
  }
  if (typeof module.handler !== "function") {
    throw new Error(
      `The web handler module does not export a "handler" function: ${handlerPath}`,
    )
  }
  logger.info("Web handler mounted (single-process mode)", {
    handlerPath,
  })
  return module.handler
}

const main = async (): Promise<void> => {
  const env = loadEnv()
  const pino = buildLogger({ level: env.LOG_LEVEL, nodeEnv: env.NODE_ENV })
  const logger = new PinoLoggerAdapter(pino)

  logger.info("Starting roleplay-manager backend", {
    env: env.NODE_ENV,
    port: env.PORT,
    databasePath: env.DATABASE_PATH,
  })

  let db
  try {
    db = buildDatabase(env.DATABASE_PATH)
    runMigrations(db, env.MIGRATIONS_DIR)
    logger.info("Database migrations applied", { databasePath: env.DATABASE_PATH })
  } catch (error) {
    logger.error("Failed to initialize database", error as Error, {
      databasePath: env.DATABASE_PATH,
    })
    process.exit(1)
  }

  const container = buildContainer({
    logger,
    pino,
    database: db,
    dataDir: env.DATA_DIR,
    maxProfileImageBytes: env.MAX_PROFILE_IMAGE_BYTES,
    maxProfileImagePixels: env.MAX_PROFILE_IMAGE_PIXELS,
    ollamaBaseUrl: env.OLLAMA_BASE_URL,
    providerTimeoutMs: env.PROVIDER_TIMEOUT_MS,
    providerStreamingTimeoutMs: env.PROVIDER_STREAMING_TIMEOUT_MS,
    tunnelTargetUrl: env.TUNNEL_TARGET_URL,
    tailscaleBin: env.TAILSCALE_BIN,
    lanPort: env.LAN_PORT,
    updateRepoDir: env.UPDATE_REPO_DIR,
    updateBranch: env.UPDATE_BRANCH,
    updateInstall: env.UPDATE_INSTALL,
    updatePackagedRoot: env.RM_PACKAGED_ROOT,
    updateRepository: env.RM_UPDATE_REPOSITORY,
    updateApiBaseUrl: env.RM_UPDATE_API_URL,
    backupDir: env.BACKUP_DIR,
    gitBin: env.GIT_BIN,
  })
  const webHandler = env.WEB_HANDLER_PATH
    ? await loadWebHandler(env.WEB_HANDLER_PATH, logger)
    : undefined
  const clientDir = env.WEB_HANDLER_PATH
    ? (env.WEB_CLIENT_DIR ??
      resolve(dirname(env.WEB_HANDLER_PATH), "..", "client"))
    : undefined

  const app = buildServer({
    container,
    corsOrigin: env.CORS_ORIGIN,
    webHandler,
    clientDir,
  })

  const onListening = (): void => {
    logger.info(`Server listening on http://${env.HOST ?? "localhost"}:${env.PORT}`)
    const browserUrl = browserUrlToOpen(env)
    if (browserUrl) {
      openBrowser(browserUrl, (error) =>
        logger.warn("Could not open the browser", { error: String(error) }),
      )
    }
    // Apply the phone-access preferences (auto-enable on start), without
    // blocking boot: failures are logged and the app keeps running.
    void container.phoneAccess
      .applyOnStartup()
      .catch((error) =>
        logger.warn("Phone-access startup check failed", {
          error: String(error),
        }),
      )
  }

  // When the app restarts itself, the previous process may still hold the port
  // for a moment: retry for a while instead of giving up.
  let server: ReturnType<typeof app.listen> | undefined
  const listen = (attempt = 1): void => {
    server = env.HOST
      ? app.listen(env.PORT, env.HOST, onListening)
      : app.listen(env.PORT, onListening)
    server.on("error", (error: NodeJS.ErrnoException) => {
      if (error.code === "EADDRINUSE" && attempt < MAX_LISTEN_ATTEMPTS) {
        logger.warn(`Port ${env.PORT} is still busy; retrying`, { attempt })
        setTimeout(() => listen(attempt + 1), LISTEN_RETRY_MS)
        return
      }
      logger.error("Failed to start the server", error)
      process.exit(1)
    })
  }
  listen()

  // Idle watchdog: turns the phone-access link off after N minutes without
  // remote requests (per the user's preferences).
  setInterval(() => {
    void container.phoneAccess
      .checkIdle()
      .catch((error) =>
        logger.warn("Phone-access idle check failed", { error: String(error) }),
      )
  }, PHONE_ACCESS_IDLE_INTERVAL_MS).unref()

  const shutdown = (signal: string): void => {
    logger.info(`Received ${signal}, shutting down gracefully`)
    const forced = setTimeout(() => {
      logger.error("Forced shutdown after timeout")
      process.exit(1)
    }, 10_000)
    forced.unref()

    // The tunnel may need a CLI call to stop sharing; everything else waits.
    void container.phoneAccess
      .applyOnShutdown()
      .catch((error) =>
        logger.warn("Phone-access shutdown check failed", {
          error: String(error),
        }),
      )
      .finally(() => {
        if (!server) {
          process.exit(0)
        }
        server.close(() => {
          logger.info("HTTP server closed")
          process.exit(0)
        })
      })
  }

  process.on("SIGINT", () => shutdown("SIGINT"))
  process.on("SIGTERM", () => shutdown("SIGTERM"))
  // Windows emits SIGHUP when the console window is closed.
  process.on("SIGHUP", () => shutdown("SIGHUP"))
}

void main().catch((error: unknown) => {
  console.error("Fatal error during startup:", error)
  process.exit(1)
})
