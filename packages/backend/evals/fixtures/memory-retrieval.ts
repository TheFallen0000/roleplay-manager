import type { MemoryType } from "@workspace/shared/types/memory"

import { Character } from "../../src/domain/entities/character.entity"
import { CharacterVersion } from "../../src/domain/entities/character-version.entity"
import { Conversation } from "../../src/domain/entities/conversation.entity"
import { Memory } from "../../src/domain/entities/memory.entity"
import { Message } from "../../src/domain/entities/message.entity"
import { PlayerCharacter } from "../../src/domain/entities/player-character.entity"

const now = new Date("2026-11-20T12:00:00.000Z")

export interface MemoryRetrievalEvalFixture {
  name: string
  conversation: Conversation
  character: Character
  characterVersion: CharacterVersion
  playerCharacter: PlayerCharacter
  messages: Message[]
  pendingMessage: Message
  memories: Memory[]
  /** Labels hand-written from the scenario, never from the selector output. */
  relevantIds: string[]
  irrelevantIds: string[]
  /** True when the fixture expects the token budget to drop memories. */
  expectsBudgetCut?: boolean
  /** True when the fixture expects decayed memories to be dropped. */
  expectsDecay?: boolean
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
  overrides: {
    contextWindow?: number | null
    memoryDecayThreshold?: number
    memoryDecaySpeed?: number
  } = {},
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
    contextWindow:
      "contextWindow" in overrides ? overrides.contextWindow : 8_000,
    compactionThreshold: 80,
    temperature: 0.7,
    maxTokens: 2_048,
    topP: 0.9,
    frequencyPenalty: 0,
    presencePenalty: 0,
    stopSequences: [],
    memoryProposalMode: "auto",
    memoryDecayThreshold: overrides.memoryDecayThreshold,
    memoryDecaySpeed: overrides.memoryDecaySpeed,
    playerCharacterId: "pc-1",
    createdAt: now,
    updatedAt: now,
  })

const mkMemory = (
  conversationId: string,
  id: string,
  overrides: {
    actor: string
    title: string
    description: string
    priority?: number
    type?: MemoryType
    updatedAt?: Date
  },
): Memory =>
  Memory.reconstruct({
    id,
    conversationId,
    actor: overrides.actor,
    title: overrides.title,
    description: overrides.description,
    priority: overrides.priority ?? 5,
    type: overrides.type,
    createdBy: "assistant",
    updatedBy: "system",
    createdAt: overrides.updatedAt ?? now,
    updatedAt: overrides.updatedAt ?? now,
  })

const mkMessage = (
  conversationId: string,
  id: string,
  role: "user" | "assistant",
  content: string,
  position: number,
  createdAt: Date = now,
): Message =>
  Message.create({
    id,
    conversationId,
    role,
    content,
    position,
    alternatives: [],
    alternativesCursor: 0,
    createdAt,
    editedAt: null,
  })

const noiseMemories = (
  conversationId: string,
  prefix: string,
  count: number,
  overrides: { updatedAt?: Date; priority?: number; type?: MemoryType } = {},
): Memory[] =>
  Array.from({ length: count }, (_, index) =>
    mkMemory(conversationId, `${prefix}-${String(index).padStart(2, "0")}`, {
      actor: index % 2 === 0 ? "Marcus" : "Selene",
      title: `Ruido ${prefix} ${index}`,
      description: "Un recuerdo secundario sin relación con la escena.",
      priority: overrides.priority ?? 4 + (index % 4),
      type:
        overrides.type ??
        (index % 3 === 0 ? "episode" : "fact"),
      updatedAt: overrides.updatedAt,
    }),
  )

const baseMessages = (conversationId: string): Message[] => [
  mkMessage(conversationId, "msg-1", "user", "Buenos días.", 1),
  mkMessage(conversationId, "msg-2", "assistant", "Buenos días.", 2),
]

const buildActorScenario = (): MemoryRetrievalEvalFixture => {
  const conversation = mkConversation("conv-1")
  const pendingMessage = mkMessage(
    "conv-1",
    "msg-3",
    "user",
    "Lyra mira el amanecer y pregunta por Kael.",
    3,
  )
  const relevant: Memory[] = [
    mkMemory("conv-1", "m1-a", {
      actor: "Lyra",
      title: "Misión",
      description: "Protege el bosque.",
      priority: 6,
    }),
    mkMemory("conv-1", "m1-b", {
      actor: "Lyra",
      title: "Herida",
      description: "Cicatriz en el brazo.",
      priority: 5,
    }),
    mkMemory("conv-1", "m1-c", {
      actor: "Lyra",
      title: "Promesa",
      description: "Volverá antes del invierno.",
      priority: 5,
      type: "thread",
    }),
    mkMemory("conv-1", "m1-d", {
      actor: "Alice",
      title: "Mapa",
      description: "Dibuja el norte.",
      priority: 5,
    }),
    mkMemory("conv-1", "m1-e", {
      actor: "Alice",
      title: "Diario",
      description: "Escribe cada noche.",
      priority: 4,
    }),
    mkMemory("conv-1", "m1-f", {
      actor: "Kael",
      title: "Juramento",
      description: "Sirve a la corona.",
      priority: 6,
    }),
    mkMemory("conv-1", "m1-g", {
      actor: "Selene",
      title: "Ritual del amanecer",
      description: "Lo celebra en invierno.",
      priority: 5,
    }),
    mkMemory("conv-1", "m1-h", {
      actor: "Marcus",
      title: "Amanecer en el muelle",
      description: "Observa las barcas.",
      priority: 4,
    }),
  ]
  const memories = [
    ...relevant,
    ...noiseMemories("conv-1", "m1-n", 36),
  ]

  return {
    name: "actor relevance with noise from other actors",
    conversation,
    character: mkCharacter(),
    characterVersion: mkVersion(),
    playerCharacter: mkPlayerCharacter(),
    messages: baseMessages("conv-1"),
    pendingMessage,
    memories,
    relevantIds: relevant.map((memory) => memory.id),
    irrelevantIds: memories
      .filter((memory) => !relevant.some((item) => item.id === memory.id))
      .map((memory) => memory.id),
  }
}

const buildKeywordScenario = (): MemoryRetrievalEvalFixture => {
  const conversation = mkConversation("conv-2")
  const pendingMessage = mkMessage(
    "conv-2",
    "msg-3",
    "user",
    "Han llegado al Observatorio de Cristal.",
    3,
  )
  const relevant: Memory[] = [
    mkMemory("conv-2", "m2-a", {
      actor: "Selene",
      title: "Observatorio de Cristal",
      description: "Un lugar antiguo en la montaña.",
      priority: 4,
    }),
  ]
  const memories = [
    ...relevant,
    ...noiseMemories("conv-2", "m2-n", 41),
  ]

  return {
    name: "keyword-only place mention",
    conversation,
    character: mkCharacter(),
    characterVersion: mkVersion(),
    playerCharacter: mkPlayerCharacter(),
    messages: baseMessages("conv-2"),
    pendingMessage,
    memories,
    relevantIds: relevant.map((memory) => memory.id),
    irrelevantIds: memories
      .filter((memory) => !relevant.some((item) => item.id === memory.id))
      .map((memory) => memory.id),
  }
}

const buildBudgetScenario = (): MemoryRetrievalEvalFixture => {
  // 1000 * 0.12 = 120, clamped to the 256 token floor.
  const conversation = mkConversation("conv-3", { contextWindow: 1_000 })
  const pendingMessage = mkMessage(
    "conv-3",
    "msg-3",
    "user",
    "Lyra revisa el bosque.",
    3,
  )
  const shortRelevant: Memory[] = Array.from({ length: 5 }, (_, index) =>
    mkMemory("conv-3", `m3-short-${index}`, {
      actor: "Lyra",
      title: `Plan ${index}`,
      description: "Corto.",
      priority: 9,
    }),
  )
  // One long relevant memory that cannot fit once the five short ones are in.
  const longRelevant = mkMemory("conv-3", "m3-long", {
    actor: "Lyra",
    title: "Crónica",
    description: "Una crónica larga. ".repeat(45),
    priority: 5,
  })
  const relevant = [...shortRelevant, longRelevant]
  const memories = [
    ...relevant,
    ...noiseMemories("conv-3", "m3-n", 37),
  ]

  return {
    name: "more relevant memories than budget",
    conversation,
    character: mkCharacter(),
    characterVersion: mkVersion(),
    playerCharacter: mkPlayerCharacter(),
    messages: baseMessages("conv-3"),
    pendingMessage,
    memories,
    relevantIds: relevant.map((memory) => memory.id),
    irrelevantIds: memories
      .filter((memory) => !relevant.some((item) => item.id === memory.id))
      .map((memory) => memory.id),
    expectsBudgetCut: true,
  }
}

const buildDecayedScenario = (): MemoryRetrievalEvalFixture => {
  const conversation = mkConversation("conv-4", {
    memoryDecayThreshold: 5,
    memoryDecaySpeed: 2,
  })
  const oldDate = new Date("2025-12-01T00:00:00.000Z")
  const messages = Array.from({ length: 10 }, (_, index) =>
    mkMessage(
      "conv-4",
      `msg-${index + 1}`,
      index % 2 === 0 ? "user" : "assistant",
      `Turno ${index + 1}.`,
      index + 1,
      new Date(`2026-01-${String(index + 1).padStart(2, "0")}T00:00:00.000Z`),
    ),
  )
  const pendingMessage = mkMessage(
    "conv-4",
    "msg-pending",
    "user",
    "Lyra sigue aquí.",
    20,
    new Date("2026-11-20T12:00:00.000Z"),
  )
  const freshDate = new Date("2026-11-01T00:00:00.000Z")
  const relevant: Memory[] = [
    mkMemory("conv-4", "m4-a", {
      actor: "Lyra",
      title: "Presencia",
      description: "Sigue en el bosque.",
      priority: 6,
      updatedAt: freshDate,
    }),
    mkMemory("conv-4", "m4-b", {
      actor: "Lyra",
      title: "Objetivo",
      description: "Encontrar la torre.",
      priority: 6,
      updatedAt: freshDate,
    }),
  ]
  const decayed = noiseMemories("conv-4", "m4-old", 40, {
    updatedAt: oldDate,
    priority: 6,
    type: "fact",
  })
  const memories = [...relevant, ...decayed]

  return {
    name: "decayed memories stay out",
    conversation,
    character: mkCharacter(),
    characterVersion: mkVersion(),
    playerCharacter: mkPlayerCharacter(),
    messages,
    pendingMessage,
    memories,
    relevantIds: relevant.map((memory) => memory.id),
    irrelevantIds: decayed.map((memory) => memory.id),
    expectsDecay: true,
  }
}

const buildTieScenario = (): MemoryRetrievalEvalFixture => {
  const conversation = mkConversation("conv-5")
  const pendingMessage = mkMessage(
    "conv-5",
    "msg-3",
    "user",
    "El bosque guarda un secreto.",
    3,
  )
  const tieIds = ["m5-f", "m5-e", "m5-d", "m5-c", "m5-b", "m5-a"]
  const relevant: Memory[] = tieIds.map((id, index) =>
    mkMemory("conv-5", id, {
      actor: "Nadie",
      title: `Bosque ${["uno", "dos", "tres", "cuatro", "cinco", "seis"][index]}`,
      description: "Nada más.",
      priority: 5,
    }),
  )
  const memories = [
    ...relevant,
    ...noiseMemories("conv-5", "m5-n", 38),
  ]

  return {
    name: "score tie keeps a stable order",
    conversation,
    character: mkCharacter(),
    characterVersion: mkVersion(),
    playerCharacter: mkPlayerCharacter(),
    // No history means no decayed turns: every tied memory stays eligible, so
    // the scenario measures score tie-breaks instead of keyword revival.
    messages: [],
    pendingMessage,
    memories,
    relevantIds: relevant.map((memory) => memory.id),
    irrelevantIds: memories
      .filter((memory) => !relevant.some((item) => item.id === memory.id))
      .map((memory) => memory.id),
  }
}

export const memoryRetrievalFixtures: MemoryRetrievalEvalFixture[] = [
  buildActorScenario(),
  buildKeywordScenario(),
  buildBudgetScenario(),
  buildDecayedScenario(),
  buildTieScenario(),
]
