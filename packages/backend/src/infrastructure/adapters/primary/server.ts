import cors from "cors"
import express, {
  type Express,
  type NextFunction,
  type Request,
  type Response,
} from "express"
import { resolve } from "node:path"
import pinoHttp from "pino-http"

import type { AppContainer } from "../../../containers/app-container"
import { buildErrorHandler } from "./middlewares/error-handler"
import { buildCharacterRouter } from "./routes/character.routes"
import { buildPlayerCharacterRouter } from "./routes/player-character.routes"
import { buildConversationRouter } from "./routes/conversation.routes"
import { buildHealthRouter } from "./routes/health.routes"
import { buildProviderRouter } from "./routes/provider.routes"
import { buildSettingsRouter } from "./routes/settings.routes"
import { buildProviderInstanceRouter } from "./routes/provider-instance.routes"
import { buildMemoryRouter } from "./routes/memory.routes"
import { buildContextRouter } from "./routes/context.routes"
import { buildSummaryRouter } from "./routes/summary.routes"
import { buildTunnelRouter } from "./routes/tunnel.routes"
import { buildLanRouter } from "./routes/lan.routes"
import { buildPhoneAccessRouter } from "./routes/phone-access.routes"
import { buildPhoneAccessActivityMiddleware } from "./middlewares/phone-access-activity"
import { buildUpdateRouter } from "./routes/update.routes"

export interface BuildServerOptions {
  container: AppContainer
  corsOrigin: string
  /**
   * Optional Astro handler (built in `middleware` mode) that serves the app
   * (pages and assets) in the same process. Mounted after the `/api` routers,
   * so the API always wins and API errors still reach the error handler.
   */
  webHandler?: WebHandler
  /**
   * Optional folder with the frontend's static build (`dist/client`). In
   * middleware mode Astro does not serve it, so the host must.
   */
  clientDir?: string
}

export type WebHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
) => void

export const buildServer = ({
  container,
  corsOrigin,
  webHandler,
  clientDir,
}: BuildServerOptions): Express => {
  const { logger, pino } = container
  const app = express()

  app.use("/api/characters/imports", express.json({ limit: "25mb" }))
  app.use(express.json({ limit: "1mb" }))
  app.use(
    cors({
      origin: corsOrigin,
      credentials: true,
    }),
  )

  app.use(
    pinoHttp({
      logger: pino,
      customLogLevel: (_req, res, err) => {
        if (err) return "error"
        if (res.statusCode >= 500) return "error"
        if (res.statusCode >= 400) return "warn"
        return "info"
      },
      customSuccessMessage: (req, res) =>
        `${req.method} ${req.url} ${res.statusCode}`,
      customErrorMessage: (req, res, err) =>
        `${req.method} ${req.url} ${res.statusCode} ${err.message}`,
    }),
  )

  // Remote (phone) requests feed the idle watchdog before they are served.
  app.use(buildPhoneAccessActivityMiddleware(container.phoneAccessActivity))

  // In `middleware` mode Astro does not serve its static build; the host does.
  if (clientDir) {
    app.use(
      express.static(resolve(clientDir), { index: false, maxAge: "1h" }),
    )
  }

  app.use("/api", buildHealthRouter(container.healthCheck))
  app.use("/api", buildProviderRouter(container))
  app.use(
    "/api/settings",
    buildSettingsRouter({
      getDefaultProvider: container.getDefaultProvider,
      configureDefaultProvider: container.configureDefaultProvider,
      setProviderModel: container.setProviderModel,
      settings: container.settings,
    }),
  )
  app.use("/api", buildProviderInstanceRouter(container))
  app.use("/api", buildCharacterRouter(container))
  app.use("/api", buildPlayerCharacterRouter(container))
  app.use(
    "/api",
    buildConversationRouter({
      logger: container.logger,
      createConversation: container.createConversation,
      branchConversation: container.branchConversation,
      getConversation: container.getConversation,
      listConversations: container.listConversations,
      sendMessage: container.sendMessage,
      editMessage: container.editMessage,
      deleteMessage: container.deleteMessage,
      regenerateReply: container.regenerateReply,
      rewindConversation: container.rewindConversation,
      continueConversation: container.continueConversation,
      generateConversationTitle: container.generateConversationTitle,
      conversationRepository: container.conversationRepository,
      cycleAlternative: container.cycleAlternative,
      updateConversationSettings: container.updateConversationSettings,
      uploadConversationCustomImage: container.uploadConversationCustomImage,
      maxProfileImageBytes: container.maxProfileImageBytes,
    }),
  )
  app.use(
    "/api",
    buildMemoryRouter({
      listMemories: container.listMemories,
      createMemory: container.createMemory,
      updateMemory: container.updateMemory,
      deleteMemory: container.deleteMemory,
      listProposals: container.listProposals,
      applyMemoryChanges: container.applyMemoryChanges,
      applyAllMemoryChanges: container.applyAllMemoryChanges,
      decayMemories: container.decayMemories,
    }),
  )
  app.use(
    "/api",
    buildContextRouter({
      getPromptContext: container.getPromptContext,
    }),
  )
  app.use(
    "/api",
    buildSummaryRouter({
      listSummaries: container.listSummaries,
      generateSummary: container.generateSummary,
      updateSummary: container.updateSummary,
      deleteSummary: container.deleteSummary,
    }),
  )
  app.use(
    "/api",
    buildTunnelRouter({
      getTunnelStatus: container.getTunnelStatus,
      enableTunnel: container.enableTunnel,
      disableTunnel: container.disableTunnel,
    }),
  )
  app.use(
    "/api",
    buildLanRouter({
      getLanStatus: container.getLanStatus,
      enableLanAccess: container.enableLanAccess,
      disableLanAccess: container.disableLanAccess,
    }),
  )
  app.use(
    "/api",
    buildPhoneAccessRouter({
      getPhoneAccessPreferences: container.getPhoneAccessPreferences,
      updatePhoneAccessPreferences: container.updatePhoneAccessPreferences,
    }),
  )
  app.use(
    "/api",
    buildUpdateRouter({
      getUpdateStatus: container.getUpdateStatus,
      checkUpdates: container.checkUpdates,
      applyUpdate: container.applyUpdate,
      createBackup: container.createBackup,
      restartApp: container.restartApp,
    }),
  )

  // The Astro handler (pages + assets) goes last: `/api` always wins and API
  // errors still reach the error handler below.
  if (webHandler) {
    app.use(webHandler)
  }

  app.use(buildErrorHandler(logger))

  return app
}
