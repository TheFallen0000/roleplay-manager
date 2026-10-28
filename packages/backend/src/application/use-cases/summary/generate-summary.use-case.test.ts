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
          contextWindow: 2_500,
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
  listByCharacterId: async () => [],
  listByCharacterIds: async () => [],
  existsByAssetId: async () => false,
  list: async () => [],
  create: async (c) => c,
  update: async (c) => c,
  updateSettings: async (_id, _s) => ({} as never),
  clearProviderInstanceId: vi.fn(),
})

const buildMessageRepo = (count: number, contentLength = 0): MessageRepository => ({
  findById: async () => null,
  findByConversationId: async () =>
    Array.from({ length: count }, (_, i) => ({
      id: `msg-${i}`,
      conversationId: "conv-1",
      role: i % 2 === 0 ? "user" : "assistant",
      content: `${'x'.repeat(contentLength)}Message ${i}`,
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
let capturedContexts: PromptContext[] = []

const buildCapturingAdapter = (): ProviderPort => ({
  generateStreaming: async function* (context: PromptContext) {
    capturedContext = context
    capturedContexts.push(context)
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
  contentLength = 0,
): GenerateSummaryUseCase => {
  const messageRepo = buildMessageRepo(msgCount, contentLength)
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

  it("mantiene el primer mensaje del resumen acumulativo", async () => {
    const useCase = buildUseCase(true, 10, true, 0, true)
    const result = await useCase.execute("conv-1")
    expect(result.summary).toBeDefined()
    expect(result.summary!.firstMessageId).toBe("msg-0")
  })

  it("resume los mensajes antiguos y deja los recientes sin resumir", async () => {
    capturedContext = null
    const useCase = buildUseCase(true, 10, true, 0, false, true)
    await useCase.execute("conv-1", { locale: "es" })
    expect(capturedContext).not.toBeNull()
    expect(capturedContext!.messages.length).toBe(1)
    expect(capturedContext!.messages[0].role).toBe("user")
    expect(capturedContext!.messages[0].content).toContain("[Usuario]: Message 0")
    expect(capturedContext!.messages[0].content).toContain("[Asistente (TestChar)]: Message 7")
    expect(capturedContext!.messages[0].content).not.toContain("Message 8")
    expect(capturedContext!.messages[0].content).not.toContain("Message 9")
  })

  it("incluye el resumen anterior como par user/assistant previo", async () => {
    capturedContext = null
    const useCase = buildUseCase(true, 10, true, 0, true, true)
    await useCase.execute("conv-1", { locale: "es" })
    expect(capturedContext).not.toBeNull()
    expect(capturedContext!.messages.length).toBe(3)
    expect(capturedContext!.messages[0].role).toBe("user")
    expect(capturedContext!.messages[0].content).toBe("Genera una síntesis narrativa acumulativa de la conversación anterior.")
    expect(capturedContext!.messages[1].role).toBe("assistant")
    expect(capturedContext!.messages[1].content).toBe("Previous summary content")
    expect(capturedContext!.messages[2].role).toBe("user")
    expect(capturedContext!.messages[2].content).toContain("[Usuario]: Message 6")
    expect(capturedContext!.messages[2].content).toContain("[Asistente (TestChar)]: Message 7")
    expect(capturedContext!.messages[2].content).not.toContain("Message 8")
  })

  it("respeta el límite de compactación", async () => {
    capturedContext = null
    const useCase = buildUseCase(true, 10, true, 0, false, true)
    const result = await useCase.execute("conv-1", {
      locale: "es",
      upToMessageId: "msg-3",
      maxTokens: 512,
    })

    expect(result.summary).toBeDefined()
    expect(capturedContext).not.toBeNull()
    expect(capturedContext!.messages[0].content).toContain("[Usuario]: Message 0")
    expect(capturedContext!.messages[0].content).toContain("[Asistente (TestChar)]: Message 3")
    expect(capturedContext!.messages[0].content).not.toContain("Message 4")
  })

  it("divide la transcripción en trozos cuando no cabe en una llamada", async () => {
    capturedContexts = []
    const useCase = buildUseCase(true, 6, true, 0, false, true, 2_000)
    await useCase.execute("conv-1", { locale: "es" })

    expect(capturedContexts.length).toBeGreaterThan(1)
    expect(capturedContexts[0].messages[0].content).toContain("Message 0")
    expect(capturedContexts[0].messages[0].content).not.toContain("Message 4")
  })

  it("incluye la memoria dinámica en el system prompt cuando hay memorias", async () => {
    capturedContext = null
    const useCase = buildUseCase(true, 10, true, 2, false, true)
    await useCase.execute("conv-1", { locale: "es" })
    expect(capturedContext).not.toBeNull()
    expect(capturedContext!.systemPrompt).toContain("## Memoria dinámica")
    expect(capturedContext!.systemPrompt).toContain("Actor0")
    expect(capturedContext!.systemPrompt).toContain("Memory 1")
  })

  it("omite la memoria dinámica del system prompt cuando no hay memorias", async () => {
    capturedContext = null
    const useCase = buildUseCase(true, 10, true, 0, false, true)
    await useCase.execute("conv-1", { locale: "es" })
    expect(capturedContext).not.toBeNull()
    expect(capturedContext!.systemPrompt).not.toContain("## Memoria dinámica")
  })

  it("omite el resumen anterior cuando es la primera generación", async () => {
    capturedContext = null
    const useCase = buildUseCase(true, 10, true, 0, false, true)
    await useCase.execute("conv-1", { locale: "es" })
    expect(capturedContext).not.toBeNull()
    expect(capturedContext!.messages.length).toBe(1)
    expect(capturedContext!.messages[0].content).toContain("[Usuario]: Message 0")
  })

  it("la transcripción refuerza NO responder en personaje y usa etiquetas", async () => {
    capturedContext = null
    const useCase = buildUseCase(true, 10, true, 0, false, true)
    await useCase.execute("conv-1", { locale: "es" })
    const content = capturedContext!.messages[0].content
    expect(content).toContain("NO respondas en personaje como TestChar")
    expect(content).toContain("NO generes una respuesta al chat")
    expect(content).toContain("Tu ÚNICA tarea es analizar esta transcripción")
    expect(content).toContain("Ahora genera el resumen solicitado")
    expect(content).toContain("---")
  })

  it("construye el prompt del resumen en el idioma de la interfaz", async () => {
    capturedContext = null
    const useCase = buildUseCase(true, 10, true, 0, false, true)
    await useCase.execute("conv-1", { locale: "en" })
    expect(capturedContext).not.toBeNull()
    expect(capturedContext!.systemPrompt).toContain(
      "roleplay summary assistant",
    )
    expect(capturedContext!.systemPrompt).toContain(
      "language of the conversation transcript",
    )
    expect(capturedContext!.messages[0].content).toContain("[User]: Message 0")
    expect(capturedContext!.messages[0].content).toContain(
      "[Assistant (TestChar)]: Message 1",
    )
  })
})
