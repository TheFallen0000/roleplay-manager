import type { Database } from "../infrastructure/config/database"
import type { Logger } from "../domain/ports/logger.port"
import type { Logger as PinoLogger } from "pino"
import { HealthCheckUseCase } from "../application/use-cases/health/health-check.use-case"
import { ListProvidersUseCase } from "../application/use-cases/provider/list-providers.use-case"
import { ValidateProviderConnectionUseCase } from "../application/use-cases/provider/validate-provider-connection.use-case"
import { ListProviderModelsUseCase } from "../application/use-cases/provider/list-provider-models.use-case"
import { GetDefaultProviderUseCase } from "../application/use-cases/provider/get-default-provider.use-case"
import { ConfigureDefaultProviderUseCase } from "../application/use-cases/provider/configure-default-provider.use-case"
import { DrizzleSettingsRepository } from "../infrastructure/adapters/secondary/drizzle/repositories/drizzle-settings.repository"
import { DrizzleCharacterRepository } from "../infrastructure/adapters/secondary/drizzle/repositories/drizzle-character.repository"
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
import type { CharacterRepository } from "../domain/ports/character.repository"
import type { PlayerCharacterRepository } from "../domain/ports/player-character.repository"
import type {
  CharacterAssetMaintenanceRepository,
  CharacterAssetRepository,
  CharacterAssetVariantStorage,
} from "../domain/ports/character-asset.repository"
import type { ConversationRepository } from "../domain/ports/conversation.repository"
import type { MessageRepository } from "../domain/ports/message.repository"
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
import { StoreCharacterAssetService } from "../application/services/store-character-asset.service"
import { SharpCharacterAssetImageProcessor } from "../infrastructure/adapters/secondary/images/sharp-character-asset-image-processor"
import { CreateConversationUseCase } from "../application/use-cases/conversation/create-conversation.use-case"
import { BranchConversationUseCase } from "../application/use-cases/conversation/branch-conversation.use-case"
import { GetConversationUseCase } from "../application/use-cases/conversation/get-conversation.use-case"
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
  getDefaultProvider: GetDefaultProviderUseCase
  configureDefaultProvider: ConfigureDefaultProviderUseCase
  settings: SettingsRepository
  providerRegistry: ProviderRegistry
  providerInstanceRepository: ProviderInstanceRepository
  characterRepository: CharacterRepository
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
  listCharacters: ListCharactersUseCase
  updateCharacter: UpdateCharacterUseCase
  updateCharacterProfileImage: UpdateCharacterProfileImageUseCase
  exportCharacter: ExportCharacterUseCase
  importCharacter: ImportCharacterUseCase
  deleteCharacter: DeleteCharacterUseCase
  listCharacterVersions: ListCharacterVersionsUseCase
  uploadCharacterAsset: UploadCharacterAssetUseCase
  getCharacterAsset: GetCharacterAssetUseCase
  backfillCharacterAssetVariants: BackfillCharacterAssetVariantsUseCase
  maxProfileImageBytes: number
  createConversation: CreateConversationUseCase
  branchConversation: BranchConversationUseCase
  getConversation: GetConversationUseCase
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

  summaryRepository: SummaryRepository

  // Summary
  listSummaries: ListSummariesUseCase
  generateSummary: GenerateSummaryUseCase
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
  dataDir: string
  maxProfileImageBytes: number
  maxProfileImagePixels: number
  ollamaBaseUrl: string
  providerTimeoutMs: number
  providerStreamingTimeoutMs: number
}

export const buildContainer = ({
  logger,
  pino,
  database,
  dataDir,
  maxProfileImageBytes,
  maxProfileImagePixels,
  ollamaBaseUrl,
  providerTimeoutMs,
  providerStreamingTimeoutMs,
}: BuildContainerOptions): AppContainer => {
  const settings: SettingsRepository = new DrizzleSettingsRepository(database)
  const providerRegistry: ProviderRegistry = new ProviderRegistryImpl({
    settings,
    ollamaBaseUrl,
    timeoutMs: providerTimeoutMs,
    streamingTimeoutMs: providerStreamingTimeoutMs,
    logger,
  })
  const characterRepository: CharacterRepository = new DrizzleCharacterRepository(database)
  const playerCharacterRepository: PlayerCharacterRepository = new DrizzlePlayerCharacterRepository(database)
  const characterAssetRepository: CharacterAssetMaintenanceRepository =
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
  const messageRepository: MessageRepository = new DrizzleMessageRepository(database)
  const memoryRepository: MemoryRepository =
    new DrizzleMemoryRepository(database)
  const memoryChangeProposalRepository: MemoryChangeProposalRepository =
    new DrizzleMemoryChangeProposalRepository(database)
  const promptContextBuilder: PromptContextBuilder = new PromptContextBuilderImpl()
  const summaryRepository: SummaryRepository = new DrizzleSummaryRepository(database)
  const providerInstanceRepository: ProviderInstanceRepository =
    new DrizzleProviderInstanceRepository(database)
  const getDefaultProvider = new GetDefaultProviderUseCase(settings, providerInstanceRepository)

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
    characterRepository,
    providerRegistry,
    getDefaultProvider,
    providerInstanceRepository,
    logger,
  )

  const generateSummary = new GenerateSummaryUseCase(
    conversationRepository,
    messageRepository,
    characterRepository,
    memoryRepository,
    summaryRepository,
    providerRegistry,
    getDefaultProvider,
    providerInstanceRepository,
    logger,
  )

  const sendMessage = new SendMessageUseCase(
    conversationRepository,
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
    generateSummary,
    generateConversationTitle,
    decayMemories,
  )

  const regenerateReply = new RegenerateReplyUseCase(
    conversationRepository,
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
    generateSummary,
  )

  const continueConversation = new ContinueConversationUseCase(
    conversationRepository,
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
    generateSummary,
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
    settings,
    providerRegistry,
    providerInstanceRepository,
    characterRepository,
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
    updateSummary: new UpdateSummaryUseCase(summaryRepository),
    deleteSummary: new DeleteSummaryUseCase(summaryRepository),
    createCharacter: new CreateCharacterUseCase(characterRepository),
    getCharacter: new GetCharacterUseCase(characterRepository),
    listCharacters: new ListCharactersUseCase(
      characterRepository,
      characterAssetRepository,
    ),
    updateCharacter: new UpdateCharacterUseCase(characterRepository),
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
    ),
    importCharacter: new ImportCharacterUseCase(
      characterRepository,
      conversationRepository,
      messageRepository,
      memoryRepository,
      summaryRepository,
      storeCharacterAsset,
    ),
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
      conversationRepository,
      characterRepository,
      messageRepository,
      memoryRepository,
      summaryRepository,
      promptContextBuilder,
      playerCharacterRepository,
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
    updateConversationSettings: new UpdateConversationSettingsUseCase(
      conversationRepository,
      characterRepository,
      providerRegistry,
      providerInstanceRepository,
      logger,
      characterAssetRepository,
      characterAssetStorage,
      playerCharacterRepository,
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
    ),
    deleteProviderInstance: new DeleteProviderInstanceUseCase(
      providerInstanceRepository,
      conversationRepository,
      settings,
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
    listMemories: new ListMemoriesUseCase(memoryRepository),
    listProposals: new ListProposalsUseCase(memoryChangeProposalRepository),
    decayMemories,
  }
}
