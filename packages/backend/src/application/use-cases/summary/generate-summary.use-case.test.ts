import { describe, it, expect, vi } from "vitest"

import { GenerateSummaryUseCase } from "./generate-summary.use-case"
import type { DefaultProviderConfig } from "@workspace/shared/types/provider"
import type { ConversationRepository } from "../../../domain/ports/conversation.repository"
import type { MessageRepository } from "../../../domain/ports/message.repository"
import { buildMessageHistoryRepository } from "../../../test-utils/message-history"
import type { CharacterRepository } from "../../../domain/ports/character.repository"
import type { MemoryRepository } from "../../../domain/ports/memory.repository"
import type { SummaryRepository } from "../../../domain/ports/summary.repository"
import type { ProviderRegistry, ProviderPort } from "../../../domain/ports/provider.port"
import type { ProviderInstanceRepository } from "../../../domain/ports/provider-instance.repository"
import { GetDefaultProviderUseCase } from "../provider/get-default-provider.use-case"
import type { Logger } from "../../../domain/ports/logger.port"
import type { PromptContext } from "../../../domain/value-objects/prompt-context"

const buildConversationRepo = (exists: boolean): ConversationRepository => ({
  findById: async () =>
    exists
      ? ({
          id: "conv-1",
          versionId: "ver-1",
          provider: "ollama",
          providerInstanceId: null,
          model: "llama3",
          summaryFrequency: 15,
          temperature: 0.7,
          maxTokens: 2048,
          topP: 0.9,
          frequencyPenalty: 0,
          presencePenalty: 0,
          stopSequences: [],
          memoryDecayMode: "silent",
          memoryDecayThreshold: 3,
          memoryDecayAgeThreshold: 30,
          memoryDecaySpeed: 10,
        } as never)
      : null,
  findByIdWithMessages: async () => null,
  listByCharacterId: async () => [],
  listByCharacterIds: async () => [],
  list: async () => [],
  create: async (c) => c,
  update: async (c) => c,
  updateSettings: async (_id, _s) => ({} as never),
  clearProviderInstanceId: vi.fn(),
})

const buildMessageRepo = (count: number): MessageRepository => ({
  findById: async () => null,
  findByConversationId: async () =>
    Array.from({ length: count }, (_, i) => ({
      id: `msg-${i}`,
      conversationId: "conv-1",
      role: i % 2 === 0 ? "user" : "assistant",
      content: `Message ${i}`,
      position: i,
    })) as never,
  findLastByConversationId: async () => null,
  create: async (m) => m,
  update: async (m) => m,
  deleteById: async () => {},
  deleteAfterPosition: async () => {},
  clearAlternatives: async () => {},
})

const buildCharacterRepo = (exists: boolean): CharacterRepository => ({
  findById: async () =>
    exists
      ? ({
          character: { id: "char-1" },
          currentVersion: {
            name: "TestChar",
            description: "A test character",
            subtitle: null,
            instructions: null,
            cards: [],
            greeting: "Hello!",
          },
        } as never)
      : null,
  findVersionById: async () =>
    exists
      ? ({
          id: "ver-1",
          characterId: "char-1",
        } as never)
      : null,
  list: async () => [],
  createWithFirstVersion: async (_c, _v) => ({} as never),
  update: async (c) => c,
  delete: async () => {},
  findVersionsByCharacterId: async () => [],
  findMaxVersionNumber: async () => 0,
  saveVersion: async (v) => v,
  updateProfileImageAssetId: async () => {},
})

const buildMemoryRepo = (count: number): MemoryRepository => ({
  findById: async () => null,
  findByConversationId: async () =>
    Array.from({ length: count }, (_, i) => ({
      id: `mem-${i}`,
      conversationId: "conv-1",
      actor: `Actor${i}`,
      title: `Memory ${i}`,
      description: `Description ${i}`,
      priority: 5,
    })) as never,
  create: async (m) => m,
  update: async (m) => m,
  deleteById: async () => {},
})

const buildSummaryRepo = (hasLatest: boolean): SummaryRepository => ({
  findById: async () => null,
  findByConversationId: async () => [],
  findLatestByConversationId: async () =>
    hasLatest
      ? ({
          id: "sum-prev",
          conversationId: "conv-1",
          content: "Previous summary content",
          firstMessageId: "msg-0",
          lastMessageId: "msg-5",
          model: null,
          provider: null,
          createdAt: new Date(),
          editedAt: null,
        } as never)
      : null,
  create: async (s) => s,
  update: async (s) => s,
  deleteById: async () => {},
  deleteByIds: async () => {},
})

let capturedContext: PromptContext | null = null

const buildCapturingAdapter = (): ProviderPort => ({
  generateStreaming: async function* (context: PromptContext) {
    capturedContext = context
    yield { content: "Generated summary content." }
  },
  validateConnection: async () => ({ ok: true } as never),
  listModels: async () => ({ models: [], manualEntryRequired: false }),
})

const buildStreamingAdapter = (): ProviderPort => ({
  generateStreaming: async function* () {
    yield { content: "Generated summary content." }
  },
  validateConnection: async () => ({ ok: true } as never),
  listModels: async () => ({ models: [], manualEntryRequired: false }),
})

const buildProviderRegistry = (capture?: boolean): ProviderRegistry => ({
  listRegistered: () => ["ollama"],
  getAdapter: async () => capture ? buildCapturingAdapter() : buildStreamingAdapter(),
  createAdapter: () => capture ? buildCapturingAdapter() : buildStreamingAdapter(),
})

const buildLogger = (): Logger => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
  child: () => buildLogger(),
})

const buildDefaultProvider = (): GetDefaultProviderUseCase =>
  new (class extends GetDefaultProviderUseCase {
    constructor() {
      super({} as never, {} as never)
    }
    async execute(): Promise<DefaultProviderConfig> {
      return { provider: "ollama", providerInstanceId: null, models: { ollama: "llama3" } }
    }
  })()

function buildProviderInstanceRepo(_hasInstance: boolean): ProviderInstanceRepository {
  return {
    list: async () => [],
    findById: async () => null,
    create: async (_input) => ({
      id: "inst-1",
      kind: "ollama",
      name: "test",
      url: "http://localhost:11434",
      hasApiKey: false,
      apiKey: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }),
    update: async (_id, _input) => ({}) as never,
    delete: async () => {},
  }
}

const buildUseCase = (
  convExists: boolean,
  msgCount: number,
  charExists: boolean,
  memCount: number,
  hasPrevSummary: boolean,
  capture?: boolean,
): GenerateSummaryUseCase => {
  const messageRepo = buildMessageRepo(msgCount)
  return new GenerateSummaryUseCase(
    buildConversationRepo(convExists),
    messageRepo,
    buildMessageHistoryRepository(
      (conversationId) => messageRepo.findByConversationId(conversationId),
      async (id) => {
        const index = Number(id.replace(/^msg-/, ""))
        return Number.isNaN(index) ? null : index
      },
    ),
    buildCharacterRepo(charExists),
    buildMemoryRepo(memCount),
    buildSummaryRepo(hasPrevSummary),
    buildProviderRegistry(capture),
    buildDefaultProvider(),
    buildProviderInstanceRepo(false),
    buildLogger(),
  )
}

describe("GenerateSummaryUseCase", () => {
  it("generates a summary when there are messages", async () => {
    const useCase = buildUseCase(true, 10, true, 0, false)
    const result = await useCase.execute("conv-1")
    expect(result.summary).toBeDefined()
    expect(result.summary!.content).toBe("Generated summary content.")
    expect(result.summary!.conversationId).toBe("conv-1")
  })

  it("returns error when conversation not found", async () => {
    const useCase = buildUseCase(false, 10, true, 0, false)
    const result = await useCase.execute("conv-1")
    expect(result.error).toBeDefined()
    expect(result.error!.code).toBe("CONVERSATION_NOT_FOUND")
  })

  it("returns error when no messages exist", async () => {
    const useCase = buildUseCase(true, 0, true, 0, false)
    const result = await useCase.execute("conv-1")
    expect(result.error).toBeDefined()
    expect(result.error!.code).toBe("NO_MESSAGES")
  })

  it("uses previous summary to determine firstMessageId", async () => {
    const useCase = buildUseCase(true, 10, true, 0, true)
    const result = await useCase.execute("conv-1")
    expect(result.summary).toBeDefined()
    expect(result.summary!.firstMessageId).toBe("msg-6")
  })

  it("envía la transcripción completa en un solo user message", async () => {
    capturedContext = null
    const useCase = buildUseCase(true, 10, true, 0, false, true)
    await useCase.execute("conv-1")
    expect(capturedContext).not.toBeNull()
    expect(capturedContext!.messages.length).toBe(1)
    expect(capturedContext!.messages[0].role).toBe("user")
    expect(capturedContext!.messages[0].content).toContain("[Usuario]: Message 0")
    expect(capturedContext!.messages[0].content).toContain("[Asistente (TestChar)]: Message 1")
    expect(capturedContext!.messages[0].content).toContain("[Asistente (TestChar)]: Message 9")
  })

  it("incluye el resumen anterior como par user/assistant previo", async () => {
    capturedContext = null
    const useCase = buildUseCase(true, 10, true, 0, true, true)
    await useCase.execute("conv-1")
    expect(capturedContext).not.toBeNull()
    expect(capturedContext!.messages.length).toBe(3)
    expect(capturedContext!.messages[0].role).toBe("user")
    expect(capturedContext!.messages[0].content).toBe("Genera una síntesis narrativa acumulativa de la conversación anterior.")
    expect(capturedContext!.messages[1].role).toBe("assistant")
    expect(capturedContext!.messages[1].content).toBe("Previous summary content")
    expect(capturedContext!.messages[2].role).toBe("user")
    expect(capturedContext!.messages[2].content).toContain("[Usuario]: Message 6")
    expect(capturedContext!.messages[2].content).toContain("[Asistente (TestChar)]: Message 9")
  })

  it("incluye la memoria dinámica en el system prompt cuando hay memorias", async () => {
    capturedContext = null
    const useCase = buildUseCase(true, 10, true, 2, false, true)
    await useCase.execute("conv-1")
    expect(capturedContext).not.toBeNull()
    expect(capturedContext!.systemPrompt).toContain("## Memoria dinámica")
    expect(capturedContext!.systemPrompt).toContain("Actor0")
    expect(capturedContext!.systemPrompt).toContain("Memory 1")
  })

  it("omite la memoria dinámica del system prompt cuando no hay memorias", async () => {
    capturedContext = null
    const useCase = buildUseCase(true, 10, true, 0, false, true)
    await useCase.execute("conv-1")
    expect(capturedContext).not.toBeNull()
    expect(capturedContext!.systemPrompt).not.toContain("## Memoria dinámica")
  })

  it("omite el resumen anterior cuando es la primera generación", async () => {
    capturedContext = null
    const useCase = buildUseCase(true, 10, true, 0, false, true)
    await useCase.execute("conv-1")
    expect(capturedContext).not.toBeNull()
    expect(capturedContext!.messages.length).toBe(1)
    expect(capturedContext!.messages[0].content).toContain("[Usuario]: Message 0")
  })

  it("la transcripción refuerza NO responder en personaje y usa etiquetas", async () => {
    capturedContext = null
    const useCase = buildUseCase(true, 10, true, 0, false, true)
    await useCase.execute("conv-1")
    const content = capturedContext!.messages[0].content
    expect(content).toContain("NO respondas en personaje como TestChar")
    expect(content).toContain("NO generes una respuesta al chat")
    expect(content).toContain("Tu ÚNICA tarea es analizar esta transcripción")
    expect(content).toContain("Ahora genera el resumen solicitado")
    expect(content).toContain("---")
  })
})
