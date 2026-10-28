import { describe, it, expect, vi } from "vitest"

import { GenerateConversationTitleUseCase } from "./generate-conversation-title.use-case"
import type { ConversationRepository } from "../../../domain/ports/conversation.repository"
import type { CharacterRepository } from "../../../domain/ports/character.repository"
import type { SummaryRepository } from "../../../domain/ports/summary.repository"
import { buildMessageHistoryRepository } from "../../../test-utils/message-history"
import type { ProviderRegistry } from "../../../domain/ports/provider.port"
import type { GetDefaultProviderUseCase } from "../provider/get-default-provider.use-case"
import type { ProviderInstanceRepository } from "../../../domain/ports/provider-instance.repository"
import type { Logger } from "../../../domain/ports/logger.port"
import type { ProviderId } from "@workspace/shared/types/provider"
import { Conversation } from "../../../domain/entities/conversation.entity"
import { Message } from "../../../domain/entities/message.entity"
import { CharacterVersion } from "../../../domain/entities/character-version.entity"
import type { PromptContext } from "../../../domain/value-objects/prompt-context"

const now = new Date()

const version = CharacterVersion.create({
  id: "ver-1", characterId: "char-1", name: "TestChar",
  subtitle: null, profileImageAssetId: null,
  description: "A test character", instructions: null,
  greeting: "Hello!", versionNumber: 1, createdAt: now, cards: [],
})

const activeConv = Conversation.create({
  id: "conv-1",
  versionId: "ver-1",
  title: null,
  titleSource: null,
  model: "test-model",
  provider: "openai",
  providerInstanceId: null,
  recentMessageCount: 10,
  summaryFrequency: 20,
  temperature: 0.7,
  maxTokens: 2048,
  topP: 0.9,
  frequencyPenalty: 0,
  presencePenalty: 0,
  stopSequences: [],
  memoryProposalMode: "auto",
  createdAt: now,
  updatedAt: now,
})

const titleSetConv = Conversation.create({
  id: "conv-2",
  versionId: "ver-1",
  title: "Existing title",
  titleSource: "manual",
  model: "test-model",
  provider: "openai",
  providerInstanceId: null,
  recentMessageCount: 10,
  summaryFrequency: 20,
  temperature: 0.7,
  maxTokens: 2048,
  topP: 0.9,
  frequencyPenalty: 0,
  presencePenalty: 0,
  stopSequences: [],
  memoryProposalMode: "auto",
  createdAt: now,
  updatedAt: now,
})

const buildMessages = (count: number): Message[] =>
  Array.from({ length: count }, (_, i) =>
    Message.create({
      id: `msg-${i}`,
      conversationId: "conv-1",
      role: i % 2 === 0 ? "user" : "assistant",
      content: `Message ${i}`,
      position: i,
      alternatives: [],
      alternativesCursor: 0,
      createdAt: now,
      editedAt: null,
    }),
  )

const convRepo: ConversationRepository = {
  create: async (c) => c,
  findById: async (id) => {
    if (id === "nonexistent") return null
    if (id === "conv-2") return titleSetConv
    return activeConv
  },
  listByCharacterId: async () => [],
  listByCharacterIds: async () => [],
  existsByAssetId: async () => false,
  list: async () => [],
  update: async (c) => {
    updatedConv = c
    return c
  },
  updateSettings: async (_id, _s) => activeConv,
  clearProviderInstanceId: vi.fn(),
}

let updatedConv: Conversation | null = null

const summaryRepo: SummaryRepository = {
  findById: async () => null,
  findByConversationId: async () => [],
  findLatestByConversationId: async () => null,
  create: async (s) => s,
  update: async (s) => s,
  deleteById: async () => {},
  deleteByIds: async () => {},
}

const charRepo: CharacterRepository = {
  createWithFirstVersion: async () => ({ character: null as any, version }),
  findById: async () => null,
  list: async () => [],
  update: async (c) => c,
  delete: async () => {},
  findVersionById: async (id) => (id === "ver-1" ? version : null),
  findVersionsByCharacterId: async () => [],
  findMaxVersionNumber: async () => 0,
  saveVersion: async (v) => v,
  updateProfileImageAssetId: async () => {},
}

const getDefaultProvider = {
  execute: async () => ({
    provider: null as ProviderId | null,
    model: null as string | null,
    providerInstanceId: null as string | null,
    configured: false,
  }),
} as unknown as GetDefaultProviderUseCase

const providerInstanceRepo: ProviderInstanceRepository = {
  findById: async () => null,
  list: async () => [],
  create: async () => ({
    id: "inst-1",
    kind: "ollama",
    name: "test",
    url: "http://localhost:11434",
    hasApiKey: false,
    apiKey: null,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  }),
  update: async () => ({
    id: "inst-1",
    kind: "ollama",
    name: "test",
    url: "http://localhost:11434",
    hasApiKey: false,
    apiKey: null,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  }),
  delete: async () => {},
}

const logger: Logger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
  child: vi.fn(() => logger),
}

const providerRegistry: ProviderRegistry = {
  listRegistered: () => ["openai"] as any,
  getAdapter: async (id) => {
    if (id === ("openai" as ProviderId)) {
      return {
        validateConnection: async () => ({ status: "ok" } as any),
        listModels: async () => ({ models: [], manualEntryRequired: false }),
        generateStreaming: async function* (_context: PromptContext, _options?: any) {
          yield { content: "Nueva Aventura" }
        },
      }
    }
    return null
  },
  createAdapter: (_instance) => ({
    validateConnection: async () => ({ status: "ok" } as any),
    listModels: async () => ({ models: [], manualEntryRequired: false }),
    generateStreaming: async function* (_context: PromptContext, _options?: any) {
      yield { content: "Nueva Aventura" }
    },
  }),
}

function buildUseCase() {
  updatedConv = null
  return new GenerateConversationTitleUseCase(
    convRepo,
    buildMessageHistoryRepository(() => buildMessages(4)),
    summaryRepo,
    charRepo,
    providerRegistry,
    getDefaultProvider,
    providerInstanceRepo,
    logger,
  )
}

describe("GenerateConversationTitleUseCase", () => {
  it("genera un título y lo persiste con titleSource=auto", async () => {
    const useCase = buildUseCase()
    const result = await useCase.execute("conv-1")

    expect(result.title).toBe("Nueva Aventura")
    expect(updatedConv).not.toBeNull()
    expect(updatedConv!.title).toBe("Nueva Aventura")
    expect(updatedConv!.titleSource).toBe("auto")
  })

  it("pide el título en el idioma de la conversación y no fuerza español", async () => {
    let captured: PromptContext | null = null
    const capturingRegistry: ProviderRegistry = {
      ...providerRegistry,
      getAdapter: async () => ({
        validateConnection: async () => ({ status: "ok" } as any),
        listModels: async () => ({ models: [], manualEntryRequired: false }),
        generateStreaming: async function* (context: PromptContext) {
          captured = context
          yield { content: "A New Adventure" }
        },
      }),
    }
    const useCase = new GenerateConversationTitleUseCase(
      convRepo,
      buildMessageHistoryRepository(() => buildMessages(4)),
      summaryRepo,
      charRepo,
      capturingRegistry,
      getDefaultProvider,
      providerInstanceRepo,
      logger,
    )

    const result = await useCase.execute("conv-1", { locale: "en" })

    expect(result.title).toBe("A New Adventure")
    expect(captured).not.toBeNull()
    expect(captured!.systemPrompt).toContain(
      "same language as the conversation",
    )
    expect(captured!.systemPrompt).not.toContain("español")
    expect(captured!.systemPrompt).toContain("English")
    expect(captured!.messages[0]!.content).toContain("Character: TestChar")
    expect(captured!.messages[0]!.content).toContain("User: Message 0")
  })

  it("no sobrescribe un título manual en el flujo automático", async () => {
    const useCase = buildUseCase()
    const result = await useCase.execute("conv-2")

    expect(result.title).toBe("Existing title")
    expect(updatedConv).toBeNull()
  })

  it("permite regenerar explícitamente un título manual", async () => {
    const useCase = buildUseCase()
    const result = await useCase.execute("conv-2", { force: true })

    expect(result.title).toBe("Nueva Aventura")
    expect(updatedConv).not.toBeNull()
    expect(updatedConv!.title).toBe("Nueva Aventura")
    expect(updatedConv!.titleSource).toBe("auto")
  })

  it("lanza ConversationNotFoundError si la conversación no existe", async () => {
    const useCase = buildUseCase()
    await expect(useCase.execute("nonexistent")).rejects.toThrow(
      "Conversation with id 'nonexistent' not found.",
    )
  })

  it("lanza error si la conversación no tiene mensajes", async () => {
    const useCase = new GenerateConversationTitleUseCase(
      convRepo,
      buildMessageHistoryRepository(() => []),
      summaryRepo,
      charRepo,
      providerRegistry,
      getDefaultProvider,
      providerInstanceRepo,
      logger,
    )
    await expect(useCase.execute("conv-1")).rejects.toThrow(
      "Cannot generate title: conversation has no messages.",
    )
  })
})
