import type {
  CharacterExport,
  ExportConversation,
  ExportConversationImage,
  ExportSection,
  ExportSettings,
} from "@workspace/shared/types/export"
import {
  DEFAULT_EXPORT_SETTINGS,
  EXPORT_KIND,
  EXPORT_SCHEMA_VERSION,
  EXPORT_SECTION_PARENTS,
} from "@workspace/shared/types/export"
import type {
  CharacterVersionDTO,
  CharacterCardDTO,
} from "@workspace/shared/types/character"
import type { MessageDTO } from "@workspace/shared/types/message"
import type { MemoryDTO } from "@workspace/shared/types/memory"
import type { SummaryDTO } from "@workspace/shared/types/summary"

import type { CharacterRepository } from "../../../domain/ports/character.repository"
import type { ConversationRepository } from "../../../domain/ports/conversation.repository"
import type { MessageRepository } from "../../../domain/ports/message.repository"
import type { MemoryRepository } from "../../../domain/ports/memory.repository"
import type { SummaryRepository } from "../../../domain/ports/summary.repository"
import type {
  CharacterAssetRepository,
  CharacterAssetStorage,
} from "../../../domain/ports/character-asset.repository"
import type { CharacterVersion } from "../../../domain/entities/character-version.entity"
import type { CharacterCard } from "../../../domain/entities/character-card.entity"
import type { Conversation } from "../../../domain/entities/conversation.entity"
import type { Message } from "../../../domain/entities/message.entity"
import type { Memory } from "../../../domain/entities/memory.entity"
import type { Summary } from "../../../domain/entities/summary.entity"
import { CharacterNotFoundError, DomainError } from "../../../domain/errors"
import { findCharacterConversations } from "../conversation/find-character-conversations"

export interface ExportCharacterInput {
  characterId: string
  sections: ExportSection[]
  includeProfileImageBase64?: boolean
}

export class ExportCharacterUseCase {
  constructor(
    private readonly characterRepository: CharacterRepository,
    private readonly conversationRepository: ConversationRepository,
    private readonly messageRepository: MessageRepository,
    private readonly memoryRepository: MemoryRepository,
    private readonly summaryRepository: SummaryRepository,
    private readonly assetRepository: CharacterAssetRepository,
    private readonly assetStorage: CharacterAssetStorage,
  ) {}

  async execute(input: ExportCharacterInput): Promise<CharacterExport> {
    const selected = new Set(input.sections)
    this.validateHierarchy(selected)

    const result = await this.characterRepository.findById(input.characterId)
    if (!result) {
      throw new CharacterNotFoundError(input.characterId)
    }
    const { character, currentVersion } = result

    const exportData: CharacterExport = {
      schemaVersion: EXPORT_SCHEMA_VERSION,
      kind: EXPORT_KIND,
      exportedAt: new Date().toISOString(),
      character: {
        id: character.id,
        name: character.name,
        createdAt: character.createdAt.toISOString(),
        updatedAt: character.updatedAt.toISOString(),
      },
    }

    if (selected.has("definition")) {
      exportData.definition = toVersionDTO(currentVersion)
    }

    if (selected.has("versions")) {
      const versions = await this.characterRepository.findVersionsByCharacterId(
        input.characterId,
      )
      exportData.versions = versions.map(toVersionDTO)
    }

    if (selected.has("profileImage")) {
      const profileImage = await this.buildProfileImage(
        currentVersion,
        input.includeProfileImageBase64 ?? true,
      )
      if (profileImage) {
        exportData.profileImage = profileImage
      }
    }

    const needsConversations =
      selected.has("conversations") || selected.has("standaloneSettings")

    const characterConversations = needsConversations
      ? await findCharacterConversations(
          this.conversationRepository,
          this.characterRepository,
          input.characterId,
        )
      : []

    if (selected.has("conversations")) {
      exportData.conversations = await this.buildConversations(
        characterConversations,
        selected,
      )
    }

    if (selected.has("conversations.images")) {
      exportData.conversationImages =
        await this.buildConversationImages(characterConversations)
    }

    if (selected.has("standaloneSettings")) {
      const source = characterConversations[0]
      exportData.standaloneSettings = source
        ? toSettings(source)
        : { ...DEFAULT_EXPORT_SETTINGS }
    }

    return exportData
  }

  private validateHierarchy(selected: Set<ExportSection>): void {
    for (const [child, parent] of Object.entries(EXPORT_SECTION_PARENTS)) {
      if (selected.has(child as ExportSection) && !selected.has(parent)) {
        throw new DomainError(
          "INVALID_EXPORT_SELECTION",
          `Export section '${child}' requires '${parent}'.`,
        )
      }
    }
  }

  private async buildConversations(
    conversations: Conversation[],
    selected: Set<ExportSection>,
  ): Promise<ExportConversation[]> {
    const exported: ExportConversation[] = []

    for (const conversation of conversations) {
      const item: ExportConversation = {
        id: conversation.id,
        title: conversation.title,
        versionId: conversation.versionId,
        createdAt: conversation.createdAt.toISOString(),
        updatedAt: conversation.updatedAt.toISOString(),
      }

      if (selected.has("conversations.settings")) {
        item.settings = toSettings(conversation)
      }

      if (selected.has("conversations.images")) {
        item.customProfileImageAssetId = conversation.customProfileImageAssetId
        item.backgroundImageAssetId = conversation.backgroundImageAssetId
        item.backgroundFit = conversation.backgroundFit
        item.backgroundScrim = conversation.backgroundScrim
      }

      if (selected.has("conversations.messages")) {
        const messages = await this.messageRepository.findByConversationId(
          conversation.id,
        )
        item.messages = messages.map(toMessageDTO)
      }

      if (selected.has("conversations.memories")) {
        const memories = await this.memoryRepository.findByConversationId(
          conversation.id,
        )
        item.memories = memories.map(toMemoryDTO)
      }

      if (selected.has("conversations.summaries")) {
        const summaries = await this.summaryRepository.findByConversationId(
          conversation.id,
        )
        item.summaries = summaries.map(toSummaryDTO)
      }

      exported.push(item)
    }

    return exported
  }

  /**
   * Exports each conversation-scoped image once, even when several branches
   * share it. Conversations reference them by id.
   */
  private async buildConversationImages(
    conversations: Conversation[],
  ): Promise<ExportConversationImage[]> {
    const assetIds = new Set<string>()
    for (const conversation of conversations) {
      if (conversation.customProfileImageAssetId) {
        assetIds.add(conversation.customProfileImageAssetId)
      }
      if (conversation.backgroundImageAssetId) {
        assetIds.add(conversation.backgroundImageAssetId)
      }
    }

    const images: ExportConversationImage[] = []
    for (const assetId of assetIds) {
      const asset = await this.assetRepository.findById(assetId)
      if (!asset) continue

      const stream = await this.assetStorage.read(
        asset.characterId,
        asset.id,
        asset.extension,
      )
      const chunks: Buffer[] = []
      for await (const chunk of stream) {
        chunks.push(Buffer.from(chunk))
      }

      images.push({
        assetId,
        mimeType: asset.mimeType,
        base64: Buffer.concat(chunks).toString("base64"),
      })
    }

    return images
  }

  private async buildProfileImage(
    version: CharacterVersion,
    includeBase64: boolean,
  ): Promise<CharacterExport["profileImage"] | null> {
    const assetId = version.profileImageAssetId
    if (!assetId) return null

    const asset = await this.assetRepository.findById(assetId)
    if (!asset) return null

    if (!includeBase64) {
      return { assetId, mimeType: asset.mimeType }
    }

    const stream = await this.assetStorage.read(
      asset.characterId,
      asset.id,
      asset.extension,
    )
    const chunks: Buffer[] = []
    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk))
    }

    return {
      assetId,
      mimeType: asset.mimeType,
      base64: Buffer.concat(chunks).toString("base64"),
    }
  }
}

function toSettings(conversation: Conversation): ExportSettings {
  return {
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
    memoryDecayMode: conversation.memoryDecayMode,
    memoryDecayThreshold: conversation.memoryDecayThreshold,
    memoryDecayAgeThreshold: conversation.memoryDecayAgeThreshold,
    memoryDecaySpeed: conversation.memoryDecaySpeed,
    messageStyle: conversation.messageStyle,
    characterDialogueColor: conversation.characterDialogueColor,
    userDialogueColor: conversation.userDialogueColor,
  }
}

function toVersionDTO(v: CharacterVersion): CharacterVersionDTO {
  return {
    id: v.id,
    characterId: v.characterId,
    name: v.name,
    subtitle: v.subtitle,
    profileImageAssetId: v.profileImageAssetId,
    description: v.description,
    instructions: v.instructions,
    greeting: v.greeting,
    versionNumber: v.versionNumber,
    createdAt: v.createdAt.toISOString(),
    cards: v.cards.map(toCardDTO),
  }
}

function toCardDTO(c: CharacterCard): CharacterCardDTO {
  return {
    id: c.id,
    versionId: c.versionId,
    title: c.title,
    content: c.content,
    position: c.position,
    active: c.active,
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

function toMemoryDTO(m: Memory): MemoryDTO {
  return {
    id: m.id,
    conversationId: m.conversationId,
    actor: m.actor,
    title: m.title,
    description: m.description,
    priority: m.priority,
    createdBy: m.createdBy,
    updatedBy: m.updatedBy,
    createdAt: m.createdAt.toISOString(),
    updatedAt: m.updatedAt.toISOString(),
  }
}

function toSummaryDTO(s: Summary): SummaryDTO {
  return {
    id: s.id,
    conversationId: s.conversationId,
    content: s.content,
    firstMessageId: s.firstMessageId,
    lastMessageId: s.lastMessageId,
    model: s.model,
    provider: s.provider,
    createdAt: s.createdAt.toISOString(),
    editedAt: s.editedAt?.toISOString() ?? null,
  }
}
