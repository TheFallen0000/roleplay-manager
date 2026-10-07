import { dirname, resolve } from "node:path"
import { pathToFileURL } from "node:url"

import { buildServer, type WebHandler } from "./infrastructure/adapters/primary/server"
import { buildContainer } from "./containers/app-container"
import { buildDatabase, runMigrations } from "./infrastructure/config/database"
import { buildLogger } from "./infrastructure/config/logger.config"
import { PinoLoggerAdapter } from "./infrastructure/adapters/secondary/logger/pino-logger.adapter"
import { loadEnv } from "./infrastructure/config/env"
import type { Logger } from "./domain/ports/logger.port"

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
    runMigrations(db)
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

  const server = app.listen(env.PORT, () => {
    logger.info(`Server listening on http://localhost:${env.PORT}`)
  })

  const shutdown = (signal: string): void => {
    logger.info(`Received ${signal}, shutting down gracefully`)
    server.close(() => {
      logger.info("HTTP server closed")
      process.exit(0)
    })
    setTimeout(() => {
      logger.error("Forced shutdown after timeout")
      process.exit(1)
    }, 10_000).unref()
  }

  process.on("SIGINT", () => shutdown("SIGINT"))
  process.on("SIGTERM", () => shutdown("SIGTERM"))
}

void main().catch((error: unknown) => {
  console.error("Fatal error during startup:", error)
  process.exit(1)
})
