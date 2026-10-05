import { v7 as randomUUIDv7 } from "uuid"

import type { CharacterSummary, CharacterVersionDTO } from "@workspace/shared/types/character"
import type {
  CharacterExport,
  ExportConversation,
  ExportSettings,
} from "@workspace/shared/types/export"
import {
  DEFAULT_EXPORT_SETTINGS,
  EXPORT_KIND,
  EXPORT_SCHEMA_VERSION,
} from "@workspace/shared/types/export"
import { Character } from "../../../domain/entities/character.entity"
import { CharacterVersion } from "../../../domain/entities/character-version.entity"
import { CharacterCard } from "../../../domain/entities/character-card.entity"
import { Conversation } from "../../../domain/entities/conversation.entity"
import { Message } from "../../../domain/entities/message.entity"
import { Memory } from "../../../domain/entities/memory.entity"
import { Summary } from "../../../domain/entities/summary.entity"
import type { CharacterRepository } from "../../../domain/ports/character.repository"
import type { ConversationRepository } from "../../../domain/ports/conversation.repository"
import type { MessageRepository } from "../../../domain/ports/message.repository"
import type { MemoryRepository } from "../../../domain/ports/memory.repository"
import type { SummaryRepository } from "../../../domain/ports/summary.repository"
import { DomainError } from "../../../domain/errors"
import type { CharacterAssetWriter } from "../../services/store-character-asset.service"

export interface ImportCharacterInput {
  payload: CharacterExport
}

export class ImportCharacterUseCase {
  constructor(
    private readonly characterRepository: CharacterRepository,
    private readonly conversationRepository: ConversationRepository,
    private readonly messageRepository: MessageRepository,
    private readonly memoryRepository: MemoryRepository,
    private readonly summaryRepository: SummaryRepository,
    private readonly storeCharacterAsset: CharacterAssetWriter,
  ) {}

  async execute(input: ImportCharacterInput): Promise<CharacterSummary> {
    const { payload } = input
    this.validatePayload(payload)

    const exportedVersions = this.resolveVersions(payload)
    const now = new Date()
    const characterId = randomUUIDv7()

    const character = Character.create({
      id: characterId,
      name: payload.character.name,
      createdAt: now,
      updatedAt: now,
    })

    const createdVersions: CharacterVersion[] = []
    const newIdByOldVersionId = new Map<string, string>()

    exportedVersions.forEach((exported, index) => {
      const versionId = randomUUIDv7()
      newIdByOldVersionId.set(exported.id, versionId)
      createdVersions.push(
        CharacterVersion.create({
          id: versionId,
          characterId,
          name: exported.name,
          subtitle: exported.subtitle,
          profileImageAssetId: null,
          description: exported.description,
          instructions: exported.instructions,
          greeting: exported.greeting,
          versionNumber: exported.versionNumber > 0 ? exported.versionNumber : index + 1,
          createdAt: this.parseDate(exported.createdAt, now),
          cards: (exported.cards ?? []).map((card, cardIndex) =>
            CharacterCard.create({
              id: randomUUIDv7(),
              versionId,
              title: card.title,
              content: card.content,
              position: cardIndex,
              active: card.active ?? true,
            }),
          ),
        }),
      )
    })

    const currentVersion = createdVersions[createdVersions.length - 1]

    await this.characterRepository.createWithFirstVersion(character, createdVersions[0])
    for (const version of createdVersions.slice(1)) {
      await this.characterRepository.saveVersion(version)
    }

    const profileImageAssetId = await this.importProfileImage(
      characterId,
      currentVersion,
      payload,
      now,
    )

    if (payload.conversations && payload.conversations.length > 0) {
      await this.importConversations(
        newIdByOldVersionId,
        currentVersion.id,
        payload.conversations,
        now,
      )
    }

    return {
      id: character.id,
      name: character.name,
      subtitle: currentVersion.subtitle,
      profileImageAssetId,
      versionNumber: currentVersion.versionNumber,
      createdAt: character.createdAt.toISOString(),
      updatedAt: character.updatedAt.toISOString(),
    }
  }

  private validatePayload(payload: CharacterExport): void {
    if (!payload || typeof payload !== "object") {
      throw invalid("El archivo no es un JSON válido.")
    }
    if (payload.kind !== EXPORT_KIND) {
      throw invalid(
        "El archivo no es una exportación de personaje (kind distinto de 'character-export').",
      )
    }
    if (payload.schemaVersion !== EXPORT_SCHEMA_VERSION) {
      throw invalid(
        `Versión de esquema no soportada (${payload.schemaVersion ?? "desconocida"}). Se esperaba ${EXPORT_SCHEMA_VERSION}.`,
      )
    }
    if (!payload.character?.name?.trim()) {
      throw invalid("El archivo no incluye el nombre del personaje.")
    }
    if (this.resolveVersions(payload).length === 0) {
      throw invalid(
        "El archivo no contiene la definición del personaje (ni 'definition' ni 'versions').",
      )
    }
  }

  private resolveVersions(payload: CharacterExport): CharacterVersionDTO[] {
    if (payload.versions && payload.versions.length > 0) {
      return [...payload.versions].sort((a, b) => a.versionNumber - b.versionNumber)
    }
    if (payload.definition) {
      return [payload.definition]
    }
    return []
  }

  private async importProfileImage(
    characterId: string,
    currentVersion: CharacterVersion,
    payload: CharacterExport,
    now: Date,
  ): Promise<string | null> {
    const profileImage = payload.profileImage
    if (!profileImage?.base64) return null

    const data = Buffer.from(profileImage.base64, "base64")
    let asset
    try {
      asset = await this.storeCharacterAsset.store({
        characterId,
        mimeType: profileImage.mimeType,
        data,
        createdAt: now,
      })
    } catch (error) {
      if (error instanceof DomainError) throw invalid(error.message)
      throw error
    }
    await this.characterRepository.updateProfileImageAssetId(
      currentVersion.id,
      asset.id,
    )

    return asset.id
  }

  private async importConversations(
    newIdByOldVersionId: Map<string, string>,
    fallbackVersionId: string,
    conversations: ExportConversation[],
    now: Date,
  ): Promise<void> {
    const messageIdByOldMessageId = new Map<string, string>()

    for (const exported of conversations) {
      const conversationId = randomUUIDv7()
      const settings: ExportSettings & { customProfileImageAssetId?: string | null } =
        exported.settings ?? DEFAULT_EXPORT_SETTINGS

      const conversation = Conversation.create({
        id: conversationId,
        versionId: newIdByOldVersionId.get(exported.versionId) ?? fallbackVersionId,
        title: exported.title,
        titleSource: exported.title ? "manual" : null,
        model: settings.model,
        provider: settings.provider,
        providerInstanceId: settings.providerInstanceId,
        recentMessageCount: settings.recentMessageCount,
        summaryFrequency: settings.summaryFrequency,
        temperature: settings.temperature,
        maxTokens: settings.maxTokens,
        topP: settings.topP,
        frequencyPenalty: settings.frequencyPenalty,
        presencePenalty: settings.presencePenalty,
        stopSequences: settings.stopSequences,
        memoryProposalMode: settings.memoryProposalMode,
        customProfileImageAssetId: settings.customProfileImageAssetId ?? null,
        memoryDecayMode: settings.memoryDecayMode,
        memoryDecayThreshold: settings.memoryDecayThreshold,
        memoryDecayAgeThreshold: settings.memoryDecayAgeThreshold,
        memoryDecaySpeed: settings.memoryDecaySpeed,
        createdAt: this.parseDate(exported.createdAt, now),
        updatedAt: this.parseDate(exported.updatedAt, now),
      })

      await this.conversationRepository.create(conversation)

      for (const exportedMessage of exported.messages ?? []) {
        const messageId = randomUUIDv7()
        messageIdByOldMessageId.set(exportedMessage.id, messageId)
        await this.messageRepository.create(
          Message.create({
            id: messageId,
            conversationId,
            role: exportedMessage.role,
            content: exportedMessage.content,
            position: exportedMessage.position,
            alternatives: exportedMessage.alternatives ?? [],
            alternativesCursor: 0,
            createdAt: this.parseDate(exportedMessage.createdAt, now),
            editedAt: exportedMessage.editedAt
              ? this.parseDate(exportedMessage.editedAt, now)
              : null,
          }),
        )
      }

      for (const exportedMemory of exported.memories ?? []) {
        await this.memoryRepository.create(
          Memory.create({
            id: randomUUIDv7(),
            conversationId,
            actor: exportedMemory.actor,
            title: exportedMemory.title,
            description: exportedMemory.description,
            priority: exportedMemory.priority,
            createdBy: exportedMemory.createdBy,
            updatedBy: exportedMemory.updatedBy,
            createdAt: this.parseDate(exportedMemory.createdAt, now),
            updatedAt: this.parseDate(exportedMemory.updatedAt, now),
          }),
        )
      }

      for (const exportedSummary of exported.summaries ?? []) {
        const firstMessageId = messageIdByOldMessageId.get(exportedSummary.firstMessageId)
        const lastMessageId = messageIdByOldMessageId.get(exportedSummary.lastMessageId)
        if (!firstMessageId || !lastMessageId) continue
        await this.summaryRepository.create(
          Summary.create({
            id: randomUUIDv7(),
            conversationId,
            content: exportedSummary.content,
            firstMessageId,
            lastMessageId,
            model: exportedSummary.model,
            provider: exportedSummary.provider,
            createdAt: this.parseDate(exportedSummary.createdAt, now),
            editedAt: exportedSummary.editedAt
              ? this.parseDate(exportedSummary.editedAt, now)
              : null,
          }),
        )
      }
    }
  }

  private parseDate(value: string | null | undefined, fallback: Date): Date {
    if (!value) return fallback
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? fallback : date
  }
}

function invalid(message: string): DomainError {
  return new DomainError("INVALID_IMPORT_FILE", message)
}
