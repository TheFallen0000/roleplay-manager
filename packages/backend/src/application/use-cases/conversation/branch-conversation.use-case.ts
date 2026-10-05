import { v7 as randomUUIDv7 } from "uuid"

import type { ConversationDetail } from "@workspace/shared/types/conversation"
import type { MessageDTO } from "@workspace/shared/types/message"

import { Conversation } from "../../../domain/entities/conversation.entity"
import { Message } from "../../../domain/entities/message.entity"
import { Memory } from "../../../domain/entities/memory.entity"
import { Summary } from "../../../domain/entities/summary.entity"
import type { ConversationRepository } from "../../../domain/ports/conversation.repository"
import type { MessageRepository } from "../../../domain/ports/message.repository"
import type { MemoryRepository } from "../../../domain/ports/memory.repository"
import type { SummaryRepository } from "../../../domain/ports/summary.repository"
import type { CharacterRepository } from "../../../domain/ports/character.repository"
import type { CharacterAssetRepository } from "../../../domain/ports/character-asset.repository"
import {
  ConversationNotFoundError,
  DomainError,
  MessageNotFoundError,
} from "../../../domain/errors"
import { resolveEffectiveProfileImageAssetId } from "../../../domain/value-objects/effective-profile-image"

export interface BranchConversationInput {
  conversationId: string
  targetMessageId: string
}

export class BranchConversationUseCase {
  constructor(
    private readonly conversationRepository: ConversationRepository,
    private readonly messageRepository: MessageRepository,
    private readonly memoryRepository: MemoryRepository,
    private readonly summaryRepository: SummaryRepository,
    private readonly characterRepository: CharacterRepository,
    private readonly assetRepository: CharacterAssetRepository,
  ) {}

  async execute(input: BranchConversationInput): Promise<ConversationDetail> {
    const origin = await this.conversationRepository.findById(
      input.conversationId,
    )
    if (!origin) {
      throw new ConversationNotFoundError(input.conversationId)
    }

    const messages = await this.messageRepository.findByConversationId(
      input.conversationId,
    )
    const target = messages.find((m) => m.id === input.targetMessageId)
    if (!target) {
      throw new MessageNotFoundError(input.targetMessageId)
    }
    if (target.position === 0) {
      throw new DomainError(
        "CANNOT_BRANCH_FROM_FIRST_MESSAGE",
        "Cannot create a branch from the first message.",
      )
    }

    const branchMessages = messages
      .filter((m) => m.position <= target.position)
      .sort((a, b) => a.position - b.position)

    const now = new Date()
    const conversationId = randomUUIDv7()

    const conversation = Conversation.create({
      id: conversationId,
      versionId: origin.versionId,
      title: null,
      titleSource: null,
      model: origin.model,
      provider: origin.provider,
      providerInstanceId: origin.providerInstanceId,
      recentMessageCount: origin.recentMessageCount,
      summaryFrequency: origin.summaryFrequency,
      temperature: origin.temperature,
      maxTokens: origin.maxTokens,
      topP: origin.topP,
      frequencyPenalty: origin.frequencyPenalty,
      presencePenalty: origin.presencePenalty,
      stopSequences: origin.stopSequences,
      memoryProposalMode: origin.memoryProposalMode,
      customProfileImageAssetId: origin.customProfileImageAssetId,
      playerCharacterId: origin.playerCharacterId,
      memoryDecayMode: origin.memoryDecayMode,
      memoryDecayThreshold: origin.memoryDecayThreshold,
      memoryDecayAgeThreshold: origin.memoryDecayAgeThreshold,
      memoryDecaySpeed: origin.memoryDecaySpeed,
      createdAt: now,
      updatedAt: now,
    })

    const newIdByOldMessageId = new Map<string, string>()
    const copied = branchMessages.map((m) => {
      const newId = randomUUIDv7()
      newIdByOldMessageId.set(m.id, newId)
      return Message.create({
        id: newId,
        conversationId,
        role: m.role,
        content: m.content,
        position: m.position,
        alternatives: [],
        alternativesCursor: 0,
        createdAt: m.createdAt,
        editedAt: m.editedAt,
      })
    })

    await this.conversationRepository.create(conversation)
    for (const message of copied) {
      await this.messageRepository.create(message)
    }

    const originMemories = await this.memoryRepository.findByConversationId(
      input.conversationId,
    )
    for (const memory of originMemories) {
      await this.memoryRepository.create(
        Memory.create({
          id: randomUUIDv7(),
          conversationId,
          actor: memory.actor,
          title: memory.title,
          description: memory.description,
          priority: memory.priority,
          createdBy: memory.createdBy,
          updatedBy: memory.updatedBy,
          createdAt: memory.createdAt,
          updatedAt: memory.updatedAt,
        }),
      )
    }

    const originSummaries = await this.summaryRepository.findByConversationId(
      input.conversationId,
    )
    for (const summary of originSummaries) {
      const firstMessageId = newIdByOldMessageId.get(summary.firstMessageId)
      const lastMessageId = newIdByOldMessageId.get(summary.lastMessageId)
      if (!firstMessageId || !lastMessageId) continue
      await this.summaryRepository.create(
        Summary.create({
          id: randomUUIDv7(),
          conversationId,
          content: summary.content,
          firstMessageId,
          lastMessageId,
          model: summary.model,
          provider: summary.provider,
          createdAt: summary.createdAt,
          editedAt: summary.editedAt,
        }),
      )
    }

    const version = await this.characterRepository.findVersionById(
      conversation.versionId,
    )
    const characterId = version?.characterId ?? ""
    const result = characterId
      ? await this.characterRepository.findById(characterId)
      : null

    return {
      id: conversation.id,
      characterId,
      characterName: result?.currentVersion.name ?? version?.name ?? "Unknown",
      profileImageAssetId: await resolveEffectiveProfileImageAssetId(
        conversation.customProfileImageAssetId,
        result?.currentVersion.profileImageAssetId ?? null,
        this.assetRepository,
      ),
      title: conversation.title,
      titleSource: conversation.titleSource,
      model: conversation.model,
      provider: conversation.provider,
      providerInstanceId: conversation.providerInstanceId,
      recentMessageCount: conversation.recentMessageCount,
      summaryFrequency: conversation.summaryFrequency,
      temperature: conversation.temperature,
      maxTokens: conversation.maxTokens,
      topP: conversation.topP,
      frequencyPenalty: conversation.frequencyPenalty,
      presencePenalty: conversation.presencePenalty,
      stopSequences: conversation.stopSequences,
      memoryProposalMode: conversation.memoryProposalMode,
      customProfileImageAssetId: conversation.customProfileImageAssetId,
      playerCharacterId: conversation.playerCharacterId,
      memoryDecayMode: conversation.memoryDecayMode,
      memoryDecayThreshold: conversation.memoryDecayThreshold,
      memoryDecayAgeThreshold: conversation.memoryDecayAgeThreshold,
      memoryDecaySpeed: conversation.memoryDecaySpeed,
      createdAt: conversation.createdAt.toISOString(),
      updatedAt: conversation.updatedAt.toISOString(),
      messages: copied.map(toMessageDTO),
    }
  }
}

function toMessageDTO(m: Message): MessageDTO {
  return {
    id: m.id,
    conversationId: m.conversationId,
    role: m.role,
    content: m.content,
    position: m.position,
    alternatives: m.alternatives,
    alternativesCursor: m.alternativesCursor,
    createdAt: m.createdAt.toISOString(),
    editedAt: m.editedAt?.toISOString() ?? null,
  }
}
