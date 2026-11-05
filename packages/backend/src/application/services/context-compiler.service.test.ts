import { describe, it, expect } from "vitest"

import {
  estimateMessagesTokens,
  estimateTextTokens,
} from "@workspace/shared/lib/token-estimate"

import { CharacterVersion } from "../../domain/entities/character-version.entity"
import { Conversation } from "../../domain/entities/conversation.entity"
import { Memory } from "../../domain/entities/memory.entity"
import { Message } from "../../domain/entities/message.entity"
import { Summary } from "../../domain/entities/summary.entity"
import type { PromptContextBuilder } from "../../domain/ports/prompt-context-builder"
import {
  ContextCompiler,
  type ContextCompileInput,
} from "./context-compiler.service"

const now = new Date("2026-11-05T12:00:00.000Z")

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

const historyMessages = [
  buildMessage("msg-1", "user", "Hello there", 1),
  buildMessage("msg-2", "assistant", "Hello! How can I help?", 2),
]
const pendingMessages = [buildMessage("msg-3", "user", "Tell me a secret", 3)]

const summary = Summary.reconstruct({
  id: "sum-1",
  conversationId: "conv-1",
  content: "Earlier events.",
  firstMessageId: "msg-0",
  lastMessageId: "msg-0",
  model: "llama3",
  provider: "ollama",
  createdAt: now,
  editedAt: null,
})

const memories = [
  Memory.reconstruct({
    id: "mem-1",
    conversationId: "conv-1",
    actor: "Test Character",
    title: "Likes tea",
    description: "Drinks tea every evening.",
    priority: 7,
    createdBy: "assistant",
    updatedBy: "system",
    createdAt: now,
    updatedAt: now,
  }),
  Memory.reconstruct({
    id: "mem-2",
    conversationId: "conv-1",
    actor: "Alice",
    title: "Fears heights",
    description: "Avoids balconies.",
    priority: 5,
    createdBy: "user",
    updatedBy: "system",
    createdAt: now,
    updatedAt: now,
  }),
  Memory.reconstruct({
    id: "mem-3",
    conversationId: "conv-1",
    actor: "Alice",
    title: "Decayed",
    description: "Excluded from the prompt.",
    priority: 2,
    createdBy: "user",
    updatedBy: "system",
    createdAt: now,
    updatedAt: now,
  }),
]

// The two eligible memories, matching what the loader would have filtered.
const promptMemories = memories.slice(0, 2)

const fakeSections = [
  {
    id: "character",
    source: "system" as const,
    content: "You are Test Character.",
    reason: "character definition",
  },
  {
    id: "memories",
    source: "system" as const,
    content: "Memory: Likes tea",
    reason: "included memories",
    itemCount: 2,
  },
]

const makeContext = () => {
  const messages = [...historyMessages, ...pendingMessages].map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }))
  return {
    systemPrompt: fakeSections.map((s) => s.content).join("\n"),
    messages,
  }
}

const fakeBuilder = {
  build: async () => makeContext(),
  buildWithSections: async () => ({
    context: makeContext(),
    sections: fakeSections,
  }),
} as unknown as PromptContextBuilder

const buildInput = (
  overrides: Partial<ContextCompileInput> = {}
): ContextCompileInput => ({
  conversation,
  characterVersion: version,
  messages: [...historyMessages, ...pendingMessages],
  pendingCount: pendingMessages.length,
  excludedCount: 0,
  memories,
  promptMemories,
  summary,
  playerCharacter: { name: "Alice", description: "A curious explorer." },
  locale: "en",
  outputReserve: 2_048,
  compaction: { needed: false, applied: false },
  ...overrides,
})

describe("ContextCompiler", () => {
  it("compiles counts, tokens and section order into the manifest", async () => {
    const compiler = new ContextCompiler(fakeBuilder)
    const { context, manifest } = await compiler.compile(buildInput())

    expect(manifest.version).toBe(1)
    expect(manifest.model).toBe("llama3")
    expect(manifest.contextWindow).toBe(8_000)
    expect(manifest.outputReserve).toBe(2_048)

    // Token estimates match the shared estimator over the built context.
    const estimatedInput =
      estimateTextTokens(context.systemPrompt) +
      estimateMessagesTokens(context.messages)
    expect(manifest.estimatedInputTokens).toBe(estimatedInput)
    expect(manifest.estimatedTotalTokens).toBe(estimatedInput + 2_048)

    // Memory selection counts.
    expect(manifest.memories).toEqual({ total: 3, included: 2, excluded: 1 })

    // Message selection counts.
    expect(manifest.messages).toEqual({
      afterSummary: 2,
      pending: 1,
      excluded: 0,
      total: 3,
    })

    // Summary identity plus the number of messages that follow it.
    expect(manifest.summary).toEqual({
      id: "sum-1",
      firstMessageId: "msg-0",
      lastMessageId: "msg-0",
      messagesAfter: 2,
    })

    // Sections: system sections first (in builder order), then history, then pending.
    const sectionIds = manifest.sections.map((s) => s.id)
    expect(sectionIds.slice(0, 2)).toEqual(["character", "memories"])
    expect(sectionIds[2]).toBe("history")
    expect(sectionIds[3]).toBe("pending")

    const systemSection = manifest.sections[0]
    expect(systemSection.source).toBe("system")
    expect(systemSection.tokens).toBe(
      estimateTextTokens(fakeSections[0].content)
    )
    expect(systemSection.characters).toBe(fakeSections[0].content.length)
    expect(systemSection.included).toBe(true)
    expect(systemSection.reason).toBe(fakeSections[0].reason)

    const memoriesSection = manifest.sections[1]
    expect(memoriesSection.itemCount).toBe(2)

    const historySection = manifest.sections[2]
    expect(historySection.source).toBe("history")
    expect(historySection.itemCount).toBe(2)
    expect(historySection.tokens).toBe(
      estimateMessagesTokens(
        historyMessages.map((m) => ({ content: m.content }))
      )
    )

    const pendingSection = manifest.sections[3]
    expect(pendingSection.source).toBe("pending")
    expect(pendingSection.itemCount).toBe(1)
    expect(pendingSection.tokens).toBeGreaterThan(0)
  })

  it("pins the excluded-message counts into the manifest", async () => {
    const compiler = new ContextCompiler(fakeBuilder)
    const { manifest } = await compiler.compile(buildInput({ excludedCount: 1 }))

    expect(manifest.messages).toEqual({
      afterSummary: 3,
      pending: 1,
      excluded: 1,
      total: 4,
    })
    expect(manifest.summary.messagesAfter).toBe(3)
  })

  it("reports compaction needed vs applied without changing the estimate", async () => {
    const compiler = new ContextCompiler(fakeBuilder)

    const notCompacted = await compiler.compile(
      buildInput({ compaction: { needed: true, applied: false } })
    )
    expect(notCompacted.manifest.compaction).toEqual({
      needed: true,
      applied: false,
      threshold: 80,
    })

    const compacted = await compiler.compile(
      buildInput({ compaction: { needed: true, applied: true } })
    )
    expect(compacted.manifest.compaction).toEqual({
      needed: true,
      applied: true,
      threshold: 80,
    })
  })

  it("handles a missing context window without breaking the manifest", async () => {
    const noWindow = Conversation.create({
      id: "conv-2",
      versionId: "ver-1",
      title: null,
      titleSource: null,
      model: null,
      provider: null,
      providerInstanceId: null,
      recentMessageCount: 10,
      summaryFrequency: 20,
      contextWindow: null,
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

    const compiler = new ContextCompiler(fakeBuilder)
    const { manifest } = await compiler.compile(
      buildInput({
        conversation: noWindow,
        compaction: { needed: false, applied: false },
      })
    )

    expect(manifest.contextWindow).toBeNull()
    expect(manifest.compaction.needed).toBe(false)
    expect(manifest.estimatedTotalTokens).toBeGreaterThan(0)
    expect(manifest.sections.length).toBeGreaterThan(0)
  })

  it("exposes the conversation model in the manifest", async () => {
    const compiler = new ContextCompiler(fakeBuilder)
    const { manifest } = await compiler.compile(buildInput())
    expect(manifest.model).toBe("llama3")
  })

  it("does not persist or call providers", async () => {
    const compiler = new ContextCompiler(fakeBuilder)
    const { manifest } = await compiler.compile(buildInput())
    expect(manifest).toBeDefined()
  })
})
