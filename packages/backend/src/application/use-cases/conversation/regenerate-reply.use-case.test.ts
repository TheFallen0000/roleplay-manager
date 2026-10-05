import { describe, it, expect, vi } from "vitest"

import { RegenerateReplyUseCase } from "./regenerate-reply.use-case"
import type { ConversationRepository } from "../../../domain/ports/conversation.repository"
import type { MessageRepository } from "../../../domain/ports/message.repository"
import type { CharacterRepository } from "../../../domain/ports/character.repository"
import type { PromptContextBuilder } from "../../../domain/ports/prompt-context-builder"
import type { PlayerCharacterRepository } from "../../../domain/ports/player-character.repository"
import type { ProviderRegistry } from "../../../domain/ports/provider.port"
import type { Logger } from "../../../domain/ports/logger.port"
import type { GetDefaultProviderUseCase } from "../provider/get-default-provider.use-case"
import { Conversation } from "../../../domain/entities/conversation.entity"
import { Message } from "../../../domain/entities/message.entity"
import { Character } from "../../../domain/entities/character.entity"
import { CharacterVersion } from "../../../domain/entities/character-version.entity"
import type { StreamChunk } from "../../../domain/value-objects/prompt-context"
import type { ProviderId } from "@workspace/shared/types/provider"
import type { MemoryChangeProposalRepository } from "../../../domain/ports/memory-change-proposal.repository"
import type { ApplyAllMemoryChangesUseCase } from "../memory/apply-all-memory-changes.use-case"
import type { MemoryRepository } from "../../../domain/ports/memory.repository"
import type { ProviderInstanceRepository } from "../../../domain/ports/provider-instance.repository"
import type { SummaryRepository } from "../../../domain/ports/summary.repository"
import type { GenerateSummaryUseCase } from "../summary/generate-summary.use-case"

const playerCharacterRepository = {
  findById: async () => null,
  list: async () => [],
  create: async (pc: unknown) => pc,
  update: async (pc: unknown) => pc,
  delete: async () => {},
} as unknown as PlayerCharacterRepository

const now = new Date()

const baseConversation = Conversation.create({
  id: "conv-1",
  versionId: "ver-1",
  title: "Test",
  titleSource: null,
  provider: "ollama" as ProviderId,
  providerInstanceId: null,
  model: "llama3",
  recentMessageCount: 10,
  summaryFrequency: 20,
  temperature: 0.7,
  maxTokens: 512,
  topP: 1,
  frequencyPenalty: 0,
  presencePenalty: 0,
  stopSequences: [],
  memoryProposalMode: "manual",
  createdAt: now,
  updatedAt: now,
})

const baseCharacter = Character.create({
  id: "char-1",
  name: "Alice",
  createdAt: now,
  updatedAt: now,
})

const baseVersion = CharacterVersion.create({
  id: "ver-1",
  characterId: "char-1",
  name: "Alice",
  subtitle: null,
  profileImageAssetId: null,
  description: "A character",
  instructions: null,
  greeting: "Hello",
  versionNumber: 1,
  createdAt: now,
  cards: [],
})

const baseAssistantMsg = Message.create({
  id: "msg-1",
  conversationId: "conv-1",
  role: "assistant",
  content: "old answer",
  position: 1,
  alternatives: [],
  alternativesCursor: 0,
  createdAt: now,
  editedAt: null,
})

function buildConversationRepo(): ConversationRepository {
  return {
    findById: async () => baseConversation,
    findByIdWithMessages: async () => null,
    list: async () => [],
    create: async () => baseConversation,
    update: async () => baseConversation,
    updateSettings: async () => baseConversation,
    clearProviderInstanceId: vi.fn(),
  }
}

function buildMessageRepo(): MessageRepository {
  return {
    create: async (m) => m,
    findByConversationId: async () => [baseAssistantMsg],
    findById: async (id) =>
      id === "msg-1" ? baseAssistantMsg : null,
    findLastByConversationId: async () => baseAssistantMsg,
    update: async (m) => m,
    deleteById: async () => {},
    deleteAfterPosition: async () => {},
    clearAlternatives: async () => {},
  }
}

function buildCharacterRepo(): CharacterRepository {
  return {
    findById: async () => ({ character: baseCharacter, currentVersion: baseVersion }),
    findVersionById: async () => baseVersion,
    findVersionsByCharacterId: async () => [baseVersion],
    findMaxVersionNumber: async () => 1,
    saveVersion: async (v) => v,
    updateProfileImageAssetId: async () => {},
    createWithFirstVersion: async () => ({ character: baseCharacter, version: baseVersion }),
    list: async () => [],
    update: async () => baseCharacter,
    delete: async () => {},
  }
}

function buildPromptContextBuilder(): PromptContextBuilder {
  return {
    build: async () => ({
      systemPrompt: "Eres un personaje.",
      messages: [{ role: "user", content: "Hola" }],
    }),
  }
}

function buildLogger(): Logger {
  return {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: vi.fn(function (this: Logger) {
      return this
    }),
  }
}

function buildDefaultProvider(): GetDefaultProviderUseCase {
  return {
    execute: async () => ({
      provider: "ollama" as ProviderId,
      providerInstanceId: null,
      model: "llama3",
    }),
  } as unknown as GetDefaultProviderUseCase
}

const providerInstanceRepository: ProviderInstanceRepository = {
  findById: async () => null,
  list: async () => [],
  create: async () => ({} as any),
  update: async () => ({} as any),
  delete: async () => {},
}

function buildMemoryRepo(): MemoryRepository {
  return {
    findById: async () => null,
    findByConversationId: async () => [],
    create: async (m) => m,
    update: async (m) => m,
    deleteById: async () => {},
  }
}

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

describe("RegenerateReplyUseCase - tool calls", () => {
  it("extrae propuestas desde tool calls", async () => {
    const savedProposals: any[] = []

    const proposalRepo: MemoryChangeProposalRepository = {
      create: async (p: any) => p,
      createMany: async (entities: any[]) => {
        entities.forEach((e) => savedProposals.push(e))
      },
      findById: async () => null,
      findPendingByConversationId: async () => savedProposals,
      findByConversationId: async () => [],
      update: async (p: any) => p,
      markProcessed: async () => {},
      discardPendingByConversationId: async () => {},
    }

    const providerWithToolCalls: ProviderRegistry = {
      listRegistered: () => ["ollama"],
      createAdapter: vi.fn(),
      getAdapter: async () => ({
        validateConnection: async () => "available" as const,
        listModels: async () => ({ models: [], manualEntryRequired: false }),
        generateStreaming: function (): AsyncIterable<StreamChunk> {
          return {
            [Symbol.asyncIterator]: () => {
              const chunks: StreamChunk[] = [
                {
                  toolCalls: [
                    {
                      index: 0,
                      id: "c1",
                      functionName: "propose_memory_changes",
                      argumentsDelta: '{"operation":"CREATE","actor":"Bob","title":"T","description":"D","priority":4}',
                    },
                  ],
                },
                { content: "Regenerado" },
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
    }

    const applyAll = {
      execute: async () => [],
    } as unknown as ApplyAllMemoryChangesUseCase

    const useCase = new RegenerateReplyUseCase(
      buildConversationRepo(),
      buildMessageRepo(),
      buildCharacterRepo(),
      buildMemoryRepo(),
      proposalRepo,
      buildPromptContextBuilder(),
      playerCharacterRepository,
      providerWithToolCalls,
      buildLogger(),
      buildDefaultProvider(),
      providerInstanceRepository,
      applyAll,
      buildSummaryRepo(),
      buildGenerateSummary(),
    )

    for await (const _ of useCase.execute({
      conversationId: "conv-1",
      messageId: "msg-1",
    })) {
      // consume
    }

    expect(savedProposals).toHaveLength(1)
    expect(savedProposals[0].operation).toBe("CREATE")
    expect(savedProposals[0].actor).toBe("Bob")
  })

  it("excluye el mensaje regenerado del contexto enviado al modelo", async () => {
    const sentMessages: Message[] = []
    const capturingPromptBuilder: PromptContextBuilder = {
      build: async (params) => {
        sentMessages.push(...params.messages)
        return { systemPrompt: "", messages: [] }
      },
    }

    const userMsg = Message.create({
      id: "user-1",
      conversationId: "conv-1",
      role: "user",
      content: "Hola",
      position: 0,
      alternatives: [],
      alternativesCursor: 0,
      createdAt: now,
      editedAt: null,
    })

    const multiMsgRepo: MessageRepository = {
      ...buildMessageRepo(),
      findByConversationId: async () => [userMsg, baseAssistantMsg],
    }

    const providerEmpty: ProviderRegistry = {
      listRegistered: () => ["ollama"],
      createAdapter: vi.fn(),
      getAdapter: async () => ({
        validateConnection: async () => "available" as const,
        listModels: async () => ({ models: [], manualEntryRequired: false }),
        generateStreaming: function (): AsyncIterable<StreamChunk> {
          return {
            [Symbol.asyncIterator]: () => {
              const chunks: StreamChunk[] = [
                { content: "Nueva respuesta" },
                { content: " extendida" },
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
    }

    const useCase = new RegenerateReplyUseCase(
      buildConversationRepo(),
      multiMsgRepo,
      buildCharacterRepo(),
      buildMemoryRepo(),
      { create: async (p: any) => p, createMany: async () => {}, findById: async () => null, findPendingByConversationId: async () => [], findByConversationId: async () => [], update: async (p: any) => p, markProcessed: async () => {}, discardPendingByConversationId: async () => {} } as unknown as MemoryChangeProposalRepository,
      capturingPromptBuilder,
      playerCharacterRepository,
      providerEmpty,
      buildLogger(),
      buildDefaultProvider(),
      providerInstanceRepository,
      { execute: async () => [] } as unknown as ApplyAllMemoryChangesUseCase,
      buildSummaryRepo(),
      buildGenerateSummary(),
    )

    for await (const _ of useCase.execute({
      conversationId: "conv-1",
      messageId: "msg-1",
    })) {
      // consume
    }

    expect(sentMessages).toHaveLength(1)
    expect(sentMessages[0].id).toBe("user-1")
    expect(sentMessages[0].id).not.toBe("msg-1")
  })
})
