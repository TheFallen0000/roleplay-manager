import type { ContextPolicyId } from "@workspace/shared/lib/context-policy"
import type { MemoryType } from "@workspace/shared/types/memory"

import { Character } from "../../src/domain/entities/character.entity"
import { CharacterVersion } from "../../src/domain/entities/character-version.entity"
import { Conversation } from "../../src/domain/entities/conversation.entity"
import { Memory } from "../../src/domain/entities/memory.entity"
import { Message } from "../../src/domain/entities/message.entity"
import { PlayerCharacter } from "../../src/domain/entities/player-character.entity"
import { Summary } from "../../src/domain/entities/summary.entity"
import type { PromptContextLorebook } from "../../src/domain/ports/prompt-context-builder"

const now = new Date("2026-11-28T12:00:00.000Z")

export interface ContextPolicyEvalFixture {
  name: string
  policy: ContextPolicyId
  conversation: Conversation
  character: Character
  characterVersion: CharacterVersion
  playerCharacter: PlayerCharacter
  messages: Message[]
  pendingMessage: Message
  memories: Memory[]
  summary: Summary | null
  lorebook?: PromptContextLorebook
  relevantIds: string[]
  irrelevantIds: string[]
  /** The policy budget is expected to drop eligible memories. */
  expectsBudgetCut: boolean
}

export const makeCharacter = (): Character =>
  Character.create({
    id: "char-1",
    name: "Lyra",
    createdAt: now,
    updatedAt: now,
  })

export const makeCharacterVersion = (): CharacterVersion =>
  CharacterVersion.create({
    id: "ver-1",
    characterId: "char-1",
    name: "Lyra",
    subtitle: null,
    profileImageAssetId: null,
    description: "Guardián del bosque.",
    instructions: null,
    greeting: "Hola.",
    versionNumber: 1,
    createdAt: now,
    cards: [],
  })

export const makePlayerCharacter = (): PlayerCharacter =>
  PlayerCharacter.create({
    id: "pc-1",
    name: "Alice",
    description: "Una exploradora curiosa.",
    createdAt: now,
    updatedAt: now,
  })

export const makePolicyConversation = (params: {
  id: string
  policy: ContextPolicyId
  contextWindow: number | null
  maxTokens?: number
  workingWindow?: number | null
}): Conversation =>
  Conversation.create({
    id: params.id,
    versionId: "ver-1",
    title: null,
    titleSource: null,
    model: "llama3",
    provider: "ollama",
    providerInstanceId: null,
    recentMessageCount: 20,
    summaryFrequency: 20,
    contextWindow: params.contextWindow,
    workingWindow: params.workingWindow ?? null,
    maxTokens: params.maxTokens ?? 2_048,
    contextPolicy: params.policy,
    temperature: 0.7,
    topP: 0.9,
    frequencyPenalty: 0,
    presencePenalty: 0,
    stopSequences: [],
    memoryProposalMode: "auto",
    playerCharacterId: "pc-1",
    createdAt: now,
    updatedAt: now,
  })

export const makeMessage = (
  conversationId: string,
  id: string,
  role: "user" | "assistant",
  content: string,
  position: number,
): Message =>
  Message.create({
    id,
    conversationId,
    role,
    content,
    position,
    alternatives: [],
    alternativesCursor: 0,
    createdAt: now,
    editedAt: null,
  })

export const makeMemories = (
  conversationId: string,
  count: number,
  options: { priority?: number; type?: MemoryType; prefix?: string } = {},
): Memory[] =>
  Array.from({ length: count }, (_, index) => {
    const id = `${options.prefix ?? "mem"}-${String(index).padStart(2, "0")}`
    return Memory.reconstruct({
      id,
      conversationId,
      actor: "Lyra",
      title: `Recuerdo del bosque ${String(index).padStart(2, "0")}`,
      description:
        "Una descripción deliberadamente larga que ocupa bastantes tokens en la sección de memoria renderizada.",
      priority: options.priority ?? 8,
      type: options.type ?? "fact",
      createdBy: "assistant",
      updatedBy: "system",
      createdAt: now,
      updatedAt: now,
    })
  })

export const makeSummary = (
  conversationId: string,
  lastMessageId: string,
): Summary =>
  Summary.reconstruct({
    id: "sum-1",
    conversationId,
    content:
      "Resumen breve de los primeros turnos: Lyra y Alice entraron en el bosque.",
    firstMessageId: "msg-1",
    lastMessageId,
    model: "llama3",
    provider: "ollama",
    createdAt: now,
    editedAt: null,
  })

const makeLorebook = (): PromptContextLorebook => ({
  before: Array.from({ length: 3 }, (_, index) => ({
    id: `lore-${index}`,
    content:
      "Una entrada de lorebook larga que compite por el presupuesto del prompt y describe el bosque, sus ruinas y sus guardianes.",
  })),
  after: [],
  overBudgetCount: 0,
  versionNumber: 1,
  sourceKey: "a".repeat(64),
})

const baseMessages = (conversationId: string): Message[] => [
  makeMessage(conversationId, "msg-1", "user", "Buenos días, Lyra.", 1),
  makeMessage(conversationId, "msg-2", "assistant", "Buenos días, Alice.", 2),
]

const pending = (conversationId: string): Message =>
  makeMessage(
    conversationId,
    "msg-pending",
    "user",
    "Lyra recuerda el bosque y pregunta por sus ruinas.",
    3,
  )

const buildFixture = (params: {
  name: string
  policy: ContextPolicyId
  contextWindow: number
  memoryCount: number
  withSummary: boolean
  withLorebook?: boolean
  maxTokens?: number
}): ContextPolicyEvalFixture => {
  const id = `conv-${params.name.replace(/[^a-z0-9]+/gi, "-")}`
  const conversation = makePolicyConversation({
    id,
    policy: params.policy,
    contextWindow: params.contextWindow,
    maxTokens: params.maxTokens,
  })
  const messages = baseMessages(id)
  const memories = makeMemories(id, params.memoryCount)
  return {
    name: params.name,
    policy: params.policy,
    conversation,
    character: makeCharacter(),
    characterVersion: makeCharacterVersion(),
    playerCharacter: makePlayerCharacter(),
    messages,
    pendingMessage: pending(id),
    memories,
    summary: params.withSummary ? makeSummary(id, "msg-2") : null,
    ...(params.withLorebook ? { lorebook: makeLorebook() } : {}),
    relevantIds: memories.map((memory) => memory.id),
    irrelevantIds: [],
    expectsBudgetCut: params.memoryCount >= 20,
  }
}

/**
 * Matrix of deterministic scenarios used by the budget eval. The memory
 * selection, the policy plan and the compiler are the real ones; the fixture
 * only composes entities.
 */
export const contextPolicyFixtures: ContextPolicyEvalFixture[] = [
  buildFixture({
    name: "balanced 8k many memories with summary",
    policy: "balanced",
    contextWindow: 8_000,
    memoryCount: 50,
    withSummary: true,
  }),
  buildFixture({
    name: "fast 8k many memories",
    policy: "fast",
    contextWindow: 8_000,
    memoryCount: 50,
    withSummary: false,
  }),
  buildFixture({
    name: "deep 8k many memories",
    policy: "deep",
    contextWindow: 8_000,
    memoryCount: 50,
    withSummary: false,
  }),
  buildFixture({
    name: "balanced 4k many memories with lorebook",
    policy: "balanced",
    contextWindow: 4_000,
    memoryCount: 40,
    withSummary: false,
    withLorebook: true,
  }),
  buildFixture({
    name: "deep 4k many memories with lorebook and summary",
    policy: "deep",
    contextWindow: 4_000,
    memoryCount: 50,
    withSummary: true,
    withLorebook: true,
    maxTokens: 1_024,
  }),
  buildFixture({
    name: "deep 32k many memories",
    policy: "deep",
    contextWindow: 32_000,
    memoryCount: 50,
    withSummary: true,
  }),
  buildFixture({
    name: "fast 8k few memories",
    policy: "fast",
    contextWindow: 8_000,
    memoryCount: 3,
    withSummary: false,
  }),
  buildFixture({
    name: "deep 8k few memories with summary",
    policy: "deep",
    contextWindow: 8_000,
    memoryCount: 3,
    withSummary: true,
  }),
]

export const manyMemoryFixtures = contextPolicyFixtures.filter(
  (fixture) => fixture.expectsBudgetCut,
)
