import type {
  ConversationDetail,
  ConversationSettingsUpdate,
} from "@workspace/shared/types/conversation"
import type { ProviderId } from "@workspace/shared/types/provider"

import type { ConversationRepository } from "../../../domain/ports/conversation.repository"
import type { ProviderInstanceRepository } from "../../../domain/ports/provider-instance.repository"
import type { Logger } from "../../../domain/ports/logger.port"
import type { CharacterRepository } from "../../../domain/ports/character.repository"
import type { PlayerCharacterRepository } from "../../../domain/ports/player-character.repository"
import type { CharacterAssetRepository, CharacterAssetStorage } from "../../../domain/ports/character-asset.repository"
import type { ProviderRegistry } from "../../../domain/ports/provider.port"
import {
  ConversationNotFoundError,
  CharacterAssetNotFoundError,
  PlayerCharacterNotFoundError,
  DomainError,
} from "../../../domain/errors"
import { resolveEffectiveProfileImageAssetId } from "../../../domain/value-objects/effective-profile-image"

const VALID_PROVIDERS: ProviderId[] = ["ollama", "openai-compatible"]

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export class UpdateConversationSettingsUseCase {
  constructor(
    private readonly conversationRepository: ConversationRepository,
    private readonly characterRepository: CharacterRepository,
    private readonly providerRegistry: ProviderRegistry,
    private readonly providerInstanceRepository: ProviderInstanceRepository,
    private readonly logger: Logger,
    private readonly assetRepository: CharacterAssetRepository,
    private readonly assetStorage: CharacterAssetStorage,
    private readonly playerCharacterRepository: PlayerCharacterRepository,
  ) {}

  async execute(
    conversationId: string,
    input: ConversationSettingsUpdate,
  ): Promise<ConversationDetail> {
    const conv = await this.conversationRepository.findById(conversationId)
    if (!conv) {
      throw new ConversationNotFoundError(conversationId)
    }

    const previousOverride = conv.customProfileImageAssetId

    if (input.customProfileImageAssetId !== undefined) {
      if (input.customProfileImageAssetId !== null) {
        const asset = await this.assetRepository.findById(input.customProfileImageAssetId)
        if (!asset) {
          throw new CharacterAssetNotFoundError(input.customProfileImageAssetId)
        }
      }
    }

    if (input.playerCharacterId !== undefined && input.playerCharacterId !== null) {
      const playerCharacter = await this.playerCharacterRepository.findById(
        input.playerCharacterId,
      )
      if (!playerCharacter) {
        throw new PlayerCharacterNotFoundError(input.playerCharacterId)
      }
    }

    if (input.provider !== undefined) {
      if (!VALID_PROVIDERS.includes(input.provider as ProviderId)) {
        throw new DomainError(
          "INVALID_PROVIDER",
          `Invalid provider. Must be one of: ${VALID_PROVIDERS.join(", ")}`,
        )
      }

      if (input.provider === "openai-compatible") {
        if (!input.providerInstanceId) {
          throw new DomainError(
            "PROVIDER_INSTANCE_REQUIRED",
            "An instance ID is required for openai-compatible providers.",
          )
        }
        const instance = await this.providerInstanceRepository.findById(
          input.providerInstanceId,
        )
        if (!instance) {
          throw new DomainError(
            "PROVIDER_INSTANCE_NOT_FOUND",
            `Provider instance '${input.providerInstanceId}' not found.`,
          )
        }

        if (input.force !== true) {
          try {
            const adapter = this.providerRegistry.createAdapter(instance)
            const status = await adapter.validateConnection()
            if (status !== "available") {
              throw new DomainError(
                "PROVIDER_NOT_AVAILABLE",
                `Provider '${instance.name}' is not available. Use force: true to save anyway.`,
              )
            }
          } catch (error) {
            if (error instanceof DomainError) throw error
            throw new DomainError(
              "PROVIDER_NOT_AVAILABLE",
              `Provider '${instance.name}' is not available. Use force: true to save anyway.`,
            )
          }
        }
      } else if (input.provider === "ollama") {
        if (input.force !== true) {
          try {
            const adapter = await this.providerRegistry.getAdapter("ollama")
            if (adapter) {
              const status = await adapter.validateConnection()
              if (status !== "available") {
                this.logger.warn("Ollama is not available but saving anyway (no force required for built-in)")
              }
            }
          } catch {
            this.logger.warn("Ollama connection check failed but saving anyway")
          }
        }
      }
    }

    if (input.temperature !== undefined) {
      input.temperature = clamp(input.temperature, 0, 2)
    }
    if (input.topP !== undefined) {
      input.topP = clamp(input.topP, 0, 1)
    }
    if (input.frequencyPenalty !== undefined) {
      input.frequencyPenalty = clamp(input.frequencyPenalty, -2, 2)
    }
    if (input.presencePenalty !== undefined) {
      input.presencePenalty = clamp(input.presencePenalty, -2, 2)
    }
    if (input.maxTokens !== undefined) {
      input.maxTokens = Math.max(1, input.maxTokens)
    }
    if (input.recentMessageCount !== undefined) {
      input.recentMessageCount = Math.max(1, input.recentMessageCount)
      const sf = input.summaryFrequency ?? conv.summaryFrequency
      if (input.recentMessageCount >= sf) {
        input.recentMessageCount = Math.max(1, sf - 1)
      }
    }
    if (input.summaryFrequency !== undefined) {
      input.summaryFrequency = Math.max(1, input.summaryFrequency)
    }
    if (input.memoryDecayThreshold !== undefined) {
      input.memoryDecayThreshold = Math.min(10, Math.max(1, Math.round(input.memoryDecayThreshold)))
    }
    if (input.memoryDecayAgeThreshold !== undefined) {
      input.memoryDecayAgeThreshold = Math.max(1, Math.round(input.memoryDecayAgeThreshold))
    }
    if (input.memoryDecaySpeed !== undefined) {
      input.memoryDecaySpeed = Math.max(1, Math.round(input.memoryDecaySpeed))
    }

    const updated = await this.conversationRepository.updateSettings(
      conversationId,
      input,
    )

    if (input.customProfileImageAssetId !== undefined) {
      if (input.customProfileImageAssetId !== previousOverride) {
        await this.deleteAssetIfExists(previousOverride)
      }
    }

    const version = await this.characterRepository.findVersionById(
      updated.versionId,
    )
    const characterId = version?.characterId ?? ""
    const result = characterId
      ? await this.characterRepository.findById(characterId)
      : null
    const profileImageAssetId = await resolveEffectiveProfileImageAssetId(
      updated.customProfileImageAssetId,
      result?.currentVersion.profileImageAssetId ?? null,
      this.assetRepository,
    )

    return {
      id: updated.id,
      characterId,
      characterName: result?.currentVersion.name ?? version?.name ?? "Unknown",
      profileImageAssetId,
      title: updated.title,
      titleSource: updated.titleSource,
      model: updated.model,
      provider: updated.provider,
      providerInstanceId: updated.providerInstanceId,
      recentMessageCount: updated.recentMessageCount,
      summaryFrequency: updated.summaryFrequency,
      temperature: updated.temperature,
      maxTokens: updated.maxTokens,
      topP: updated.topP,
      frequencyPenalty: updated.frequencyPenalty,
      presencePenalty: updated.presencePenalty,
      stopSequences: updated.stopSequences,
      memoryProposalMode: updated.memoryProposalMode,
      customProfileImageAssetId: updated.customProfileImageAssetId,
      playerCharacterId: updated.playerCharacterId,
      memoryDecayMode: updated.memoryDecayMode,
      memoryDecayThreshold: updated.memoryDecayThreshold,
      memoryDecayAgeThreshold: updated.memoryDecayAgeThreshold,
      memoryDecaySpeed: updated.memoryDecaySpeed,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
      messages: [],
    }
  }

  private async deleteAssetIfExists(assetId: string | null): Promise<void> {
    if (!assetId) return
    const asset = await this.assetRepository.findById(assetId)
    if (!asset) return
    await this.assetStorage.delete(asset.characterId, asset.id, asset.extension)
    await this.assetRepository.deleteById(asset.id)
  }
}
