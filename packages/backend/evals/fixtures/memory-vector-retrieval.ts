import type { MemoryType } from "@workspace/shared/types/memory"

import { Character } from "../../src/domain/entities/character.entity"
import { CharacterVersion } from "../../src/domain/entities/character-version.entity"
import { Conversation } from "../../src/domain/entities/conversation.entity"
import { Memory } from "../../src/domain/entities/memory.entity"
import { Message } from "../../src/domain/entities/message.entity"
import { PlayerCharacter } from "../../src/domain/entities/player-character.entity"
import {
  DETERMINISTIC_EMBEDDING_DIMENSION,
  DETERMINISTIC_EMBEDDING_MODEL,
} from "../../src/test-utils/deterministic-embedding"
import {
  memoryRetrievalFixtures,
  type MemoryRetrievalEvalFixture,
} from "./memory-retrieval"

const now = new Date("2026-11-20T12:00:00.000Z")

export interface MemoryVectorRetrievalEvalFixture
  extends MemoryRetrievalEvalFixture {
  embedding: {
    provider: "ollama"
    providerInstanceId: string | null
    model: string
    dimension: number
  } | null
  /** Simulate a provider that raises on every embed call. */
  embeddingFailure?: boolean
  /** Memories that must never get a `semantic`/`hybrid` reason. */
  nonSemanticIds?: string[]
  /** Memories that must enter with the new semantic reason. */
  semanticIds?: string[]
  /** Memories that must enter with the new hybrid reason. */
  hybridIds?: string[]
  /** Paraphrase scenarios where the lexical baseline should fail by design. */
  expectParaphraseRecovery?: boolean
  /** Budget scenarios measure the cut, not the recall. */
  skipRecall?: boolean
}

const embeddingConfig = {
  provider: "ollama" as const,
  providerInstanceId: null,
  model: DETERMINISTIC_EMBEDDING_MODEL,
  dimension: DETERMINISTIC_EMBEDDING_DIMENSION,
}

const mkCharacter = (): Character =>
  Character.create({
    id: "char-1",
    name: "Lyra",
    createdAt: now,
    updatedAt: now,
  })

const mkVersion = (): CharacterVersion =>
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

const mkPlayerCharacter = (): PlayerCharacter =>
  PlayerCharacter.create({
    id: "pc-1",
    name: "Alice",
    description: "Una exploradora curiosa.",
    createdAt: now,
    updatedAt: now,
  })

const mkConversation = (
  id: string,
  contextWindow: number | null = 8_000,
): Conversation =>
  Conversation.create({
    id,
    versionId: "ver-1",
    title: null,
    titleSource: null,
    model: "llama3",
    provider: "ollama",
    providerInstanceId: null,
    recentMessageCount: 20,
    summaryFrequency: 20,
    contextWindow,
    compactionThreshold: 80,
    temperature: 0.7,
    maxTokens: 2_048,
    topP: 0.9,
    frequencyPenalty: 0,
    presencePenalty: 0,
    stopSequences: [],
    memoryProposalMode: "auto",
    playerCharacterId: "pc-1",
    createdAt: now,
    updatedAt: now,
  })

const mkMemory = (
  conversationId: string,
  id: string,
  overrides: {
    actor?: string
    title: string
    description?: string
    priority?: number
    type?: MemoryType
  },
): Memory =>
  Memory.reconstruct({
    id,
    conversationId,
    actor: overrides.actor ?? "Nadie",
    title: overrides.title,
    description: overrides.description ?? ".",
    priority: overrides.priority ?? 5,
    type: overrides.type,
    createdBy: "assistant",
    updatedBy: "system",
    createdAt: now,
    updatedAt: now,
  })

const mkMessage = (
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

const baseMessages = (conversationId: string): Message[] => [
  mkMessage(conversationId, "msg-1", "user", "Buenos días.", 1),
  mkMessage(conversationId, "msg-2", "assistant", "Buenos días.", 2),
]

const noiseMemories = (
  conversationId: string,
  prefix: string,
  count: number,
): Memory[] =>
  Array.from({ length: count }, (_, index) =>
    mkMemory(conversationId, `${prefix}-${String(index).padStart(2, "0")}`, {
      actor: index % 2 === 0 ? "Marcus" : "Selene",
      title: `Ruido secundario ${index}`,
      description: "Un recuerdo sin relación con la escena.",
      priority: 4 + (index % 3),
    }),
  )

const buildFixture = (params: {
  name: string
  conversation: Conversation
  pendingMessage: Message
  memories: Memory[]
  relevantIds: string[]
  irrelevantIds: string[]
  embedding: MemoryVectorRetrievalEvalFixture["embedding"]
  embeddingFailure?: boolean
  nonSemanticIds?: string[]
  semanticIds?: string[]
  hybridIds?: string[]
  expectParaphraseRecovery?: boolean
  skipRecall?: boolean
}): MemoryVectorRetrievalEvalFixture => ({
  name: params.name,
  conversation: params.conversation,
  character: mkCharacter(),
  characterVersion: mkVersion(),
  playerCharacter: mkPlayerCharacter(),
  messages: baseMessages(params.conversation.id),
  pendingMessage: params.pendingMessage,
  memories: params.memories,
  relevantIds: params.relevantIds,
  irrelevantIds: params.irrelevantIds,
  embedding: params.embedding,
  embeddingFailure: params.embeddingFailure,
  nonSemanticIds: params.nonSemanticIds,
  semanticIds: params.semanticIds,
  hybridIds: params.hybridIds,
  expectParaphraseRecovery: params.expectParaphraseRecovery,
  skipRecall: params.skipRecall,
})

const buildParaphraseScenario = (): MemoryVectorRetrievalEvalFixture => {
  const conversation = mkConversation("conv-v1")
  const pendingMessage = mkMessage(
    "conv-v1",
    "msg-3",
    "user",
    "El wyrm exhala llamas sobre la arboleda.",
    3,
  )
  const relevant = mkMemory("conv-v1", "mv1-a", {
    title: "El dragón escupe fuego",
    description: "En el bosque.",
  })
  const noise = noiseMemories("conv-v1", "mv1-n", 44)
  const memories = [relevant, ...noise]

  return buildFixture({
    name: "pure paraphrase: the lexical scorer misses, the vector recovers",
    conversation,
    pendingMessage,
    memories,
    relevantIds: [relevant.id],
    irrelevantIds: noise.map((memory) => memory.id),
    embedding: embeddingConfig,
    semanticIds: [relevant.id],
    expectParaphraseRecovery: true,
  })
}

const buildHybridScenario = (): MemoryVectorRetrievalEvalFixture => {
  const conversation = mkConversation("conv-v2")
  const pendingMessage = mkMessage(
    "conv-v2",
    "msg-3",
    "user",
    "La arboleda y el bosque guardan un secreto.",
    3,
  )
  const relevant = mkMemory("conv-v2", "mv2-a", {
    title: "El bosque",
    description: ".",
  })
  const noise = noiseMemories("conv-v2", "mv2-n", 42)
  const memories = [relevant, ...noise]

  return buildFixture({
    name: "partial synonymy: a shared keyword plus a close meaning",
    conversation,
    pendingMessage,
    memories,
    relevantIds: [relevant.id],
    irrelevantIds: noise.map((memory) => memory.id),
    embedding: embeddingConfig,
    hybridIds: [relevant.id],
  })
}

const buildFalseProximityScenario = (): MemoryVectorRetrievalEvalFixture => {
  const conversation = mkConversation("conv-v3")
  const pendingMessage = mkMessage(
    "conv-v3",
    "msg-3",
    "user",
    "El fuego artificial ilumina la ciudad.",
    3,
  )
  const suspicious = mkMemory("conv-v3", "mv3-a", {
    title: "El fuego consume el bosque",
  })
  const noise = noiseMemories("conv-v3", "mv3-n", 42)
  const memories = [suspicious, ...noise]

  return buildFixture({
    name: "false proximity: a superficial token does not become semantic",
    conversation,
    pendingMessage,
    memories,
    relevantIds: [],
    irrelevantIds: noise.map((memory) => memory.id),
    nonSemanticIds: [suspicious.id],
    embedding: embeddingConfig,
  })
}

const buildFailureScenario = (): MemoryVectorRetrievalEvalFixture => {
  const conversation = mkConversation("conv-v4")
  const pendingMessage = mkMessage(
    "conv-v4",
    "msg-3",
    "user",
    "El wyrm exhala llamas.",
    3,
  )
  const paraphrase = mkMemory("conv-v4", "mv4-a", {
    title: "El dragón escupe fuego",
  })
  const noise = noiseMemories("conv-v4", "mv4-n", 42)
  const memories = [paraphrase, ...noise]

  return buildFixture({
    name: "provider failure: the hybrid falls back to S136",
    conversation,
    pendingMessage,
    memories,
    relevantIds: [],
    irrelevantIds: memories.map((memory) => memory.id),
    embedding: embeddingConfig,
    embeddingFailure: true,
  })
}

const buildBudgetScenario = (): MemoryVectorRetrievalEvalFixture => {
  const conversation = mkConversation("conv-v5", 1_000)
  const pendingMessage = mkMessage(
    "conv-v5",
    "msg-3",
    "user",
    "El wyrm exhala llamas.",
    3,
  )
  const relevant = Array.from({ length: 20 }, (_, index) =>
    mkMemory("conv-v5", `mv5-a-${String(index).padStart(2, "0")}`, {
      title: "El dragón escupe fuego",
      description: "Una llamarada larga que ocupa tokens en el prompt.",
    }),
  )
  const noise = noiseMemories("conv-v5", "mv5-n", 30)
  const memories = [...relevant, ...noise]

  return buildFixture({
    name: "budget with semantic signals: cuts without breaking the order",
    conversation,
    pendingMessage,
    memories,
    relevantIds: relevant.map((memory) => memory.id),
    irrelevantIds: noise.map((memory) => memory.id),
    embedding: embeddingConfig,
    skipRecall: true,
  })
}

/**
 * The five S136 fixtures run first as regression with embeddings disabled, then
 * the semantic scenarios run against the deterministic fake.
 */
export const memoryVectorRetrievalFixtures: MemoryVectorRetrievalEvalFixture[] = [
  ...memoryRetrievalFixtures.map((fixture) => ({
    ...fixture,
    embedding: null,
  })),
  buildParaphraseScenario(),
  buildHybridScenario(),
  buildFalseProximityScenario(),
  buildFailureScenario(),
  buildBudgetScenario(),
]

/** Fixtures where the lexical S136 baseline is expected to miss the relevant memory. */
export const paraphraseVectorFixtures =
  memoryVectorRetrievalFixtures.filter(
    (fixture) => fixture.expectParaphraseRecovery,
  )
