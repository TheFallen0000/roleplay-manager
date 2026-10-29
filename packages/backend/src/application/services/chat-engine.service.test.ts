import { describe, expect, it, vi } from "vitest"

import type { SummaryDTO } from "@workspace/shared/types/summary"

import { ChatEngine, type ChatEngineDeps } from "./chat-engine.service"
import type { ContextCompactionService } from "./context-compaction.service"
import { Conversation } from "../../domain/entities/conversation.entity"
import { CharacterVersion } from "../../domain/entities/character-version.entity"
import { Message } from "../../domain/entities/message.entity"
import { Summary } from "../../domain/entities/summary.entity"
import type { PromptContextBuilder } from "../../domain/ports/prompt-context-builder"
import type { ProviderPort, ProviderRegistry } from "../../domain/ports/provider.port"
import type { Logger } from "../../domain/ports/logger.port"

const now = new Date("2026-10-28T12:00:00.000Z")

const version = CharacterVersion.create({
  id: "ver-1",
  characterId: "char-1",
  name: "TestChar",
  subtitle: null,
  profileImageAssetId: null,
  description: "A test character",
  instructions: null,
  greeting: "Hello!",
  versionNumber: 1,
  createdAt: now,
  cards: [],
})

const conversation = Conversation.create({
  id: "conv-1",
  versionId: "ver-1",
  title: null,
  titleSource: null,
  model: "llama3",
  provider: "ollama",
  providerInstanceId: null,
  recentMessageCount: 10,
  summaryFrequency: 20,
  contextWindow: 8_000,
  compactionThreshold: 80,
  temperature: 0.7,
  maxTokens: 1_024,
  topP: 0.9,
  frequencyPenalty: 0,
  presencePenalty: 0,
  stopSequences: [],
  memoryProposalMode: "auto",
  createdAt: now,
  updatedAt: now,
})

const userMessage = Message.create({
  id: "msg-1",
  conversationId: "conv-1",
  role: "user",
  content: "Hello",
  position: 1,
  alternatives: [],
  alternativesCursor: 0,
  createdAt: now,
  editedAt: null,
})

const logger: Logger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  child: vi.fn(),
}

const summaryDTO: SummaryDTO = {
  id: "sum-1",
  conversationId: "conv-1",
  content: "Old events.",
  firstMessageId: "msg-1",
  lastMessageId: "msg-1",
  model: "llama3",
  provider: "ollama",
  createdAt: now.toISOString(),
  editedAt: null,
}

const summaryEntity = Summary.reconstruct({
  ...summaryDTO,
  createdAt: now,
  editedAt: null,
})

const promptBuilder = (): PromptContextBuilder => ({
  build: vi.fn(
    async (params: Parameters<PromptContextBuilder["build"]>[0]) => ({
      systemPrompt: `Summary: ${params.summary?.content ?? "none"}`,
      messages: params.messages.map((message) => ({
        role: message.role,
        content: message.content,
      })),
    }),
  ),
})

const provider = (): ProviderPort => ({
  validateConnection: async () => "available",
  listModels: async () => ({ models: [], manualEntryRequired: false }),
  async *generateStreaming() {
    yield { content: "Hello" }
  },
})

const buildDeps = (
  overrides: Partial<ChatEngineDeps> = {},
): ChatEngineDeps => ({
  messageRepository: {
    create: async (message) => message,
    findByConversationId: async () => [],
    findById: async () => null,
    findLastByConversationId: async () => null,
    update: async (message) => message,
    deleteById: async () => {},
    deleteAfterPosition: async () => {},
    clearAlternatives: async () => {},
  },
  messageHistoryRepository: {
    findPageByConversationId: async () => ({ messages: [], hasMore: false }),
    findRecentByConversationId: async () => [],
    findAfterPosition: async () => [],
    findPositionById: async () => null,
    findMaxPosition: async () => 0,
    countByConversationId: async () => 0,
    findUserMessageTimes: async () => [],
    findStatsByConversationIds: async () => [],
  },
  characterRepository: {
    createWithFirstVersion: async () => ({ character: {} as never, version }),
    findById: async () => ({ character: {} as never, currentVersion: version }),
    list: async () => [],
    update: async (character) => character,
    delete: async () => {},
    findVersionById: async () => version,
    findVersionsByCharacterId: async () => [],
    findMaxVersionNumber: async () => 0,
    saveVersion: async (v) => v,
    updateProfileImageAssetId: async () => {},
  },
  memoryRepository: {
    findById: async () => null,
    findByConversationId: async () => [],
    create: async (memory) => memory,
    update: async (memory) => memory,
    deleteById: async () => {},
  },
  memoryChangeProposalRepository: {
    create: async (proposal) => proposal,
    createMany: async () => {},
    findById: async () => null,
    findPendingByConversationId: async () => [],
    findByConversationId: async () => [],
    update: async (proposal) => proposal,
    markProcessed: async () => {},
    discardPendingByConversationId: async () => {},
  },
  summaryRepository: {
    findById: async () => null,
    findByConversationId: async () => [],
    findLatestByConversationId: async () => null,
    create: async (summary) => summary,
    update: async (summary) => summary,
    deleteById: async () => {},
    deleteByIds: async () => {},
  },
  playerCharacterRepository: {
    findById: async () => null,
    list: async () => [],
    create: async (playerCharacter) => playerCharacter,
    update: async (playerCharacter) => playerCharacter,
    delete: async () => {},
  },
  promptContextBuilder: promptBuilder(),
  contextCompaction: {
    needsCompaction: async () => false,
    compact: async () => ({
      ok: true,
      messages: [],
      summary: null,
      compacted: false,
      summaryGenerated: null,
      warning: null,
    }),
  } as unknown as ContextCompactionService,
  providerRegistry: {
    listRegistered: () => ["ollama"],
    getAdapter: async () => provider(),
    createAdapter: () => provider(),
  } as ProviderRegistry,
  providerInstanceRepository: {
    list: async () => [],
    findById: async () => null,
    create: async () => ({} as never),
    update: async () => ({} as never),
    delete: async () => {},
  },
  getDefaultProvider: {
    execute: async () => ({
      provider: null,
      providerInstanceId: null,
      models: {},
    }),
  } as never,
  applyAllMemoryChanges: {
    execute: async () => [],
  } as never,
  generateConversationTitle: {
    execute: async () => ({ title: "Title", titleSource: "auto" }),
  } as never,
  logger,
  ...overrides,
})

const collect = async <T, R>(generator: AsyncGenerator<T, R>) => {
  const events: T[] = []
  let step = await generator.next()
  while (!step.done) {
    events.push(step.value)
    step = await generator.next()
  }
  return { events, result: step.value }
}

describe("ChatEngine", () => {
  it("prepares context and forwards compaction events", async () => {
    const contextCompaction = {
      needsCompaction: vi.fn(async () => true),
      compact: vi.fn(async () => ({
        ok: true,
        messages: [userMessage],
        summary: summaryEntity,
        compacted: true,
        summaryGenerated: summaryDTO,
        warning: { code: "CONTEXT_TRIMMED", message: "trimmed" },
      })),
    } as unknown as ContextCompactionService
    const engine = new ChatEngine(
      buildDeps({
        contextCompaction,
        messageRepository: {
          ...buildDeps().messageRepository,
          findByConversationId: async () => [userMessage],
        },
      }),
    )

    const { events, result } = await collect(
      engine.prepareContext({ conversation, locale: "en" }),
    )

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(events.map((event) => event.type)).toEqual([
      "compacting",
      "context-warning",
      "summary-generated",
    ])
    expect(result.context.systemPrompt).toContain("Old events.")
    expect(result.compactionSummary).toEqual(summaryDTO)
    expect(result.memories).toEqual([])
  })

  it("streams chunks and turns tool calls into proposals", async () => {
    const adapter: ProviderPort = {
      validateConnection: async () => "available",
      listModels: async () => ({ models: [], manualEntryRequired: false }),
      async *generateStreaming() {
        yield { content: "Hello " }
        yield {
          toolCalls: [
            {
              index: 0,
              id: "call-1",
              functionName: "propose_memory_changes",
              argumentsDelta:
                '{"operation":"CREATE","actor":"Alice","title":"A fact","description":"It happened","priority":5}',
            },
          ],
        }
        yield { content: "world" }
      },
    }
    const engine = new ChatEngine(
      buildDeps({
        providerRegistry: {
          listRegistered: () => ["ollama"],
          getAdapter: async () => adapter,
          createAdapter: () => adapter,
        },
      }),
    )

    const { events, result } = await collect(
      engine.streamReply({
        conversation,
        context: { systemPrompt: "System", messages: [] },
        characterVersion: version,
        memories: [],
        operation: "send",
      }),
    )

    expect(events.map((event) => event.content)).toEqual(["Hello ", "world"])
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.content).toBe("Hello world")
    expect(result.proposals).toEqual([
      expect.objectContaining({
        operation: "CREATE",
        actor: "Alice",
        title: "A fact",
      }),
    ])
  })

  it("saves and auto-applies proposals", async () => {
    const createMany = vi.fn(async () => {})
    const apply = vi.fn(async () => [])
    const engine = new ChatEngine(
      buildDeps({
        memoryChangeProposalRepository: {
          ...buildDeps().memoryChangeProposalRepository,
          createMany,
        },
        applyAllMemoryChanges: { execute: apply } as never,
      }),
    )

    await engine.applyMemoryProposals(conversation, [
      {
        operation: "CREATE",
        targetMemoryId: null,
        actor: "Alice",
        title: "A fact",
        description: "It happened",
        priority: 5,
      },
    ])

    expect(createMany).toHaveBeenCalledTimes(1)
    expect(apply).toHaveBeenCalledWith({
      conversationId: "conv-1",
      processedBy: "system",
    })
  })
})
