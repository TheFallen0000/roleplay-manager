import cors from "cors"
import express, { type Express } from "express"
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

export interface BuildServerOptions {
  container: AppContainer
  corsOrigin: string
}

export const buildServer = ({
  container,
  corsOrigin,
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

  app.use(buildErrorHandler(logger))

  return app
}
