import { describe, expect, it, vi } from "vitest"

import type { SummaryDTO } from "@workspace/shared/types/summary"

import { ContextCompactionService } from "./context-compaction.service"
import type { GenerateSummaryUseCase } from "../use-cases/summary/generate-summary.use-case"
import { Conversation } from "../../domain/entities/conversation.entity"
import { CharacterVersion } from "../../domain/entities/character-version.entity"
import { Message } from "../../domain/entities/message.entity"
import { Summary } from "../../domain/entities/summary.entity"
import type { PromptContextBuilder } from "../../domain/ports/prompt-context-builder"
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

const conversation = (overrides: {
  contextWindow?: number | null
  maxTokens?: number
  compactionThreshold?: number
} = {}) =>
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
    contextWindow: 1_000,
    maxTokens: 100,
    compactionThreshold: 80,
    temperature: 0.7,
    topP: 0.9,
    frequencyPenalty: 0,
    presencePenalty: 0,
    stopSequences: [],
    memoryProposalMode: "auto",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  })

const messages = (count: number, length = 300): Message[] =>
  Array.from({ length: count }, (_, index) =>
    Message.create({
      id: `msg-${index}`,
      conversationId: "conv-1",
      role: index % 2 === 0 ? "user" : "assistant",
      content: `${index}:` + "x".repeat(length),
      position: index,
      alternatives: [],
      alternativesCursor: 0,
      createdAt: now,
      editedAt: null,
    }),
  )

const builder = (systemLength = 300): PromptContextBuilder => ({
  build: async (params) => ({
    systemPrompt: "s".repeat(systemLength) + (params.summary?.content ?? ""),
    messages: params.messages.map((message) => ({
      role: message.role,
      content: message.content,
    })),
  }),
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
  content: "A compact summary.",
  firstMessageId: "msg-0",
  lastMessageId: "msg-8",
  model: "llama3",
  provider: "ollama",
  createdAt: now.toISOString(),
  editedAt: null,
}

const buildSummaryUseCase = (result: unknown) =>
  ({ execute: vi.fn(async () => result) }) as unknown as GenerateSummaryUseCase

const buildService = (
  promptBuilder = builder(),
  summaryUseCase = buildSummaryUseCase({ summary: summaryDTO }),
) =>
  new ContextCompactionService(promptBuilder, summaryUseCase, logger)

describe("ContextCompactionService", () => {
  it("does not compact without a context window", async () => {
    const service = buildService()
    const input = {
      conversation: conversation({ contextWindow: null }),
      characterVersion: version,
      messages: messages(10),
      memories: [],
      latestSummary: null,
    }

    expect(await service.needsCompaction(input)).toBe(false)
    const result = await service.compact(input)
    expect(result.ok && result.compacted).toBe(false)
  })

  it("does not compact when the context is below the threshold", async () => {
    const service = buildService()
    const input = {
      conversation: conversation(),
      characterVersion: version,
      messages: messages(2, 20),
      memories: [],
      latestSummary: null,
    }

    expect(await service.needsCompaction(input)).toBe(false)
  })

  it("summarizes the oldest messages and keeps the newest that fit", async () => {
    const summaryUseCase = buildSummaryUseCase({ summary: summaryDTO })
    const service = buildService(builder(), summaryUseCase)
    const input = {
      conversation: conversation(),
      characterVersion: version,
      messages: messages(10),
      memories: [],
      latestSummary: null,
      locale: "en" as const,
    }

    expect(await service.needsCompaction(input)).toBe(true)
    const result = await service.compact(input)

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.compacted).toBe(true)
    expect(result.messages.map((message) => message.id)).toEqual([
      "msg-8",
      "msg-9",
    ])
    expect(result.summaryGenerated).toEqual(summaryDTO)
    expect(result.warning).toBeNull()
    expect(summaryUseCase.execute).toHaveBeenCalledWith("conv-1", {
      locale: "en",
      upToMessageId: "msg-7",
      maxTokens: 256,
    })
  })

  it("shrinks the summary and the output reserve instead of failing", async () => {
    const execute = vi.fn(async () => ({
      summary: { ...summaryDTO, content: "short" },
    }))
    const summaryUseCase = { execute } as unknown as GenerateSummaryUseCase
    const service = new ContextCompactionService(
      builder(500),
      summaryUseCase,
      logger,
    )

    const result = await service.compact({
      conversation: conversation({ contextWindow: 2_000, maxTokens: 1_200 }),
      characterVersion: version,
      messages: messages(3),
      memories: [],
      latestSummary: null,
      locale: "en",
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.outputTokens).toBe(1_173)
    expect(result.warning?.code).toBe("OUTPUT_REDUCED")
    expect(execute).toHaveBeenCalledWith("conv-1", {
      locale: "en",
      upToMessageId: "msg-1",
      maxTokens: 128,
    })
  })

  it("reduces the output reserve instead of failing when there is no prefix", async () => {
    const latestSummary = Summary.reconstruct({
      ...summaryDTO,
      content: "previous",
      lastMessageId: "msg-0",
      createdAt: now,
      editedAt: null,
    })
    const service = buildService()

    const result = await service.compact({
      conversation: conversation({ maxTokens: 900 }),
      characterVersion: version,
      messages: messages(2),
      memories: [],
      latestSummary,
      locale: "en",
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.summaryGenerated).toBeNull()
    expect(result.outputTokens).toBe(332)
    expect(result.warning?.code).toBe("OUTPUT_REDUCED")
    expect(result.messages).toHaveLength(2)
  })

  it("forces a manual compaction and keeps only the newest messages", async () => {
    const execute = vi.fn(async () => ({ summary: summaryDTO }))
    const summaryUseCase = { execute } as unknown as GenerateSummaryUseCase
    const service = new ContextCompactionService(
      builder(),
      summaryUseCase,
      logger,
    )

    const result = await service.compact(
      {
        conversation: conversation(),
        characterVersion: version,
        messages: messages(10),
        memories: [],
        latestSummary: null,
        locale: "en",
      },
      { force: true, keepRecentMessages: 2 },
    )

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.messages.map((message) => message.id)).toEqual([
      "msg-8",
      "msg-9",
    ])
    expect(execute).toHaveBeenCalledWith("conv-1", {
      locale: "en",
      upToMessageId: "msg-7",
      maxTokens: 256,
    })
  })

  it("drops a summary that does not fit instead of failing", async () => {
    const longSummary = {
      ...summaryDTO,
      content: "s".repeat(5_000),
    }
    const summaryUseCase = buildSummaryUseCase({ summary: longSummary })
    const service = buildService(builder(), summaryUseCase)

    const result = await service.compact({
      conversation: conversation(),
      characterVersion: version,
      messages: messages(10),
      memories: [],
      latestSummary: null,
      locale: "en",
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.summary).toBeNull()
    expect(result.summaryGenerated).toEqual(longSummary)
    expect(result.warning?.code).toBe("SUMMARY_DROPPED")
  })

  it("trims and warns when the summary fails", async () => {
    const summaryUseCase = buildSummaryUseCase({
      error: { code: "STREAMING_FAILED", message: "provider down" },
    })
    const service = buildService(builder(), summaryUseCase)
    const result = await service.compact({
      conversation: conversation(),
      characterVersion: version,
      messages: messages(10),
      memories: [],
      latestSummary: null,
      locale: "en",
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.summaryGenerated).toBeNull()
    expect(result.warning?.code).toBe("SUMMARY_FAILED_TRIMMED")
    expect(result.summary).toBeNull()
    expect(result.messages.length).toBeLessThan(10)
  })

  it("fails when the system prompt alone does not fit", async () => {
    const service = buildService(builder(4_000))
    const result = await service.compact({
      conversation: conversation(),
      characterVersion: version,
      messages: messages(10),
      memories: [],
      latestSummary: null,
      locale: "en",
    })

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.code).toBe("CONTEXT_TOO_LARGE")
  })
})
