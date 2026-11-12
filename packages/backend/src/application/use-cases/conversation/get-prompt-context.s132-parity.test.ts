import { describe, expect, it, vi } from "vitest"

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

const now = new Date("2026-11-07T12:00:00.000Z")

const logger: Logger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  child: vi.fn(),
}

const character = Character.create({
  id: "char-1",
  name: "Lyra",
  createdAt: now,
  updatedAt: now,
})

const version = CharacterVersion.create({
  id: "ver-1",
  characterId: "char-1",
  name: "Lyra",
  subtitle: null,
  profileImageAssetId: null,
  description: "A guardian of the forest.",
  instructions: null,
  greeting: "Hello!",
  versionNumber: 1,
  createdAt: now,
  cards: [],
  personality: "Brave and kind.",
  scenario: "An ancient forest.",
  mesExample: "<START>\n{{char}}: Welcome.",
  systemPrompt: "You are the forest's guardian.",
  postHistoryInstructions: "Post history marker.",
  creatorNotes: "Creator note must stay out.",
  lorebookVersionId: "lv-1",
} as never)

const lorebookEntry = {
  id: "entry-1",
  lorebookId: "book-1",
  name: "Moon lore",
  sourceId: "1",
  keys: ["moon"],
  secondaryKeys: [],
  comment: "Moon lore",
  content: "The moon is made of cheese.",
  constant: true,
  selective: false,
  selectiveLogic: 0 as const,
  insertionOrder: 100,
  position: "after_char" as const,
  rawPosition: "1",
  priority: 0,
  enabled: true,
  caseSensitive: false,
  wholeWords: false,
  order: 0,
  extensions: {},
  unknownFields: null,
  createdAt: now,
  updatedAt: now,
}

const lorebook = {
  id: "book-1",
  characterId: "char-1",
  name: "Forest lore",
  description: null,
  scanDepth: 4,
  tokenBudget: 400,
  recursiveScanning: false,
  extensions: {},
  unknownFields: null,
  createdAt: now,
  updatedAt: now,
}

const lorebookVersion = {
  id: "lv-1",
  lorebookId: "book-1",
  versionNumber: 1,
  name: "Forest lore",
  description: null,
  scanDepth: 4,
  tokenBudget: 400,
  recursiveScanning: false,
  entriesJson: JSON.stringify([lorebookEntry]),
  sourceKey: "a".repeat(64),
  createdAt: now,
}

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
  lorebookRepository: Record<string, unknown>
}

const buildRepos = (
  messages: Message[],
  conversation: Conversation = buildConversation()
): Repos => {
  const byId = new Map(messages.map((message) => [message.id, message]))
  const findPositionById = async (id: string) => byId.get(id)?.position ?? null

  return {
    conversationRepository: {
      create: async (value) => value,
      findById: async () => conversation,
      list: async () => [],
      listByCharacterId: async () => [],
      listByCharacterIds: async () => [],
      existsByAssetId: async () => false,
      update: async (value) => value,
      updateSettings: async () => conversation,
      clearProviderInstanceId: async () => {},
    },
    characterRepository: {
      createWithFirstVersion: async () => ({ character, version }),
      findById: async () => ({ character, currentVersion: version }),
      list: async () => [],
      update: async (value) => value,
      delete: async () => {},
      findVersionById: async () => version,
      findVersionsByCharacterId: async () => [],
      findMaxVersionNumber: async () => 0,
      saveVersion: async (value) => value,
      updateProfileImageAssetId: async () => {},
    },
    messageHistoryRepository: buildMessageHistoryRepository(
      () => messages,
      findPositionById
    ),
    messageRepository: {
      create: async (value) => value,
      findByConversationId: async () => messages,
      findById: async (id) => byId.get(id) ?? null,
      findLastByConversationId: async () => messages.at(-1) ?? null,
      update: async (value) => value,
      deleteById: async () => {},
      deleteAfterPosition: async () => {},
      clearAlternatives: async () => {},
    },
    memoryRepository: {
      findById: async () => null,
      findByConversationId: async () => [],
      create: async (value) => value,
      update: async (value) => value,
      deleteById: async () => {},
    },
    summaryRepository: {
      findById: async () => null,
      findByConversationId: async () => [],
      findLatestByConversationId: async () => null,
      create: async (value) => value,
      update: async (value) => value,
      deleteById: async () => {},
      deleteByIds: async () => {},
    },
    playerCharacterRepository: {
      findById: async () => null,
      list: async () => [],
      create: async (value) => value,
      update: async (value) => value,
      delete: async () => {},
    },
    lorebookRepository: {
      findByCharacterId: async () => ({
        book: lorebook,
        entries: [lorebookEntry],
      }),
      findVersionById: async () => lorebookVersion,
      upsertBook: async (value: unknown) => value,
      createEntry: async (value: unknown) => value,
      updateEntry: async (value: unknown) => value,
      deleteEntry: async () => {},
      reorderEntries: async () => {},
      replaceBook: async () => {},
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
  deps: Repos
): ChatEngineDeps => {
  const builder = new PromptContextBuilderImpl()
  const loader = new ConversationContextLoader(deps as never)
  const compiler = new ContextCompiler(builder)
  const contextCompaction = new ContextCompactionService(
    builder,
    { execute: vi.fn() } as never,
    logger
  )

  return {
    messageRepository: deps.messageRepository,
    messageHistoryRepository: deps.messageHistoryRepository,
    characterRepository: deps.characterRepository,
    memoryRepository: deps.memoryRepository,
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
    summaryRepository: deps.summaryRepository,
    playerCharacterRepository: deps.playerCharacterRepository,
    promptContextBuilder: builder,
    contextCompaction,
    contextLoader: loader,
    contextCompiler: compiler,
    providerRegistry: {
      listRegistered: () => ["ollama"],
      getAdapter: async () => ({ validateConnection: async () => "available" }),
      createAdapter: () => ({ validateConnection: async () => "available" }),
    } as never,
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
  }
}

describe("S132 preview/send parity with card overrides and lorebook", () => {
  it("produces the same systemPrompt and manifest for preview and send", async () => {
    const messages = [
      buildMessage("msg-1", "user", "Hello there", 1),
      buildMessage("msg-2", "assistant", "The moon rises.", 2),
      buildMessage("msg-3", "user", "Tell me about the moon.", 3),
    ]
    const deps = buildRepos(messages)

    const builder = new PromptContextBuilderImpl()
    const loader = new ConversationContextLoader(deps as never)
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

    const engine = new ChatEngine(buildEngineDeps(messages, deps))
    const send = await collect(
      engine.prepareContext({ conversation: buildConversation(), locale: "en" })
    )

    expect(send.ok).toBe(true)
    if (!send.ok) return

    expect(preview.systemPrompt).toContain("The moon is made of cheese.")
    expect(send.context.systemPrompt).toContain("The moon is made of cheese.")
    expect(preview.systemPrompt).toContain("Post history marker.")
    expect(send.context.systemPrompt).toContain("Post history marker.")
    expect(preview.systemPrompt).toContain("You are the forest's guardian.")
    expect(send.context.systemPrompt).toContain("You are the forest's guardian.")
    expect(preview.systemPrompt).not.toContain("Creator note must stay out.")

    expect(preview.systemPrompt).toBe(send.context.systemPrompt)
    expect(preview.messages).toEqual(send.context.messages)
    expect(send.manifest).toEqual(preview.manifest)
  })

  it("keeps the exact same prompt for two consecutive previews", async () => {
    const messages = [
      buildMessage("msg-1", "user", "Hello", 1),
      buildMessage("msg-2", "assistant", "Hi", 2),
    ]
    const deps = buildRepos(messages)
    const builder = new PromptContextBuilderImpl()
    const loader = new ConversationContextLoader(deps as never)
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

    const first = await useCase.execute("conv-1", undefined, "en")
    const second = await useCase.execute("conv-1", undefined, "en")

    expect(second.systemPrompt).toBe(first.systemPrompt)
    expect(second.manifest).toEqual(first.manifest)
  })
})
