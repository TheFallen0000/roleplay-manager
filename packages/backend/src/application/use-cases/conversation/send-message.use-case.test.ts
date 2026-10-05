import { describe, it, expect, beforeAll, vi } from "vitest"

import { SendMessageUseCase } from "./send-message.use-case"
import type { ConversationRepository } from "../../../domain/ports/conversation.repository"
import type { MessageRepository } from "../../../domain/ports/message.repository"
import type { CharacterRepository } from "../../../domain/ports/character.repository"
import type { PromptContextBuilder } from "../../../domain/ports/prompt-context-builder"
import type { ProviderRegistry } from "../../../domain/ports/provider.port"
import type { Logger } from "../../../domain/ports/logger.port"
import type { GetDefaultProviderUseCase } from "../provider/get-default-provider.use-case"
import { Conversation } from "../../../domain/entities/conversation.entity"
import { Message } from "../../../domain/entities/message.entity"
import { Character } from "../../../domain/entities/character.entity"
import { CharacterVersion } from "../../../domain/entities/character-version.entity"
import type { PromptContext, StreamChunk } from "../../../domain/value-objects/prompt-context"
import type { ProviderId } from "@workspace/shared/types/provider"
import type { MemoryChangeProposalRepository } from "../../../domain/ports/memory-change-proposal.repository"
import type { SummaryRepository } from "../../../domain/ports/summary.repository"
import type { GenerateSummaryUseCase } from "../summary/generate-summary.use-case"
import type { GenerateConversationTitleUseCase } from "./generate-conversation-title.use-case"
import type { PlayerCharacterRepository } from "../../../domain/ports/player-character.repository"

const now = new Date()

const character = Character.create({ id: "char-1", name: "Test", createdAt: now, updatedAt: now })
const version = CharacterVersion.create({
  id: "ver-1",
  characterId: "char-1",
  name: "Test",
  subtitle: null,
  profileImageAssetId: null,
  description: "A test character",
  instructions: null,
  greeting: "Hello!",
  versionNumber: 1,
  createdAt: now,
  cards: [],
})

const activeConversation = Conversation.create({
  id: "conv-1",
  versionId: "ver-1",
  title: null,
  titleSource: null,
  model: null,
  provider: "ollama",
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

const manualDecayConversation = Conversation.create({
  id: "conv-manual-decay",
  versionId: "ver-1",
  title: null,
  titleSource: null,
  model: null,
  provider: "ollama",
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
  memoryDecayMode: "manual",
  createdAt: now,
  updatedAt: now,
})

const offDecayConversation = Conversation.create({
  id: "conv-off-decay",
  versionId: "ver-1",
  title: null,
  titleSource: null,
  model: null,
  provider: "ollama",
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
  memoryDecayMode: "off",
  createdAt: now,
  updatedAt: now,
})

const existingMessages = [
  Message.create({
    id: "msg-0",
    conversationId: "conv-1",
    role: "assistant",
    content: "Hello!",
    position: 0,
    alternatives: [],
    alternativesCursor: 0,
    createdAt: now,
    editedAt: null,
  }),
]

const buildConversationRepo = (): ConversationRepository => ({
  create: async () => activeConversation,
  findById: async (id) => {
    if (id === "conv-1") return activeConversation
    return null
  },
  findByIdWithMessages: async () => null,
  list: async () => [],
  update: async (c) => c,
  updateSettings: vi.fn(async (_id: string, _settings: any) => activeConversation),
  clearProviderInstanceId: vi.fn(),
})

const buildConversationRepoFor = (conversation: Conversation): ConversationRepository => ({
  create: async () => conversation,
  findById: async (id) => (id === conversation.id ? conversation : null),
  findByIdWithMessages: async () => null,
  list: async () => [],
  update: async (c) => c,
  updateSettings: vi.fn(async (_id: string, _settings: any) => conversation),
  clearProviderInstanceId: vi.fn(),
})

const buildMessageRepo = (): MessageRepository => ({
  create: async (m) => m,
  findByConversationId: async () => existingMessages,
  findById: async () => null,
  findLastByConversationId: async () => null,
  update: async (m) => m,
  deleteById: async () => {},
  deleteAfterPosition: async () => {},
  clearAlternatives: async () => {},
})

const buildCharacterRepo = (): CharacterRepository => ({
  createWithFirstVersion: async () => ({ character, version }),
  findById: async () => ({ character, currentVersion: version }),
  list: async () => [],
  update: async (c) => c,
  delete: async () => {},
  findVersionById: async () => version,
  findVersionsByCharacterId: async () => [],
  findMaxVersionNumber: async () => 0,
  saveVersion: async (v) => v,
  updateProfileImageAssetId: async () => {},
})

const playerCharacterRepository = {
  findById: async () => null,
  list: async () => [],
  create: async (pc: unknown) => pc,
  update: async (pc: unknown) => pc,
  delete: async () => {},
} as unknown as PlayerCharacterRepository

const buildPromptContextBuilder = (): PromptContextBuilder => ({
  build: async () => ({
    systemPrompt: "Eres Test.",
    messages: [],
  }),
})

let _providerCount = 0

const buildProviderRegistry = (shouldFail = false): ProviderRegistry => ({
  listRegistered: () => ["ollama"],
  createAdapter: vi.fn(),
  getAdapter: async (_id: ProviderId) => {
    _providerCount++
    if (shouldFail) return null
    return {
      validateConnection: async () => "available",
      listModels: async () => ({ models: [], manualEntryRequired: false }),
      generateStreaming: function (
        _context: PromptContext,
        _options?: { model?: string },
      ): AsyncIterable<StreamChunk> {
        return {
          [Symbol.asyncIterator]: () => {
            const chunks = ["Hello ", "from ", "the ", "AI!"]
            let i = 0
            return {
              next: async () => {
                if (i < chunks.length) {
                  return { value: { content: chunks[i++] }, done: false }
                }
                return { value: undefined, done: true }
              },
            }
          },
        }
      },
    }
  },
})

const providerInstanceRepository = {
  findById: vi.fn(),
  list: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
}

const buildDefaultProvider = (
  provider: string | null = "ollama",
  model: string | null = null,
): GetDefaultProviderUseCase =>
  ({ execute: async () => ({ provider, model }) }) as unknown as GetDefaultProviderUseCase

const buildLogger = (): Logger => ({
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
  child: () => buildLogger(),
})

const buildMemoryRepo = () => ({
  findById: async () => null,
  findByConversationId: async () => [],
  create: async (m: any) => m,
  update: async (m: any) => m,
  deleteById: async () => {},
})

const buildSummaryRepo = (): SummaryRepository => ({
  findById: async () => null,
  findByConversationId: async () => [],
  findLatestByConversationId: async () => null,
  create: async (s) => s,
  update: async (s) => s,
  deleteById: async () => {},
  deleteByIds: async () => {},
})

const buildGenerateSummary = (): GenerateSummaryUseCase =>
  ({
    execute: async () => ({ error: { code: "NO_NEW_MESSAGES", message: "No new messages" } }),
  }) as unknown as GenerateSummaryUseCase

const buildGenerateConversationTitle = (): GenerateConversationTitleUseCase =>
  ({ execute: vi.fn() }) as unknown as GenerateConversationTitleUseCase

import type { ApplyAllMemoryChangesUseCase } from "../memory/apply-all-memory-changes.use-case"
import type { DecayConversationMemoryUseCase } from "../memory/decay-conversation-memory.use-case"

const applyAllMemoryChanges = {
  execute: async () => [],
} as unknown as ApplyAllMemoryChangesUseCase

const decayMemories = {
  execute: vi.fn(async () => ({ deleted: 0 })),
} as unknown as DecayConversationMemoryUseCase

const memoryChangeProposalRepository = {
  create: async (p: any) => p,
  createMany: async () => {},
  findById: async () => null,
  findPendingByConversationId: async () => [],
  findByConversationId: async () => [],
  update: async (p: any) => p,
  markProcessed: async () => {},
  discardPendingByConversationId: async () => {},
}

describe("SendMessageUseCase", () => {
  beforeAll(() => {
    _providerCount = 0
  })

  it("lanza ConversationNotFoundError si la conversacion no existe", async () => {
    const useCase = new SendMessageUseCase(
      buildConversationRepo(),
      buildMessageRepo(),
      buildCharacterRepo(),
      buildMemoryRepo(),
      memoryChangeProposalRepository,
      buildPromptContextBuilder(),
      playerCharacterRepository,
      buildProviderRegistry(),
      buildLogger(),
      buildDefaultProvider(),
      providerInstanceRepository,
      applyAllMemoryChanges,
      buildSummaryRepo(),
      buildGenerateSummary(),
      buildGenerateConversationTitle(),
      decayMemories,
    )

    await expect(
      async () => {
        const gen = useCase.execute({ conversationId: "nonexistent", content: "Hola" })
        for await (const _ of gen) {
          // consume
        }
      },
    ).rejects.toThrow("Conversation with id 'nonexistent' not found.")
  })

  it("emite evento user-message-saved al guardar el mensaje", async () => {
    const useCase = new SendMessageUseCase(
      buildConversationRepo(),
      buildMessageRepo(),
      buildCharacterRepo(),
      buildMemoryRepo(),
      memoryChangeProposalRepository,
      buildPromptContextBuilder(),
      playerCharacterRepository,
      buildProviderRegistry(),
      buildLogger(),
      buildDefaultProvider(),
      providerInstanceRepository,
      applyAllMemoryChanges,
      buildSummaryRepo(),
      buildGenerateSummary(),
      buildGenerateConversationTitle(),
      decayMemories,
    )

    const events: string[] = []
    const gen = useCase.execute({ conversationId: "conv-1", content: "Hola" })

    for await (const event of gen) {
      events.push(event.type)
      if (event.type === "user-message-saved") {
        expect(event.message.role).toBe("user")
        expect(event.message.content).toBe("Hola")
      }
    }

    expect(events).toContain("user-message-saved")
  })

  it("emite chunks de streaming y evento done", async () => {
    const useCase = new SendMessageUseCase(
      buildConversationRepo(),
      buildMessageRepo(),
      buildCharacterRepo(),
      buildMemoryRepo(),
      memoryChangeProposalRepository,
      buildPromptContextBuilder(),
      playerCharacterRepository,
      buildProviderRegistry(),
      buildLogger(),
      buildDefaultProvider(),
      providerInstanceRepository,
      applyAllMemoryChanges,
      buildSummaryRepo(),
      buildGenerateSummary(),
      buildGenerateConversationTitle(),
      decayMemories,
    )

    const chunks: string[] = []
    let doneMessage = false
    const gen = useCase.execute({ conversationId: "conv-1", content: "Hola" })

    for await (const event of gen) {
      if (event.type === "chunk") {
        chunks.push(event.content)
      }
      if (event.type === "done") {
        doneMessage = true
        expect(event.message.role).toBe("assistant")
        expect(event.message.content).toBe("Hello from the AI!")
      }
    }

    expect(chunks).toEqual(["Hello ", "from ", "the ", "AI!"])
    expect(doneMessage).toBe(true)
  })

  it("emite evento error si el proveedor no esta configurado", async () => {
    const useCase = new SendMessageUseCase(
      buildConversationRepo(),
      buildMessageRepo(),
      buildCharacterRepo(),
      buildMemoryRepo(),
      memoryChangeProposalRepository,
      buildPromptContextBuilder(),
      playerCharacterRepository,
      buildProviderRegistry(true),
      buildLogger(),
      buildDefaultProvider(),
      providerInstanceRepository,
      applyAllMemoryChanges,
      buildSummaryRepo(),
      buildGenerateSummary(),
      buildGenerateConversationTitle(),
      decayMemories,
    )

    const gen = useCase.execute({ conversationId: "conv-1", content: "Hola" })
    let hasError = false

    for await (const event of gen) {
      if (event.type === "error") {
        hasError = true
        expect(event.error.code).toBe("PROVIDER_NOT_CONFIGURED")
      }
    }

    expect(hasError).toBe(true)
  })
})

describe("SendMessageUseCase — memory proposal flow", () => {
  const LLM_CHUNKS_WITH_PROPOSALS = [
    "Hola ",
    "Alice!\n\n",
    "```memory_proposals\n",
    "[\n",
    '  { "operation": "CREATE", "actor": "Alice", "title": "Estado animo", "description": "Alice esta feliz", "priority": 3 }\n',
    "]\n",
    "```",
  ]

  const buildProviderWithProposals = (): ProviderRegistry => ({
    listRegistered: () => ["ollama"],
    createAdapter: vi.fn(),
    getAdapter: async () => ({
      validateConnection: async () => "available" as const,
      listModels: async () => ({ models: [], manualEntryRequired: false }),
      generateStreaming: function (): AsyncIterable<StreamChunk> {
        return {
          [Symbol.asyncIterator]: () => {
            let i = 0
            return {
              next: async () => {
                if (i < LLM_CHUNKS_WITH_PROPOSALS.length) {
                  return { value: { content: LLM_CHUNKS_WITH_PROPOSALS[i++] }, done: false } as const
                }
                return { value: undefined, done: true } as const
              },
            }
          },
        }
      },
    }),
  })

  it("extrae propuestas, limpia el contenido y lo guarda en BD", async () => {
    const savedProposals: any[] = []
    const savedAssistantContents: string[] = []

    const buildMessageRepoCustom = (): MessageRepository => ({
      create: async (m: any) => {
        if (m.role === "assistant") savedAssistantContents.push(m.content)
        return m
      },
      findByConversationId: async () => existingMessages,
      findById: async () => null,
      findLastByConversationId: async () => null,
      update: async (m) => m,
      deleteById: async () => {},
      deleteAfterPosition: async () => {},
      clearAlternatives: async () => {},
    })

    const proposalRepo: MemoryChangeProposalRepository = {
      create: async (p: any) => p,
      createMany: async (entities: any[]) => {
        entities.forEach((e) => savedProposals.push(e))
      },
      findById: async () => null,
      findPendingByConversationId: async () =>
        savedProposals.filter((p: any) => p.status === "pending"),
      findByConversationId: async () => [],
      update: async (p: any) => p,
      markProcessed: async () => {},
      discardPendingByConversationId: async () => {},
    }

    const applyAll = {
      execute: async () => [],
    } as unknown as ApplyAllMemoryChangesUseCase

    const useCase = new SendMessageUseCase(
      buildConversationRepo(),
      buildMessageRepoCustom(),
      buildCharacterRepo(),
      buildMemoryRepo(),
      proposalRepo,
      buildPromptContextBuilder(),
      playerCharacterRepository,
      buildProviderWithProposals(),
      buildLogger(),
      buildDefaultProvider(),
      providerInstanceRepository,
      applyAll,
      buildSummaryRepo(),
      buildGenerateSummary(),
      buildGenerateConversationTitle(),
      decayMemories,
    )

    const gen = useCase.execute({
      conversationId: "conv-1",
      content: "Hola",
    })

    const chunks: string[] = []
    for await (const event of gen) {
      if (event.type === "chunk") {
        chunks.push(event.content)
      }
    }

    expect(savedAssistantContents).toHaveLength(1)
    expect(savedAssistantContents[0].includes("memory_proposals")).toBe(false)

    expect(savedProposals).toHaveLength(1)
    expect(savedProposals[0].operation).toBe("CREATE")
    expect(savedProposals[0].actor).toBe("Alice")
    expect(savedProposals[0].status).toBe("pending")
  })

  it("aplica automaticamente las propuestas en modo auto", async () => {
    const savedProposals: any[] = []
    const createdMemories: any[] = []

    const buildMemoryRepoWithTrack = () => ({
      findById: async () => null,
      findByConversationId: async () => [],
      create: async (m: any) => {
        createdMemories.push(m)
        return m
      },
      update: async (m: any) => m,
      deleteById: async () => {},
    })

    const proposalRepo: MemoryChangeProposalRepository = {
      create: async (p: any) => p,
      createMany: async (entities: any[]) => {
        entities.forEach((e) => savedProposals.push(e))
      },
      findById: async () => null,
      findPendingByConversationId: async () =>
        savedProposals.filter((p: any) => p.status === "pending"),
      findByConversationId: async () => [],
      update: async (p: any) => p,
      markProcessed: async (id: string, status: any, processedBy: any) => {
        const idx = savedProposals.findIndex((sp: any) => sp.id === id)
        if (idx !== -1) {
          savedProposals[idx] = savedProposals[idx].markProcessed(processedBy as any, status as any)
        }
      },
      discardPendingByConversationId: async () => {},
    }

    const applyAll = {
      execute: async (input: {
        conversationId: string
        processedBy: string
      }) => {
        const pending = savedProposals.filter(
          (p: any) => p.status === "pending",
        )
        for (const proposal of pending) {
          createdMemories.push({
            id: proposal.id,
            actor: proposal.actor,
            title: proposal.title,
          })
          await (proposalRepo.markProcessed as any)(
            proposal.id,
            "applied",
            input.processedBy,
          )
        }
        return createdMemories.map((m: any) => ({
          id: m.id,
          conversationId: input.conversationId,
          actor: m.actor,
          title: m.title,
          description: "",
          priority: 5,
          createdBy: "assistant",
          updatedBy: "system",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }))
      },
    } as unknown as ApplyAllMemoryChangesUseCase

    const useCase = new SendMessageUseCase(
      buildConversationRepo(),
      buildMessageRepo(),
      buildCharacterRepo(),
      buildMemoryRepoWithTrack(),
      proposalRepo,
      buildPromptContextBuilder(),
      playerCharacterRepository,
      buildProviderWithProposals(),
      buildLogger(),
      buildDefaultProvider(),
      providerInstanceRepository,
      applyAll,
      buildSummaryRepo(),
      buildGenerateSummary(),
      buildGenerateConversationTitle(),
      decayMemories,
    )

    const gen = useCase.execute({
      conversationId: "conv-1",
      content: "Hola",
    })

    for await (const _ of gen) {
      // consume
    }

    expect(savedProposals).toHaveLength(1)
    expect(savedProposals[0].status).toBe("applied")
    expect(createdMemories).toHaveLength(1)
    expect(createdMemories[0].actor).toBe("Alice")
    expect(createdMemories[0].title).toBe("Estado animo")
  })

  it("extrae propuestas desde tool calls nativos y omite el bloque markdown del systemPrompt", async () => {
    const savedProposals: any[] = []
    const savedAssistantContents: string[] = []
    const buildSystemPrompts: string[] = []

    const buildMessageRepoCustom = (): MessageRepository => ({
      create: async (m: any) => {
        if (m.role === "assistant") savedAssistantContents.push(m.content)
        return m
      },
      findByConversationId: async () => existingMessages,
      findById: async () => null,
      findLastByConversationId: async () => null,
      update: async (m) => m,
      deleteById: async () => {},
      deleteAfterPosition: async () => {},
      clearAlternatives: async () => {},
    })

    const proposalRepo: MemoryChangeProposalRepository = {
      create: async (p: any) => p,
      createMany: async (entities: any[]) => {
        entities.forEach((e) => savedProposals.push(e))
      },
      findById: async () => null,
      findPendingByConversationId: async () =>
        savedProposals.filter((p: any) => p.status === "pending"),
      findByConversationId: async () => [],
      update: async (p: any) => p,
      markProcessed: async () => {},
      discardPendingByConversationId: async () => {},
    }

    const promptContextBuilder: PromptContextBuilder = {
      build: async (params: any) => {
        buildSystemPrompts.push(params.enableMemoryProposalTool ? "ON" : "OFF")
        return {
          systemPrompt: params.enableMemoryProposalTool
            ? "Eres un personaje. Sin bloque markdown."
            : "Eres un personaje. ```memory_proposals ... ```",
          messages: [{ role: "user", content: "Hola" }],
        }
      },
    }

    const buildProviderWithToolCalls = (): ProviderRegistry => ({
      listRegistered: () => ["ollama"],
      createAdapter: vi.fn(),
      getAdapter: async () => ({
        validateConnection: async () => "available" as const,
        listModels: async () => ({ models: [], manualEntryRequired: false }),
        generateStreaming: function (): AsyncIterable<StreamChunk> {
          return {
            [Symbol.asyncIterator]: () => {
              const chunks: StreamChunk[] = [
                { content: "Hola, " },
                {
                  toolCalls: [
                    {
                      index: 0,
                      id: "c1",
                      functionName: "propose_memory_changes",
                      argumentsDelta: '{"operation":"CREATE","actor":"Alice","title":"Estado","description":"Feliz","priority":3}',
                    },
                  ],
                },
                { content: " mundo" },
              ]
              let i = 0
              return {
                next: async () => {
                  if (i < chunks.length) {
                    return { value: chunks[i++], done: false } as const
                  }
                  return { value: undefined, done: true } as const
                },
              }
            },
          }
        },
      }),
    })

    const applyAll = {
      execute: async () => [],
    } as unknown as ApplyAllMemoryChangesUseCase

    const useCase = new SendMessageUseCase(
      buildConversationRepo(),
      buildMessageRepoCustom(),
      buildCharacterRepo(),
      buildMemoryRepo(),
      proposalRepo,
      promptContextBuilder,
      playerCharacterRepository,
      buildProviderWithToolCalls(),
      buildLogger(),
      buildDefaultProvider(),
      providerInstanceRepository,
      applyAll,
      buildSummaryRepo(),
      buildGenerateSummary(),
      buildGenerateConversationTitle(),
      decayMemories,
    )

    const gen = useCase.execute({ conversationId: "conv-1", content: "Hola" })
    for await (const _ of gen) {
      // consume
    }

    expect(buildSystemPrompts[0]).toBe("ON")
    expect(buildSystemPrompts[0]).not.toContain("memory_proposals")
    expect(savedProposals).toHaveLength(1)
    expect(savedProposals[0].operation).toBe("CREATE")
    expect(savedProposals[0].actor).toBe("Alice")
    expect(savedProposals[0].title).toBe("Estado")
    expect(savedProposals[0].priority).toBe(3)
    expect(savedAssistantContents[0]).toBe("Hola,  mundo")
    expect(savedAssistantContents[0].includes("memory_proposals")).toBe(false)
  })

  it("filtra OOC de mensajes previos y preserva el del ultimo mensaje del usuario", async () => {
    const builtContexts: PromptContext[] = []

    const existingMessagesWithOoc = [
      Message.create({
        id: "msg-0",
        conversationId: "conv-1",
        role: "user",
        content: "Mensaje viejo //instruccion vieja//",
        position: 0,
        alternatives: [],
        alternativesCursor: 0,
        createdAt: now,
        editedAt: null,
      }),
      Message.create({
        id: "msg-1",
        conversationId: "conv-1",
        role: "assistant",
        content: "OK",
        position: 1,
        alternatives: [],
        alternativesCursor: 0,
        createdAt: now,
        editedAt: null,
      }),
    ]

    const buildMessageRepoWithOocHistory = (): MessageRepository => ({
      create: async (m) => m,
      findByConversationId: async () => existingMessagesWithOoc,
      findById: async () => null,
      findLastByConversationId: async () => null,
      update: async (m) => m,
      deleteById: async () => {},
      deleteAfterPosition: async () => {},
      clearAlternatives: async () => {},
    })

    const promptContextBuilder: PromptContextBuilder = {
      build: async (params: any) => {
        const messages = params.messages as Array<{ role: "user" | "assistant"; content: string }>
        const lastUserIdx = params.filterOocFromHistory
          ? messages.map((m) => m.role).lastIndexOf("user")
          : -1
        const ctxMessages = messages.map((m, idx) => {
          if (
            params.filterOocFromHistory &&
            m.role === "user" &&
            idx !== lastUserIdx
          ) {
            const cleaned = m.content.replace(/\/\/[^\n]*?\/\//g, "")
            return { role: m.role, content: cleaned.trim() }
          }
          return { role: m.role, content: m.content }
        })
        const ctx: PromptContext = {
          systemPrompt: params.enableMemoryProposalTool
            ? "system sin bloque markdown"
            : "system con bloque markdown",
          messages: ctxMessages,
        }
        builtContexts.push(ctx)
        return ctx
      },
    }

    const useCase = new SendMessageUseCase(
      buildConversationRepo(),
      buildMessageRepoWithOocHistory(),
      buildCharacterRepo(),
      buildMemoryRepo(),
      buildProposalRepoForOoc(),
      promptContextBuilder,
      playerCharacterRepository,
      buildProviderRegistry(),
      buildLogger(),
      buildDefaultProvider(),
      providerInstanceRepository,
      buildApplyAllForOoc(),
      buildSummaryRepo(),
      buildGenerateSummary(),
      buildGenerateConversationTitle(),
      decayMemories,
    )

    const gen = useCase.execute({
      conversationId: "conv-1",
      content: "Mensaje nuevo //instruccion nueva//",
    })
    for await (const _ of gen) {
      // consume
    }

    expect(builtContexts).toHaveLength(1)
    const ctx = builtContexts[0]
    const oldUserMsg = ctx.messages.find((m) => m.content.includes("Mensaje viejo"))
    expect(oldUserMsg).toBeDefined()
    expect(oldUserMsg!.content).not.toContain("instruccion vieja")
    const newUserMsg = ctx.messages[ctx.messages.length - 1]
    expect(newUserMsg.content).toBe("Mensaje nuevo //instruccion nueva//")
  })

  it("ejecuta el barrido de auto-degradación tras cada mensaje en modo silent", async () => {
    const execute = vi.mocked(decayMemories.execute)
    execute.mockClear()
    const useCase = buildSendMessageUseCase(buildConversationRepoFor(activeConversation))

    const gen = useCase.execute({ conversationId: "conv-1", content: "Hola" })
    for await (const _ of gen) {
      // consume
    }

    expect(execute).toHaveBeenCalledWith({ conversationId: "conv-1" })
  })

  it("no ejecuta el barrido tras un mensaje en modo manual", async () => {
    const execute = vi.mocked(decayMemories.execute)
    execute.mockClear()
    const useCase = buildSendMessageUseCase(buildConversationRepoFor(manualDecayConversation))

    const gen = useCase.execute({ conversationId: "conv-manual-decay", content: "Hola" })
    for await (const _ of gen) {
      // consume
    }

    expect(execute).not.toHaveBeenCalled()
  })

  it("no ejecuta el barrido tras un mensaje en modo off", async () => {
    const execute = vi.mocked(decayMemories.execute)
    execute.mockClear()
    const useCase = buildSendMessageUseCase(buildConversationRepoFor(offDecayConversation))

    const gen = useCase.execute({ conversationId: "conv-off-decay", content: "Hola" })
    for await (const _ of gen) {
      // consume
    }

    expect(execute).not.toHaveBeenCalled()
  })
})

function buildSendMessageUseCase(repo: ConversationRepository): SendMessageUseCase {
  return new SendMessageUseCase(
    repo,
    buildMessageRepo(),
    buildCharacterRepo(),
    buildMemoryRepo(),
    memoryChangeProposalRepository,
    buildPromptContextBuilder(),
    playerCharacterRepository,
    buildProviderRegistry(),
    buildLogger(),
    buildDefaultProvider(),
    providerInstanceRepository,
    applyAllMemoryChanges,
    buildSummaryRepo(),
    buildGenerateSummary(),
    buildGenerateConversationTitle(),
    decayMemories,
  )
}

function buildProposalRepoForOoc(): MemoryChangeProposalRepository {
  return {
    create: async (p: any) => p,
    createMany: async () => {},
    findById: async () => null,
    findPendingByConversationId: async () => [],
    findByConversationId: async () => [],
    update: async (p: any) => p,
    markProcessed: async () => {},
    discardPendingByConversationId: async () => {},
  }
}

function buildApplyAllForOoc(): ApplyAllMemoryChangesUseCase {
  return {
    execute: async () => [],
  } as unknown as ApplyAllMemoryChangesUseCase
}
