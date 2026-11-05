import { describe, it, expect, vi } from "vitest"

import type { Logger } from "../../../domain/ports/logger.port"
import { Character } from "../../../domain/entities/character.entity"
import { CharacterVersion } from "../../../domain/entities/character-version.entity"
import {
  Conversation,
  type ConversationProps,
} from "../../../domain/entities/conversation.entity"
import { Message } from "../../../domain/entities/message.entity"
import type { CharacterRepository } from "../../../domain/ports/character.repository"
import type { ConversationRepository } from "../../../domain/ports/conversation.repository"
import type { MemoryRepository } from "../../../domain/ports/memory.repository"
import type {
  MessageHistoryRepository,
  MessageRepository,
} from "../../../domain/ports/message.repository"
import type { PlayerCharacterRepository } from "../../../domain/ports/player-character.repository"
import type { SummaryRepository } from "../../../domain/ports/summary.repository"
import { buildMessageHistoryRepository } from "../../../test-utils/message-history"
import { PromptContextBuilderImpl } from "../../../infrastructure/adapters/secondary/prompt-context-builder/prompt-context-builder.impl"
import { ConversationContextLoader } from "../../services/conversation-context-loader.service"
import { ContextCompiler } from "../../services/context-compiler.service"
import { ContextCompactionService } from "../../services/context-compaction.service"
import {
  ChatEngine,
  type ChatEngineDeps,
} from "../../services/chat-engine.service"
import { GetPromptContextUseCase } from "./get-prompt-context.use-case"

const now = new Date("2026-11-05T12:00:00.000Z")

const logger: Logger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  child: vi.fn(),
}

const character = Character.create({
  id: "char-1",
  name: "Test Character",
  createdAt: now,
  updatedAt: now,
})

const version = CharacterVersion.create({
  id: "ver-1",
  characterId: "char-1",
  name: "Test Character",
  subtitle: null,
  profileImageAssetId: null,
  description: "A test character.",
  instructions: null,
  greeting: "Hello!",
  versionNumber: 1,
  createdAt: now,
  cards: [],
})

const buildMessage = (
  id: string,
  role: "user" | "assistant",
  content: string,
  position: number
): Message =>
  Message.create({
    id,
    conversationId: "conv-1",
    role,
    content,
    position,
    alternatives: [],
    alternativesCursor: 0,
    createdAt: now,
    editedAt: null,
  })

const buildConversation = (overrides: Partial<ConversationProps> = {}) =>
  Conversation.create({
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
    maxTokens: 2_048,
    topP: 0.9,
    frequencyPenalty: 0,
    presencePenalty: 0,
    stopSequences: [],
    memoryProposalMode: "auto",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  })

interface Repos {
  conversationRepository: ConversationRepository
  characterRepository: CharacterRepository
  messageHistoryRepository: MessageHistoryRepository
  messageRepository: MessageRepository
  memoryRepository: MemoryRepository
  summaryRepository: SummaryRepository
  playerCharacterRepository: PlayerCharacterRepository
}

const buildRepos = (
  messages: Message[],
  conversation: Conversation = buildConversation(),
): Repos => {
  const byId = new Map(messages.map((m) => [m.id, m]))
  const findPositionById = async (id: string) => {
    const message = byId.get(id)
    return message ? message.position : null
  }

  return {
    conversationRepository: {
      create: async (c) => c,
      findById: async () => conversation,
      list: async () => [],
      listByCharacterId: async () => [],
      listByCharacterIds: async () => [],
      existsByAssetId: async () => false,
      update: async (c) => c,
      updateSettings: async (_id, _s) => conversation,
      clearProviderInstanceId: async () => {},
    },
    characterRepository: {
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
    },
    messageHistoryRepository: buildMessageHistoryRepository(
      () => messages,
      findPositionById
    ),
    messageRepository: {
      create: async (m) => m,
      findByConversationId: async () => messages,
      findById: async (id) => byId.get(id) ?? null,
      findLastByConversationId: async () => messages.at(-1) ?? null,
      update: async (m) => m,
      deleteById: async () => {},
      deleteAfterPosition: async () => {},
      clearAlternatives: async () => {},
    },
    memoryRepository: {
      findById: async () => null,
      findByConversationId: async () => [],
      create: async (m) => m,
      update: async (m) => m,
      deleteById: async () => {},
    },
    summaryRepository: {
      findById: async () => null,
      findByConversationId: async () => [],
      findLatestByConversationId: async () => null,
      create: async (s) => s,
      update: async (s) => s,
      deleteById: async () => {},
      deleteByIds: async () => {},
    },
    playerCharacterRepository: {
      findById: async () => null,
      list: async () => [],
      create: async (pc) => pc,
      update: async (pc) => pc,
      delete: async () => {},
    },
  }
}

const collect = async <T, R>(generator: AsyncGenerator<T, R>) => {
  let step = await generator.next()
  while (!step.done) step = await generator.next()
  return step.value
}

const buildEngineDeps = (
  messages: Message[],
  overrides: Partial<ChatEngineDeps> = {}
): ChatEngineDeps => {
  const repos = buildRepos(messages)
  const builder = new PromptContextBuilderImpl()
  const loader = new ConversationContextLoader(repos as never)
  const compiler = new ContextCompiler(builder)
  const contextCompaction = new ContextCompactionService(
    builder,
    {
      execute: vi.fn(async () => ({
        error: { code: "NO_MESSAGES", message: "stub" },
      })),
    } as never,
    logger
  )

  return {
    messageRepository: repos.messageRepository,
    messageHistoryRepository: repos.messageHistoryRepository,
    characterRepository: repos.characterRepository,
    memoryRepository: repos.memoryRepository,
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
    summaryRepository: repos.summaryRepository,
    playerCharacterRepository: repos.playerCharacterRepository,
    promptContextBuilder: builder,
    contextCompaction,
    contextLoader: loader,
    contextCompiler: compiler,
    providerRegistry: {
      listRegistered: () => ["ollama"],
      getAdapter: async () =>
        ({ validateConnection: async () => "available" }) as never,
      createAdapter: () =>
        ({ validateConnection: async () => "available" }) as never,
    },
    providerInstanceRepository: {
      list: async () => [],
      findById: async () => null,
      create: async () => ({}) as never,
      update: async () => ({}) as never,
      delete: async () => {},
    },
    getDefaultProvider: {
      execute: async () => ({
        provider: null,
        providerInstanceId: null,
        models: {},
      }),
    } as never,
    applyAllMemoryChanges: { execute: async () => [] } as never,
    generateConversationTitle: {
      execute: async () => ({ title: "Title", titleSource: "auto" }),
    } as never,
    logger,
    ...overrides,
  }
}

describe("preview/send context parity", () => {
  it("produces the same systemPrompt, messages and manifest without compaction", async () => {
    const messages = [
      buildMessage("msg-1", "user", "Hello there", 1),
      buildMessage("msg-2", "assistant", "Hello! How can I help?", 2),
      buildMessage("msg-3", "user", "Tell me about the mountains.", 3),
    ]
    const repos = buildRepos(messages)
    const builder = new PromptContextBuilderImpl()
    const loader = new ConversationContextLoader(repos as never)
    const compiler = new ContextCompiler(builder)
    const contextCompaction = new ContextCompactionService(
      builder,
      { execute: vi.fn() } as never,
      logger
    )

    const useCase = new GetPromptContextUseCase(
      loader,
      compiler,
      contextCompaction
    )
    const preview = await useCase.execute("conv-1", undefined, "en")

    const engine = new ChatEngine(buildEngineDeps(messages))
    const send = await collect(
      engine.prepareContext({ conversation: buildConversation(), locale: "en" })
    )

    expect(send.ok).toBe(true)
    if (!send.ok) return

    expect(preview.systemPrompt).toBe(send.context.systemPrompt)
    expect(preview.messages).toEqual(send.context.messages)
    expect(preview.manifest).toBeDefined()
    expect(send.manifest).toBeDefined()
    expect(send.manifest).toEqual(preview.manifest)
  })

  it("marks needed=true and applied=false in the preview when above threshold", async () => {
    const messages = [
      buildMessage(
        "msg-1",
        "user",
        "A fairly long opening message to inflate the context.",
        1
      ),
      buildMessage(
        "msg-2",
        "assistant",
        "A long reply that also inflates the context further.",
        2
      ),
    ]
    // A tiny window forces the threshold to be crossed by the system prompt alone.
    const conversation = buildConversation({
      contextWindow: 400,
      compactionThreshold: 50,
    })
    const repos = buildRepos(messages, conversation)
    const builder = new PromptContextBuilderImpl()
    const loader = new ConversationContextLoader(repos as never)
    const compiler = new ContextCompiler(builder)
    const contextCompaction = new ContextCompactionService(
      builder,
      { execute: vi.fn() } as never,
      logger
    )

    const useCase = new GetPromptContextUseCase(
      loader,
      compiler,
      contextCompaction
    )
    const preview = await useCase.execute(conversation.id, undefined, "en")

    expect(preview.manifest).toBeDefined()
    expect(preview.manifest!.compaction).toEqual({
      needed: true,
      applied: false,
      threshold: 50,
    })
  })
})
