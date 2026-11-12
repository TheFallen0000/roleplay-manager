import type { Database } from "../infrastructure/config/database"
import type { Logger } from "../domain/ports/logger.port"
import type { Logger as PinoLogger } from "pino"
import { HealthCheckUseCase } from "../application/use-cases/health/health-check.use-case"
import { ListProvidersUseCase } from "../application/use-cases/provider/list-providers.use-case"
import { ValidateProviderConnectionUseCase } from "../application/use-cases/provider/validate-provider-connection.use-case"
import { ListProviderModelsUseCase } from "../application/use-cases/provider/list-provider-models.use-case"
import { GetModelCapabilitiesUseCase } from "../application/use-cases/provider/get-model-capabilities.use-case"
import { ModelCapabilitiesCache } from "../application/services/model-capabilities-cache.service"
import { CURATED_MODEL_CATALOG } from "../infrastructure/adapters/secondary/model-catalog/curated-model-catalog"
import { inferModelCapabilitiesHeuristic } from "@workspace/shared/lib/model-capabilities"
import { GetDefaultProviderUseCase } from "../application/use-cases/provider/get-default-provider.use-case"
import { ConfigureDefaultProviderUseCase } from "../application/use-cases/provider/configure-default-provider.use-case"
import { DrizzleSettingsRepository } from "../infrastructure/adapters/secondary/drizzle/repositories/drizzle-settings.repository"
import { DrizzleCharacterRepository } from "../infrastructure/adapters/secondary/drizzle/repositories/drizzle-character.repository"
import { DrizzleLorebookRepository } from "../infrastructure/adapters/secondary/drizzle/repositories/drizzle-lorebook.repository"
import { pngCardAdapter } from "../infrastructure/adapters/secondary/sillytavern/png-card.adapter"
import { DrizzlePlayerCharacterRepository } from "../infrastructure/adapters/secondary/drizzle/repositories/drizzle-player-character.repository"
import { DrizzleCharacterAssetRepository } from "../infrastructure/adapters/secondary/drizzle/repositories/drizzle-character-asset.repository"
import { FilesystemCharacterAssetStorage } from "../infrastructure/adapters/secondary/filesystem/filesystem-character-asset-storage"
import { DrizzleConversationRepository } from "../infrastructure/adapters/secondary/drizzle/repositories/drizzle-conversation.repository"
import { DrizzleMessageRepository } from "../infrastructure/adapters/secondary/drizzle/repositories/drizzle-message.repository"
import { DrizzleProviderInstanceRepository } from "../infrastructure/adapters/secondary/drizzle/repositories/drizzle-provider-instance.repository"
import { DrizzleMemoryRepository } from "../infrastructure/adapters/secondary/drizzle/repositories/drizzle-memory.repository"
import { DrizzleMemoryChangeProposalRepository } from "../infrastructure/adapters/secondary/drizzle/repositories/drizzle-memory-change-proposal.repository"
import { DrizzleHealthRepository } from "../infrastructure/adapters/secondary/drizzle/repositories/drizzle-health.repository"
import { DrizzleSummaryRepository } from "../infrastructure/adapters/secondary/drizzle/repositories/drizzle-summary.repository"
import { ProviderRegistryImpl } from "../infrastructure/adapters/secondary/providers/provider-registry"
import { PromptContextBuilderImpl } from "../infrastructure/adapters/secondary/prompt-context-builder/prompt-context-builder.impl"
import type { ProviderRegistry } from "../domain/ports/provider.port"
import type { SettingsRepository } from "../domain/ports/settings.repository"
import type { PhoneAccessActivity } from "../domain/ports/phone-access-activity"
import type { LogReader } from "../domain/ports/log-reader"
import type {
  CharacterRepository,
  CharacterSummaryRepository,
} from "../domain/ports/character.repository"
import type { PlayerCharacterRepository } from "../domain/ports/player-character.repository"
import type { LorebookRepository } from "../domain/ports/lorebook.repository"
import type {
  CharacterAssetLookupRepository,
  CharacterAssetMaintenanceRepository,
  CharacterAssetRepository,
  CharacterAssetVariantStorage,
} from "../domain/ports/character-asset.repository"
import type { ConversationRepository } from "../domain/ports/conversation.repository"
import type {
  MessageHistoryRepository,
  MessageRepository,
} from "../domain/ports/message.repository"
import type { MemoryRepository } from "../domain/ports/memory.repository"
import type { MemoryChangeProposalRepository } from "../domain/ports/memory-change-proposal.repository"
import type { ProviderInstanceRepository } from "../domain/ports/provider-instance.repository"
import type { SummaryRepository } from "../domain/ports/summary.repository"
import type { PromptContextBuilder } from "../domain/ports/prompt-context-builder"
import { CreateCharacterUseCase } from "../application/use-cases/character/create-character.use-case"
import { CreatePlayerCharacterUseCase } from "../application/use-cases/player-character/create-player-character.use-case"
import { ListPlayerCharactersUseCase } from "../application/use-cases/player-character/list-player-characters.use-case"
import { UpdatePlayerCharacterUseCase } from "../application/use-cases/player-character/update-player-character.use-case"
import { DeletePlayerCharacterUseCase } from "../application/use-cases/player-character/delete-player-character.use-case"
import { GetCharacterUseCase } from "../application/use-cases/character/get-character.use-case"
import { GetCharacterCardUseCase } from "../application/use-cases/character/get-character-card.use-case"
import { UpdateCharacterCardUseCase } from "../application/use-cases/character/update-character-card.use-case"
import { ListCharactersUseCase } from "../application/use-cases/character/list-characters.use-case"
import { UpdateCharacterUseCase } from "../application/use-cases/character/update-character.use-case"
import { UpdateCharacterProfileImageUseCase } from "../application/use-cases/character/update-character-profile-image.use-case"
import { ExportCharacterUseCase } from "../application/use-cases/character/export-character.use-case"
import { ImportCharacterUseCase } from "../application/use-cases/character/import-character.use-case"
import { DeleteCharacterUseCase } from "../application/use-cases/character/delete-character.use-case"
import { ListCharacterVersionsUseCase } from "../application/use-cases/character/list-character-versions.use-case"
import { UploadCharacterAssetUseCase } from "../application/use-cases/character/upload-character-asset.use-case"
import { GetCharacterAssetUseCase } from "../application/use-cases/character/get-character-asset.use-case"
import { BackfillCharacterAssetVariantsUseCase } from "../application/use-cases/character/backfill-character-asset-variants.use-case"
import { ApplySettingsTemplateUseCase } from "../application/use-cases/character/apply-settings-template.use-case"
import { ImportSillyTavernCardUseCase } from "../application/use-cases/character/import-sillytavern-card.use-case"
import { PreviewSillyTavernCardUseCase } from "../application/use-cases/character/preview-sillytavern-card.use-case"
import { ExportSillyTavernCardUseCase } from "../application/use-cases/character/export-sillytavern-card.use-case"
import { ImportLorebookUseCase } from "../application/use-cases/character/lorebook/import-lorebook.use-case"
import { ExportLorebookUseCase } from "../application/use-cases/character/lorebook/export-lorebook.use-case"
import { GetLorebookUseCase } from "../application/use-cases/character/lorebook/get-lorebook.use-case"
import { UpdateLorebookUseCase } from "../application/use-cases/character/lorebook/update-lorebook.use-case"
import { CreateLorebookEntryUseCase } from "../application/use-cases/character/lorebook/create-lorebook-entry.use-case"
import { UpdateLorebookEntryUseCase } from "../application/use-cases/character/lorebook/update-lorebook-entry.use-case"
import { DeleteLorebookEntryUseCase } from "../application/use-cases/character/lorebook/delete-lorebook-entry.use-case"
import { ReorderLorebookEntriesUseCase } from "../application/use-cases/character/lorebook/reorder-lorebook-entries.use-case"
import { PreviewLorebookUseCase } from "../application/use-cases/character/lorebook/preview-lorebook.use-case"
import { ListLorebooksUseCase } from "../application/use-cases/character/lorebook/list-lorebooks.use-case"
import { GetLorebookByIdUseCase } from "../application/use-cases/character/lorebook/get-lorebook-by-id.use-case"
import { ListLorebookVersionsUseCase } from "../application/use-cases/character/lorebook/list-lorebook-versions.use-case"
import { GetLorebookVersionUseCase } from "../application/use-cases/character/lorebook/get-lorebook-version.use-case"
import { CreateLorebookUseCase } from "../application/use-cases/character/lorebook/create-lorebook.use-case"
import { UpdateLorebookByIdUseCase } from "../application/use-cases/character/lorebook/update-lorebook-by-id.use-case"
import { StoreCharacterAssetService } from "../application/services/store-character-asset.service"
import { SharpCharacterAssetImageProcessor } from "../infrastructure/adapters/secondary/images/sharp-character-asset-image-processor"
import { GetTunnelStatusUseCase } from "../application/use-cases/tunnel/get-tunnel-status.use-case"
import { EnableTunnelUseCase } from "../application/use-cases/tunnel/enable-tunnel.use-case"
import { DisableTunnelUseCase } from "../application/use-cases/tunnel/disable-tunnel.use-case"
import { TailscaleServeAdapter } from "../infrastructure/adapters/secondary/tunnel/tailscale-serve.adapter"
import { GetLanStatusUseCase } from "../application/use-cases/lan/get-lan-status.use-case"
import { EnableLanAccessUseCase } from "../application/use-cases/lan/enable-lan-access.use-case"
import { DisableLanAccessUseCase } from "../application/use-cases/lan/disable-lan-access.use-case"
import { LanProxyServerAdapter } from "../infrastructure/adapters/secondary/lan/lan-proxy-server.adapter"
import { GetPhoneAccessPreferencesUseCase } from "../application/use-cases/phone-access/get-phone-access-preferences.use-case"
import { UpdatePhoneAccessPreferencesUseCase } from "../application/use-cases/phone-access/update-phone-access-preferences.use-case"
import { GetPhoneAccessNoticeUseCase } from "../application/use-cases/phone-access/get-phone-access-notice.use-case"
import { PhoneAccessService } from "../application/services/phone-access.service"
import { InMemoryPhoneAccessActivity } from "../infrastructure/adapters/secondary/phone-access/in-memory-phone-access-activity.adapter"
import { InMemoryPhoneAccessNoticeStore } from "../infrastructure/adapters/secondary/phone-access/in-memory-phone-access-notice.adapter"
import { FileLogReader } from "../infrastructure/adapters/secondary/logs/file-log-reader.adapter"
import { GetRecentLogsUseCase } from "../application/use-cases/logs/get-recent-logs.use-case"
import { ListLogFilesUseCase } from "../application/use-cases/logs/list-log-files.use-case"
import { GetUpdateStatusUseCase } from "../application/use-cases/updates/get-update-status.use-case"
import { CheckUpdatesUseCase } from "../application/use-cases/updates/check-updates.use-case"
import { ApplyUpdateUseCase } from "../application/use-cases/updates/apply-update.use-case"
import { RollbackUpdateUseCase } from "../application/use-cases/updates/rollback-update.use-case"
import { CreateBackupUseCase } from "../application/use-cases/updates/create-backup.use-case"
import { GitUpdateAdapter } from "../infrastructure/adapters/secondary/updates/git-update.adapter"
import { ReleaseUpdateAdapter } from "../infrastructure/adapters/secondary/updates/release-update.adapter"
import { ProcessRestarter } from "../infrastructure/adapters/secondary/app/process-restarter.adapter"
import { RestartAppUseCase } from "../application/use-cases/app/restart-app.use-case"
import type { UpdateController } from "../domain/ports/update-controller"
import {
  BackupService,
  type BackupDatabaseClient,
} from "../application/services/backup.service"
import { CreateConversationUseCase } from "../application/use-cases/conversation/create-conversation.use-case"
import { BranchConversationUseCase } from "../application/use-cases/conversation/branch-conversation.use-case"
import { GetConversationUseCase } from "../application/use-cases/conversation/get-conversation.use-case"
import { ListConversationMessagesUseCase } from "../application/use-cases/conversation/list-conversation-messages.use-case"
import { ListConversationsUseCase } from "../application/use-cases/conversation/list-conversations.use-case"
import { SendMessageUseCase } from "../application/use-cases/conversation/send-message.use-case"
import { EditMessageUseCase } from "../application/use-cases/conversation/edit-message.use-case"
import { DeleteMessageUseCase } from "../application/use-cases/conversation/delete-message.use-case"
import { RegenerateReplyUseCase } from "../application/use-cases/conversation/regenerate-reply.use-case"
import { RewindConversationUseCase } from "../application/use-cases/conversation/rewind-conversation.use-case"
import { ContinueConversationUseCase } from "../application/use-cases/conversation/continue-conversation.use-case"
import { CycleAlternativeUseCase } from "../application/use-cases/conversation/cycle-alternative.use-case"
import { UpdateConversationSettingsUseCase } from "../application/use-cases/conversation/update-conversation-settings.use-case"
import { UploadConversationCustomImageUseCase } from "../application/use-cases/conversation/upload-conversation-custom-image.use-case"
import { ApplyMemoryChangesUseCase } from "../application/use-cases/memory/apply-memory-changes.use-case"
import { ApplyAllMemoryChangesUseCase } from "../application/use-cases/memory/apply-all-memory-changes.use-case"
import { DecayConversationMemoryUseCase } from "../application/use-cases/memory/decay-conversation-memory.use-case"
import { CreateMemoryUseCase } from "../application/use-cases/memory/create-memory.use-case"
import { UpdateMemoryUseCase } from "../application/use-cases/memory/update-memory.use-case"
import { DeleteMemoryUseCase } from "../application/use-cases/memory/delete-memory.use-case"
import { ListMemoriesUseCase } from "../application/use-cases/memory/list-memories.use-case"
import { ListProposalsUseCase } from "../application/use-cases/memory/list-proposals.use-case"
import { GenerateConversationTitleUseCase } from "../application/use-cases/conversation/generate-conversation-title.use-case"
import { GetPromptContextUseCase } from "../application/use-cases/conversation/get-prompt-context.use-case"
import { ListSummariesUseCase } from "../application/use-cases/summary/list-summaries.use-case"
import { GenerateSummaryUseCase } from "../application/use-cases/summary/generate-summary.use-case"
import { CompactConversationUseCase } from "../application/use-cases/summary/compact-conversation.use-case"
import { ContextCompactionService } from "../application/services/context-compaction.service"
import { ConversationContextLoader } from "../application/services/conversation-context-loader.service"
import { ContextCompiler } from "../application/services/context-compiler.service"
import { ChatEngine } from "../application/services/chat-engine.service"
import { UpdateSummaryUseCase } from "../application/use-cases/summary/update-summary.use-case"
import { DeleteSummaryUseCase } from "../application/use-cases/summary/delete-summary.use-case"
import { ListProviderInstancesUseCase } from "../application/use-cases/provider/list-provider-instances.use-case"
import { CreateProviderInstanceUseCase } from "../application/use-cases/provider/create-provider-instance.use-case"
import { UpdateProviderInstanceUseCase } from "../application/use-cases/provider/update-provider-instance.use-case"
import { DeleteProviderInstanceUseCase } from "../application/use-cases/provider/delete-provider-instance.use-case"
import { ValidateProviderInstanceUseCase } from "../application/use-cases/provider/validate-provider-instance.use-case"
import { SetProviderModelUseCase } from "../application/use-cases/provider/set-provider-model.use-case"

export interface AppContainer {
  logger: Logger
  pino: PinoLogger
  database: Database
  healthCheck: HealthCheckUseCase
  listProviders: ListProvidersUseCase
  validateProviderConnection: ValidateProviderConnectionUseCase
  listProviderModels: ListProviderModelsUseCase
  getModelCapabilities: GetModelCapabilitiesUseCase
  getDefaultProvider: GetDefaultProviderUseCase
  configureDefaultProvider: ConfigureDefaultProviderUseCase
  settings: SettingsRepository
  providerRegistry: ProviderRegistry
  providerInstanceRepository: ProviderInstanceRepository
  characterRepository: CharacterRepository
  lorebookRepository: LorebookRepository
  playerCharacterRepository: PlayerCharacterRepository
  characterAssetRepository: CharacterAssetRepository
  characterAssetStorage: CharacterAssetVariantStorage
  conversationRepository: ConversationRepository
  messageRepository: MessageRepository
  memoryRepository: MemoryRepository
  memoryChangeProposalRepository: MemoryChangeProposalRepository
  promptContextBuilder: PromptContextBuilder
  createCharacter: CreateCharacterUseCase
  createPlayerCharacter: CreatePlayerCharacterUseCase
  listPlayerCharacters: ListPlayerCharactersUseCase
  updatePlayerCharacter: UpdatePlayerCharacterUseCase
  deletePlayerCharacter: DeletePlayerCharacterUseCase
  getCharacter: GetCharacterUseCase
  getCharacterCard: GetCharacterCardUseCase
  updateCharacterCard: UpdateCharacterCardUseCase
  listCharacters: ListCharactersUseCase
  updateCharacter: UpdateCharacterUseCase
  updateCharacterProfileImage: UpdateCharacterProfileImageUseCase
  exportCharacter: ExportCharacterUseCase
  importCharacter: ImportCharacterUseCase
  previewSillyTavernCard: PreviewSillyTavernCardUseCase
  importSillyTavernCard: ImportSillyTavernCardUseCase
  exportSillyTavernCard: ExportSillyTavernCardUseCase
  previewLorebook: PreviewLorebookUseCase
  importLorebook: ImportLorebookUseCase
  exportLorebook: ExportLorebookUseCase
  getLorebook: GetLorebookUseCase
  updateLorebook: UpdateLorebookUseCase
  createLorebookEntry: CreateLorebookEntryUseCase
  updateLorebookEntry: UpdateLorebookEntryUseCase
  deleteLorebookEntry: DeleteLorebookEntryUseCase
  reorderLorebookEntries: ReorderLorebookEntriesUseCase
  listLorebooks: ListLorebooksUseCase
  getLorebookById: GetLorebookByIdUseCase
  listLorebookVersions: ListLorebookVersionsUseCase
  getLorebookVersion: GetLorebookVersionUseCase
  createLorebook: CreateLorebookUseCase
  updateLorebookById: UpdateLorebookByIdUseCase
  deleteCharacter: DeleteCharacterUseCase
  listCharacterVersions: ListCharacterVersionsUseCase
  uploadCharacterAsset: UploadCharacterAssetUseCase
  getCharacterAsset: GetCharacterAssetUseCase
  backfillCharacterAssetVariants: BackfillCharacterAssetVariantsUseCase
  applySettingsTemplate: ApplySettingsTemplateUseCase
  maxProfileImageBytes: number
  createConversation: CreateConversationUseCase
  branchConversation: BranchConversationUseCase
  getConversation: GetConversationUseCase
  listConversationMessages: ListConversationMessagesUseCase
  listConversations: ListConversationsUseCase
  sendMessage: SendMessageUseCase
  editMessage: EditMessageUseCase
  deleteMessage: DeleteMessageUseCase
  regenerateReply: RegenerateReplyUseCase
  rewindConversation: RewindConversationUseCase
  continueConversation: ContinueConversationUseCase
  getPromptContext: GetPromptContextUseCase
  generateConversationTitle: GenerateConversationTitleUseCase
  cycleAlternative: CycleAlternativeUseCase
  updateConversationSettings: UpdateConversationSettingsUseCase
  uploadConversationCustomImage: UploadConversationCustomImageUseCase
  listProviderInstances: ListProviderInstancesUseCase
  createProviderInstance: CreateProviderInstanceUseCase
  updateProviderInstance: UpdateProviderInstanceUseCase
  deleteProviderInstance: DeleteProviderInstanceUseCase
  validateProviderInstance: ValidateProviderInstanceUseCase
  setProviderModel: SetProviderModelUseCase

  // Tunnel (phone access)
  getTunnelStatus: GetTunnelStatusUseCase
  enableTunnel: EnableTunnelUseCase
  disableTunnel: DisableTunnelUseCase

  // LAN (home network access)
  getLanStatus: GetLanStatusUseCase
  enableLanAccess: EnableLanAccessUseCase
  disableLanAccess: DisableLanAccessUseCase

  // Phone access preferences (both modes) and their background rules
  getPhoneAccessPreferences: GetPhoneAccessPreferencesUseCase
  updatePhoneAccessPreferences: UpdatePhoneAccessPreferencesUseCase
  getPhoneAccessNotice: GetPhoneAccessNoticeUseCase
  phoneAccess: PhoneAccessService
  phoneAccessActivity: PhoneAccessActivity

  // Logs (in-app viewer and downloadable bundle)
  getRecentLogs: GetRecentLogsUseCase
  listLogFiles: ListLogFilesUseCase

  // Updates
  getUpdateStatus: GetUpdateStatusUseCase
  checkUpdates: CheckUpdatesUseCase
  applyUpdate: ApplyUpdateUseCase
  rollbackUpdate: RollbackUpdateUseCase
  createBackup: CreateBackupUseCase
  restartApp: RestartAppUseCase

  summaryRepository: SummaryRepository

  // Summary
  listSummaries: ListSummariesUseCase
  generateSummary: GenerateSummaryUseCase
  compactConversation: CompactConversationUseCase
  contextCompaction: ContextCompactionService
  chatEngine: ChatEngine
  updateSummary: UpdateSummaryUseCase
  deleteSummary: DeleteSummaryUseCase

  // Memory
  applyMemoryChanges: ApplyMemoryChangesUseCase
  applyAllMemoryChanges: ApplyAllMemoryChangesUseCase
  createMemory: CreateMemoryUseCase
  updateMemory: UpdateMemoryUseCase
  deleteMemory: DeleteMemoryUseCase
  listMemories: ListMemoriesUseCase
  listProposals: ListProposalsUseCase
  decayMemories: DecayConversationMemoryUseCase
}

export interface BuildContainerOptions {
  logger: Logger
  pino: PinoLogger
  database: Database
  databasePath: string
  dataDir: string
  maxProfileImageBytes: number
  maxProfileImagePixels: number
  ollamaBaseUrl: string
  providerTimeoutMs: number
  providerStreamingTimeoutMs: number
  tunnelTargetUrl: string
  tailscaleBin?: string
  lanPort: number
  updateRepoDir: string
  updateBranch?: string
  updateInstall: boolean
  updatePackagedRoot?: string
  updateRepository?: string
  updateApiBaseUrl?: string
  backupDir: string
  gitBin?: string
  /** Folder with the rotating log files (for the in-app viewer). */
  logDir: string
}

export const buildContainer = ({
  logger,
  pino,
  database,
  databasePath,
  dataDir,
  maxProfileImageBytes,
  maxProfileImagePixels,
  ollamaBaseUrl,
  providerTimeoutMs,
  providerStreamingTimeoutMs,
  tunnelTargetUrl,
  tailscaleBin,
  lanPort,
  updateRepoDir,
  updateBranch,
  updateInstall,
  updatePackagedRoot,
  updateRepository,
  updateApiBaseUrl,
  backupDir,
  gitBin,
  logDir,
}: BuildContainerOptions): AppContainer => {
  const settings: SettingsRepository = new DrizzleSettingsRepository(database)
  const providerRegistry: ProviderRegistry = new ProviderRegistryImpl({
    settings,
    ollamaBaseUrl,
    timeoutMs: providerTimeoutMs,
    streamingTimeoutMs: providerStreamingTimeoutMs,
    logger,
  })
  const characterRepository: CharacterRepository & CharacterSummaryRepository =
    new DrizzleCharacterRepository(database)
  const lorebookRepository: LorebookRepository =
    new DrizzleLorebookRepository(database)
  const playerCharacterRepository: PlayerCharacterRepository = new DrizzlePlayerCharacterRepository(database)
  const characterAssetRepository: CharacterAssetMaintenanceRepository &
    CharacterAssetLookupRepository =
    new DrizzleCharacterAssetRepository(database)
  const characterAssetStorage: CharacterAssetVariantStorage =
    new FilesystemCharacterAssetStorage(dataDir)
  const characterAssetImageProcessor = new SharpCharacterAssetImageProcessor(
    maxProfileImagePixels,
  )
  const storeCharacterAsset = new StoreCharacterAssetService(
    characterAssetRepository,
    characterAssetStorage,
    characterAssetImageProcessor,
    maxProfileImageBytes,
  )
  const conversationRepository: ConversationRepository = new DrizzleConversationRepository(database)
  const messageRepository: MessageRepository & MessageHistoryRepository =
    new DrizzleMessageRepository(database)
  const memoryRepository: MemoryRepository =
    new DrizzleMemoryRepository(database)
  const memoryChangeProposalRepository: MemoryChangeProposalRepository =
    new DrizzleMemoryChangeProposalRepository(database)
  const promptContextBuilder: PromptContextBuilder = new PromptContextBuilderImpl()
  const summaryRepository: SummaryRepository = new DrizzleSummaryRepository(database)
  const providerInstanceRepository: ProviderInstanceRepository =
    new DrizzleProviderInstanceRepository(database)
  // Probe claims are shared across requests; the cache is lost on restart.
  const modelCapabilitiesCache = new ModelCapabilitiesCache()
  const getDefaultProvider = new GetDefaultProviderUseCase(settings, providerInstanceRepository)

  const conversationContextLoader = new ConversationContextLoader({
    conversationRepository,
    characterRepository,
    messageHistoryRepository: messageRepository,
    messageRepository,
    memoryRepository,
    summaryRepository,
    playerCharacterRepository,
    lorebookRepository,
  })
  const contextCompiler = new ContextCompiler(promptContextBuilder)

  const tunnelController = new TailscaleServeAdapter({
    targetUrl: tunnelTargetUrl,
    binPath: tailscaleBin,
  })
  const phoneAccessActivity: PhoneAccessActivity =
    new InMemoryPhoneAccessActivity()
  const phoneAccessNotices = new InMemoryPhoneAccessNoticeStore()
  const getTunnelStatus = new GetTunnelStatusUseCase(tunnelController)
  const enableTunnel = new EnableTunnelUseCase(tunnelController, phoneAccessActivity)
  const disableTunnel = new DisableTunnelUseCase(tunnelController)

  const lanAccessController = new LanProxyServerAdapter({
    targetUrl: tunnelTargetUrl,
    port: lanPort,
  })
  const getLanStatus = new GetLanStatusUseCase(lanAccessController)
  const enableLanAccess = new EnableLanAccessUseCase(lanAccessController, phoneAccessActivity)
  const disableLanAccess = new DisableLanAccessUseCase(lanAccessController)

  const getPhoneAccessPreferences = new GetPhoneAccessPreferencesUseCase(settings)
  const updatePhoneAccessPreferences = new UpdatePhoneAccessPreferencesUseCase(settings)
  const getPhoneAccessNotice = new GetPhoneAccessNoticeUseCase(phoneAccessNotices)
  const phoneAccess = new PhoneAccessService({
    settings,
    tunnel: tunnelController,
    lan: lanAccessController,
    activity: phoneAccessActivity,
    notices: phoneAccessNotices,
    logger,
    // Auto-enable on start only runs in the packaged app.
    packaged: Boolean(updatePackagedRoot),
  })

  const logReader: LogReader = new FileLogReader(logDir)
  const getRecentLogs = new GetRecentLogsUseCase(logReader)
  const listLogFiles = new ListLogFilesUseCase(logReader)

  const backupService = new BackupService({
    // drizzle keeps the raw better-sqlite3 client on `$client` (not typed).
    client: (database as unknown as { $client: BackupDatabaseClient }).$client,
    dataDir,
    databasePath,
    logDir,
    backupDir,
  })
  const updateController: UpdateController = updatePackagedRoot
    ? new ReleaseUpdateAdapter({
        packagedRoot: updatePackagedRoot,
        repository: updateRepository,
        apiBaseUrl: updateApiBaseUrl,
        backup: () => backupService.create(),
      })
    : new GitUpdateAdapter({
        repoDir: updateRepoDir,
        branch: updateBranch,
        install: updateInstall,
        gitBin,
        backup: () => backupService.create(),
      })
  const getUpdateStatus = new GetUpdateStatusUseCase(updateController)
  const checkUpdates = new CheckUpdatesUseCase(updateController)
  const applyUpdate = new ApplyUpdateUseCase(updateController)
  const rollbackUpdate = new RollbackUpdateUseCase(updateController)
  const createBackup = new CreateBackupUseCase(updateController)
  const restartApp = new RestartAppUseCase(
    new ProcessRestarter({ packagedRoot: updatePackagedRoot }),
  )

  const applyAllMemoryChanges = new ApplyAllMemoryChangesUseCase(
    memoryRepository,
    memoryChangeProposalRepository,
    logger,
  )

  const decayMemories = new DecayConversationMemoryUseCase(
    conversationRepository,
    memoryRepository,
    messageRepository,
    logger,
  )

  const generateConversationTitle = new GenerateConversationTitleUseCase(
    conversationRepository,
    messageRepository,
    summaryRepository,
    characterRepository,
    providerRegistry,
    getDefaultProvider,
    providerInstanceRepository,
    logger,
  )

  const generateSummary = new GenerateSummaryUseCase(
    conversationRepository,
    messageRepository,
    messageRepository,
    characterRepository,
    memoryRepository,
    summaryRepository,
    providerRegistry,
    getDefaultProvider,
    providerInstanceRepository,
    logger,
  )

  const contextCompaction = new ContextCompactionService(
    promptContextBuilder,
    generateSummary,
    logger,
  )

  const chatEngine = new ChatEngine({
    messageRepository,
    messageHistoryRepository: messageRepository,
    characterRepository,
    memoryRepository,
    memoryChangeProposalRepository,
    summaryRepository,
    playerCharacterRepository,
    promptContextBuilder,
    contextCompaction,
    contextLoader: conversationContextLoader,
    contextCompiler,
    providerRegistry,
    providerInstanceRepository,
    getDefaultProvider,
    applyAllMemoryChanges,
    generateConversationTitle,
    logger,
  })

  const compactConversation = new CompactConversationUseCase(
    conversationRepository,
    chatEngine,
  )

  const sendMessage = new SendMessageUseCase(
    conversationRepository,
    messageRepository,
    messageRepository,
    characterRepository,
    memoryRepository,
    memoryChangeProposalRepository,
    promptContextBuilder,
    playerCharacterRepository,
    providerRegistry,
    logger,
    getDefaultProvider,
    providerInstanceRepository,
    applyAllMemoryChanges,
    summaryRepository,
    contextCompaction,
    generateConversationTitle,
    decayMemories,
    chatEngine,
  )

  const regenerateReply = new RegenerateReplyUseCase(
    conversationRepository,
    messageRepository,
    messageRepository,
    characterRepository,
    memoryRepository,
    memoryChangeProposalRepository,
    promptContextBuilder,
    playerCharacterRepository,
    providerRegistry,
    logger,
    getDefaultProvider,
    providerInstanceRepository,
    applyAllMemoryChanges,
    summaryRepository,
    contextCompaction,
    generateConversationTitle,
    chatEngine,
  )

  const continueConversation = new ContinueConversationUseCase(
    conversationRepository,
    messageRepository,
    messageRepository,
    characterRepository,
    memoryRepository,
    memoryChangeProposalRepository,
    promptContextBuilder,
    playerCharacterRepository,
    providerRegistry,
    logger,
    getDefaultProvider,
    providerInstanceRepository,
    applyAllMemoryChanges,
    summaryRepository,
    contextCompaction,
    generateConversationTitle,
    chatEngine,
  )

  const updateConversationSettings = new UpdateConversationSettingsUseCase(
    conversationRepository,
    characterRepository,
    providerRegistry,
    providerInstanceRepository,
    logger,
    characterAssetRepository,
    characterAssetStorage,
    playerCharacterRepository,
  )

  return {
    logger,
    pino,
    database,
    healthCheck: new HealthCheckUseCase(new DrizzleHealthRepository(database)),
    listProviders: new ListProvidersUseCase(providerRegistry),
    validateProviderConnection: new ValidateProviderConnectionUseCase(
      providerRegistry,
      logger,
    ),
    listProviderModels: new ListProviderModelsUseCase(
      providerRegistry,
      providerInstanceRepository,
      logger,
    ),
    getModelCapabilities: new GetModelCapabilitiesUseCase({
      registry: providerRegistry,
      providerInstanceRepository,
      settings,
      cache: modelCapabilitiesCache,
      curatedTable: CURATED_MODEL_CATALOG,
      heuristicForModel: inferModelCapabilitiesHeuristic,
      defaults: { contextWindow: 4_096, maxOutputTokens: 2_048 },
      logger,
    }),
    getDefaultProvider,
    configureDefaultProvider: new ConfigureDefaultProviderUseCase(
      providerRegistry,
      settings,
      providerInstanceRepository,
      logger,
    ),
    setProviderModel: new SetProviderModelUseCase(
      providerRegistry,
      settings,
      providerInstanceRepository,
      logger,
    ),
    getTunnelStatus,
    enableTunnel,
    disableTunnel,
    getLanStatus,
    enableLanAccess,
    disableLanAccess,
    getPhoneAccessPreferences,
    updatePhoneAccessPreferences,
    getPhoneAccessNotice,
    phoneAccess,
    phoneAccessActivity,
    getRecentLogs,
    listLogFiles,
    getUpdateStatus,
    checkUpdates,
    applyUpdate,
    rollbackUpdate,
    createBackup,
    restartApp,
    settings,
    providerRegistry,
    providerInstanceRepository,
    characterRepository,
    lorebookRepository,
    playerCharacterRepository,
    characterAssetRepository,
    characterAssetStorage,
    conversationRepository,
    messageRepository,
    memoryRepository,
    memoryChangeProposalRepository,
    promptContextBuilder,
    summaryRepository,
    listSummaries: new ListSummariesUseCase(summaryRepository),
    generateSummary,
    compactConversation,
    contextCompaction,
    chatEngine,
    updateSummary: new UpdateSummaryUseCase(summaryRepository),
    deleteSummary: new DeleteSummaryUseCase(summaryRepository),
    createCharacter: new CreateCharacterUseCase(
      characterRepository,
      lorebookRepository,
    ),
    getCharacter: new GetCharacterUseCase(
      characterRepository,
      lorebookRepository,
    ),
    getCharacterCard: new GetCharacterCardUseCase({
      characterRepository,
      lorebookRepository,
    }),
    updateCharacterCard: new UpdateCharacterCardUseCase({
      characterRepository,
      lorebookRepository,
    }),
    listCharacters: new ListCharactersUseCase(
      characterRepository,
      characterAssetRepository,
    ),
    updateCharacter: new UpdateCharacterUseCase(characterRepository, {
      lorebookRepository,
    }),
    updateCharacterProfileImage: new UpdateCharacterProfileImageUseCase(
      characterRepository,
      characterAssetRepository,
    ),
    exportCharacter: new ExportCharacterUseCase(
      characterRepository,
      conversationRepository,
      messageRepository,
      memoryRepository,
      summaryRepository,
      characterAssetRepository,
      characterAssetStorage,
      lorebookRepository,
    ),
    importCharacter: new ImportCharacterUseCase(
      characterRepository,
      conversationRepository,
      messageRepository,
      memoryRepository,
      summaryRepository,
      storeCharacterAsset,
      lorebookRepository,
    ),
    previewSillyTavernCard: new PreviewSillyTavernCardUseCase({
      characterRepository,
      lorebookRepository,
      cardPng: pngCardAdapter,
    }),
    importSillyTavernCard: new ImportSillyTavernCardUseCase({
      characterRepository,
      lorebookRepository,
      storeCharacterAsset,
      cardPng: pngCardAdapter,
    }),
    exportSillyTavernCard: new ExportSillyTavernCardUseCase({
      characterRepository,
      lorebookRepository,
      cardPng: pngCardAdapter,
      assetRepository: characterAssetRepository,
      assetStorage: characterAssetStorage,
    }),
    previewLorebook: new PreviewLorebookUseCase({ lorebookRepository }),
    importLorebook: new ImportLorebookUseCase({ lorebookRepository }),
    exportLorebook: new ExportLorebookUseCase({ lorebookRepository }),
    getLorebook: new GetLorebookUseCase({ lorebookRepository }),
    updateLorebook: new UpdateLorebookUseCase({ lorebookRepository }),
    createLorebookEntry: new CreateLorebookEntryUseCase({
      lorebookRepository,
    }),
    updateLorebookEntry: new UpdateLorebookEntryUseCase({
      lorebookRepository,
    }),
    deleteLorebookEntry: new DeleteLorebookEntryUseCase({
      lorebookRepository,
    }),
    reorderLorebookEntries: new ReorderLorebookEntriesUseCase({
      lorebookRepository,
    }),
    listLorebooks: new ListLorebooksUseCase({ lorebookRepository }),
    getLorebookById: new GetLorebookByIdUseCase({ lorebookRepository }),
    listLorebookVersions: new ListLorebookVersionsUseCase({
      lorebookRepository,
    }),
    getLorebookVersion: new GetLorebookVersionUseCase({ lorebookRepository }),
    createLorebook: new CreateLorebookUseCase({ lorebookRepository }),
    updateLorebookById: new UpdateLorebookByIdUseCase({ lorebookRepository }),
    createPlayerCharacter: new CreatePlayerCharacterUseCase(playerCharacterRepository),
    listPlayerCharacters: new ListPlayerCharactersUseCase(playerCharacterRepository),
    updatePlayerCharacter: new UpdatePlayerCharacterUseCase(playerCharacterRepository),
    deletePlayerCharacter: new DeletePlayerCharacterUseCase(playerCharacterRepository),
    deleteCharacter: new DeleteCharacterUseCase(characterRepository),
    listCharacterVersions: new ListCharacterVersionsUseCase(characterRepository),
    uploadCharacterAsset: new UploadCharacterAssetUseCase(
      characterRepository,
      storeCharacterAsset,
    ),
    getCharacterAsset: new GetCharacterAssetUseCase(
      characterAssetRepository,
      characterAssetStorage,
    ),
    backfillCharacterAssetVariants: new BackfillCharacterAssetVariantsUseCase(
      characterAssetRepository,
      characterAssetStorage,
      characterAssetImageProcessor,
      conversationRepository,
    ),
    maxProfileImageBytes,
    createConversation: new CreateConversationUseCase(
      conversationRepository,
      messageRepository,
      characterRepository,
      getDefaultProvider,
      providerInstanceRepository,
      characterAssetRepository,
    ),
    branchConversation: new BranchConversationUseCase(
      conversationRepository,
      messageRepository,
      memoryRepository,
      summaryRepository,
      characterRepository,
      characterAssetRepository,
    ),
    getConversation: new GetConversationUseCase(
      conversationRepository,
      characterRepository,
      characterAssetRepository,
      messageRepository,
    ),
    listConversationMessages: new ListConversationMessagesUseCase(
      conversationRepository,
      messageRepository,
    ),
    listConversations: new ListConversationsUseCase(
      conversationRepository,
      messageRepository,
      characterRepository,
      characterAssetRepository,
    ),
    sendMessage,
    editMessage: new EditMessageUseCase(
      conversationRepository,
      messageRepository,
    ),
    deleteMessage: new DeleteMessageUseCase(
      conversationRepository,
      messageRepository,
    ),
    regenerateReply,
    getPromptContext: new GetPromptContextUseCase(
      conversationContextLoader,
      contextCompiler,
      contextCompaction,
    ),
    rewindConversation: new RewindConversationUseCase(
      conversationRepository,
      messageRepository,
      memoryChangeProposalRepository,
      summaryRepository,
    ),
    continueConversation,
    generateConversationTitle,
    cycleAlternative: new CycleAlternativeUseCase(
      conversationRepository,
      messageRepository,
    ),
    updateConversationSettings,
    applySettingsTemplate: new ApplySettingsTemplateUseCase(
      characterRepository,
      conversationRepository,
      providerInstanceRepository,
      updateConversationSettings,
      characterAssetRepository,
      storeCharacterAsset,
    ),
    uploadConversationCustomImage: new UploadConversationCustomImageUseCase(
      conversationRepository,
      characterRepository,
      storeCharacterAsset,
    ),
    listProviderInstances: new ListProviderInstancesUseCase(
      providerInstanceRepository,
    ),
    createProviderInstance: new CreateProviderInstanceUseCase(
      providerInstanceRepository,
      logger,
    ),
    updateProviderInstance: new UpdateProviderInstanceUseCase(
      providerInstanceRepository,
      logger,
      modelCapabilitiesCache,
    ),
    deleteProviderInstance: new DeleteProviderInstanceUseCase(
      providerInstanceRepository,
      conversationRepository,
      settings,
      modelCapabilitiesCache,
    ),
    validateProviderInstance: new ValidateProviderInstanceUseCase(
      providerInstanceRepository,
      providerRegistry,
      logger,
    ),
    applyMemoryChanges: new ApplyMemoryChangesUseCase(
      memoryRepository,
      memoryChangeProposalRepository,
      logger,
    ),
    applyAllMemoryChanges,
    createMemory: new CreateMemoryUseCase(memoryRepository),
    updateMemory: new UpdateMemoryUseCase(memoryRepository),
    deleteMemory: new DeleteMemoryUseCase(memoryRepository),
    listMemories: new ListMemoriesUseCase(memoryRepository, messageRepository),
    listProposals: new ListProposalsUseCase(memoryChangeProposalRepository),
    decayMemories,
  }
}
