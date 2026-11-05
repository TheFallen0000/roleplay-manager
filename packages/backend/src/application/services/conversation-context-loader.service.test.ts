import { describe, it, expect } from "vitest"

import {
  CharacterNotFoundError,
  CharacterVersionNotFoundError,
  ConversationNotFoundError,
} from "../../domain/errors"
import { Character } from "../../domain/entities/character.entity"
import { CharacterVersion } from "../../domain/entities/character-version.entity"
import {
  Conversation,
  type ConversationProps,
} from "../../domain/entities/conversation.entity"
import { Memory } from "../../domain/entities/memory.entity"
import { Message } from "../../domain/entities/message.entity"
import { Summary } from "../../domain/entities/summary.entity"
import { PlayerCharacter } from "../../domain/entities/player-character.entity"
import type { CharacterRepository } from "../../domain/ports/character.repository"
import type { ConversationRepository } from "../../domain/ports/conversation.repository"
import type { MemoryRepository } from "../../domain/ports/memory.repository"
import type {
  MessageHistoryRepository,
  MessageRepository,
} from "../../domain/ports/message.repository"
import type { PlayerCharacterRepository } from "../../domain/ports/player-character.repository"
import type { SummaryRepository } from "../../domain/ports/summary.repository"
import { buildMessageHistoryRepository } from "../../test-utils/message-history"
import { ConversationContextLoader } from "./conversation-context-loader.service"

const now = new Date("2026-11-05T12:00:00.000Z")

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
  maxTokens: 2_048,
  topP: 0.9,
  frequencyPenalty: 0,
  presencePenalty: 0,
  stopSequences: [],
  memoryProposalMode: "auto",
  createdAt: now,
  updatedAt: now,
})

const playerCharacter = PlayerCharacter.create({
  id: "pc-1",
  name: "Alice",
  description: "A curious explorer.",
  createdAt: now,
  updatedAt: now,
})

const buildMessage = (
  id: string,
  role: "user" | "assistant",
  content: string,
  position: number,
  createdAt = now
): Message =>
  Message.create({
    id,
    conversationId: "conv-1",
    role,
    content,
    position,
    alternatives: [],
    alternativesCursor: 0,
    createdAt,
    editedAt: null,
  })

const summary = Summary.reconstruct({
  id: "sum-1",
  conversationId: "conv-1",
  content: "Summary of the early conversation.",
  firstMessageId: "msg-0",
  lastMessageId: "msg-3",
  model: "llama3",
  provider: "ollama",
  createdAt: now,
  editedAt: null,
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

const buildRepos = (overrides: {
  messages?: Message[]
  summary?: Summary | null
  memories?: Memory[]
  conversation?: Conversation | null
  version?: CharacterVersion | null
  character?: { character: Character; currentVersion: CharacterVersion } | null
  playerCharacter?: PlayerCharacter | null
}): Repos => {
  const messages = overrides.messages ?? []
  const byId = new Map(messages.map((m) => [m.id, m]))

  const conversationRepository: ConversationRepository = {
    create: async (c) => c,
    findById: async () => overrides.conversation ?? conversation,
    list: async () => [],
    listByCharacterId: async () => [],
    listByCharacterIds: async () => [],
    existsByAssetId: async () => false,
    update: async (c) => c,
    updateSettings: async (_id, _s) => conversation,
    clearProviderInstanceId: async () => {},
  }

  const characterRepository: CharacterRepository = {
    createWithFirstVersion: async () => ({ character, version }),
    findById: async () =>
      overrides.character !== undefined
        ? overrides.character
        : { character, currentVersion: version },
    list: async () => [],
    update: async (c) => c,
    delete: async () => {},
    findVersionById: async () =>
      overrides.version !== undefined ? overrides.version : version,
    findVersionsByCharacterId: async () => [],
    findMaxVersionNumber: async () => 0,
    saveVersion: async (v) => v,
    updateProfileImageAssetId: async () => {},
  }

  const findPositionById = async (id: string) => {
    const message = byId.get(id)
    return message ? message.position : null
  }

  const messageHistoryRepository = buildMessageHistoryRepository(
    () => messages,
    findPositionById
  )

  const messageRepository: MessageRepository = {
    create: async (m) => m,
    findByConversationId: async () => messages,
    findById: async (id) => byId.get(id) ?? null,
    findLastByConversationId: async () => messages.at(-1) ?? null,
    update: async (m) => m,
    deleteById: async () => {},
    deleteAfterPosition: async () => {},
    clearAlternatives: async () => {},
  }

  const memoryRepository: MemoryRepository = {
    findById: async () => null,
    findByConversationId: async () => overrides.memories ?? [],
    create: async (m) => m,
    update: async (m) => m,
    deleteById: async () => {},
  }

  const summaryRepository: SummaryRepository = {
    findById: async () => overrides.summary ?? summary,
    findByConversationId: async () =>
      overrides.summary ? [overrides.summary] : [],
    findLatestByConversationId: async () => overrides.summary ?? summary,
    create: async (s) => s,
    update: async (s) => s,
    deleteById: async () => {},
    deleteByIds: async () => {},
  }

  const playerCharacterRepository: PlayerCharacterRepository = {
    findById: async () => overrides.playerCharacter ?? playerCharacter,
    list: async () => [],
    create: async (pc) => pc,
    update: async (pc) => pc,
    delete: async () => {},
  }

  return {
    conversationRepository,
    characterRepository,
    messageHistoryRepository,
    messageRepository,
    memoryRepository,
    summaryRepository,
    playerCharacterRepository,
  }
}

describe("ConversationContextLoader", () => {
  it("loads only messages after the summary boundary", async () => {
    const messages = [
      buildMessage("msg-0", "user", "before summary 0", 0),
      buildMessage("msg-1", "assistant", "before summary 1", 1),
      buildMessage("msg-2", "user", "before summary 2", 2),
      buildMessage("msg-3", "assistant", "last summarized", 3),
      buildMessage("msg-4", "user", "after summary", 4),
      buildMessage("msg-5", "assistant", "after summary 2", 5),
    ]
    const loader = new ConversationContextLoader(
      buildRepos({ messages, summary }) as never
    )
    const result = await loader.load({ conversationId: "conv-1" })

    expect(result.messagesAfterSummary.map((m) => m.id)).toEqual([
      "msg-4",
      "msg-5",
    ])
    expect(result.latestSummary?.id).toBe("sum-1")
  })

  it("appends pending messages, deduplicating ids already loaded", async () => {
    const messages = [buildMessage("msg-4", "user", "after summary", 4)]
    const pending = buildMessage("msg-5", "assistant", "pending reply", 5)
    const loader = new ConversationContextLoader(
      buildRepos({ messages, summary }) as never
    )
    const result = await loader.load({
      conversationId: "conv-1",
      pendingMessages: [messages[0], pending],
    })

    expect(result.pendingMessages.map((m) => m.id)).toEqual(["msg-5"])
    expect(result.messages.map((m) => m.id)).toEqual(["msg-4", "msg-5"])
  })

  it("excludes the requested message from the final list", async () => {
    const messages = [
      buildMessage("msg-4", "user", "after summary", 4),
      buildMessage("msg-5", "assistant", "being regenerated", 5),
      buildMessage("msg-6", "user", "latest", 6),
    ]
    const loader = new ConversationContextLoader(
      buildRepos({ messages, summary }) as never
    )
    const result = await loader.load({
      conversationId: "conv-1",
      excludeMessageId: "msg-5",
    })

    expect(result.excludedMessageId).toBe("msg-5")
    expect(result.messages.map((m) => m.id)).toEqual(["msg-4", "msg-6"])
  })

  it("filters decayed memories into promptMemories while keeping raw memories", async () => {
    const oldDate = new Date("2025-12-01T00:00:00.000Z")
    const messages = [
      buildMessage(
        "msg-1",
        "user",
        "turn one",
        1,
        new Date("2026-01-01T00:00:00.000Z")
      ),
      buildMessage(
        "msg-2",
        "assistant",
        "reply",
        2,
        new Date("2026-01-02T00:00:00.000Z")
      ),
      buildMessage(
        "msg-3",
        "user",
        "turn two",
        3,
        new Date("2026-01-03T00:00:00.000Z")
      ),
      buildMessage(
        "msg-4",
        "assistant",
        "reply",
        4,
        new Date("2026-01-04T00:00:00.000Z")
      ),
      buildMessage(
        "msg-5",
        "user",
        "turn three",
        5,
        new Date("2026-01-05T00:00:00.000Z")
      ),
    ]
    const decayedConversation = Conversation.create({
      ...conversationProps(),
      memoryDecayMode: "silent",
      memoryDecayThreshold: 5,
      memoryDecaySpeed: 2,
    })
    const memories = [
      Memory.reconstruct({
        id: "mem-fresh-high",
        conversationId: "conv-1",
        actor: "Test Character",
        title: "Fresh high priority",
        description: "Always eligible.",
        priority: 9,
        createdBy: "assistant",
        updatedBy: "system",
        createdAt: now,
        updatedAt: new Date("2026-01-08T00:00:00.000Z"),
      }),
      Memory.reconstruct({
        id: "mem-old-high",
        conversationId: "conv-1",
        actor: "Alice",
        title: "Old high priority",
        description: "Still eligible despite decay.",
        priority: 10,
        createdBy: "user",
        updatedBy: "system",
        createdAt: now,
        updatedAt: oldDate,
      }),
      Memory.reconstruct({
        id: "mem-old-low",
        conversationId: "conv-1",
        actor: "Alice",
        title: "Old low priority",
        description: "Decayed below the threshold.",
        priority: 6,
        createdBy: "user",
        updatedBy: "system",
        createdAt: now,
        updatedAt: oldDate,
      }),
    ]
    const repos = buildRepos({
      messages,
      memories,
      conversation: decayedConversation,
    })
    const loader = new ConversationContextLoader(repos as never)

    const result = await loader.load({ conversationId: "conv-1" })

    expect(result.memories.map((m) => m.id)).toEqual([
      "mem-fresh-high",
      "mem-old-high",
      "mem-old-low",
    ])
    expect(result.promptMemories.map((m) => m.id)).toEqual([
      "mem-fresh-high",
      "mem-old-high",
    ])
  })

  it("resolves the player character when the conversation references one", async () => {
    const withPlayer = Conversation.create({
      ...conversationProps(),
      playerCharacterId: "pc-1",
    })
    const repos = buildRepos({ conversation: withPlayer })
    const loader = new ConversationContextLoader(repos as never)

    const result = await loader.load({ conversationId: "conv-1" })

    expect(result.playerCharacter).toEqual({
      name: "Alice",
      description: "A curious explorer.",
    })
  })

  it("stays pinned to the conversation's original character version (S129)", async () => {
    const oldVersion = CharacterVersion.create({
      id: "ver-old",
      characterId: "char-1",
      name: "Test Character",
      subtitle: null,
      profileImageAssetId: null,
      description: "Old description",
      instructions: null,
      greeting: "Hello!",
      versionNumber: 1,
      createdAt: now,
      cards: [],
    })
    const newVersion = CharacterVersion.create({
      id: "ver-new",
      characterId: "char-1",
      name: "Test Character",
      subtitle: null,
      profileImageAssetId: null,
      description: "New description",
      instructions: null,
      greeting: "Hello!",
      versionNumber: 2,
      createdAt: now,
      cards: [],
    })
    const pinnedConversation = Conversation.create({
      ...conversationProps(),
      versionId: "ver-old",
    })
    const repos = buildRepos({
      conversation: pinnedConversation,
      version: oldVersion,
      character: { character, currentVersion: newVersion },
    })
    const loader = new ConversationContextLoader(repos as never)

    const result = await loader.load({ conversationId: "conv-1" })

    expect(result.characterVersion.id).toBe("ver-old")
    expect(result.characterVersion.description).toBe("Old description")
  })

  it("throws ConversationNotFoundError for a missing conversation", async () => {
    const loader = new ConversationContextLoader(
      buildRepos({ conversation: null }) as never
    )
    await expect(loader.load({ conversationId: "missing" })).rejects.toThrow(
      ConversationNotFoundError
    )
  })

  it("throws CharacterVersionNotFoundError for a missing version", async () => {
    const loader = new ConversationContextLoader(
      buildRepos({ version: null }) as never
    )
    await expect(loader.load({ conversationId: "conv-1" })).rejects.toThrow(
      CharacterVersionNotFoundError
    )
  })

  it("throws CharacterNotFoundError for a missing character", async () => {
    const loader = new ConversationContextLoader(
      buildRepos({ character: null }) as never
    )
    await expect(loader.load({ conversationId: "conv-1" })).rejects.toThrow(
      CharacterNotFoundError
    )
  })
})

function conversationProps(): ConversationProps {
  return {
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
  }
}
