import { v7 as randomUUIDv7 } from "uuid"

import type { CharacterSummary } from "@workspace/shared/types/character"
import type { SillyTavernCardFormat } from "@workspace/shared/types/sillytavern-card"
import {
  MAX_LOREBOOK_ENTRIES,
  validateCardFieldSize,
} from "@workspace/shared/lib/sillytavern-card"

import { Character } from "../../../domain/entities/character.entity"
import { CharacterVersion } from "../../../domain/entities/character-version.entity"
import {
  DomainError,
  LorebookValidationError,
} from "../../../domain/errors"
import type { CardPngPort } from "../../../domain/ports/card-png.port"
import type { CharacterRepository } from "../../../domain/ports/character.repository"
import type { LorebookRepository } from "../../../domain/ports/lorebook.repository"
import type { CharacterAssetWriter } from "../../services/store-character-asset.service"

import { cardDataToVersionFields } from "./sillytavern-card.mapper"
import { decodeCardPayload } from "./sillytavern-card.payload"
import { buildLorebookEntities } from "./lorebook/lorebook.mapper"

export interface ImportSillyTavernCardDeps {
  characterRepository: CharacterRepository
  lorebookRepository: LorebookRepository
  storeCharacterAsset: CharacterAssetWriter
  cardPng: CardPngPort
}

export interface ImportSillyTavernCardInput {
  format: SillyTavernCardFormat
  payload: string
}

export class ImportSillyTavernCardUseCase {
  constructor(private readonly deps: ImportSillyTavernCardDeps) {}

  async execute(
    input: ImportSillyTavernCardInput,
  ): Promise<CharacterSummary> {
    const decoded = decodeCardPayload(input, this.deps.cardPng)
    const fields = cardDataToVersionFields(decoded.data, decoded.root)

    const size = validateCardFieldSize(decoded.data)
    if (!size.ok) {
      throw new DomainError(
        "INVALID_CARD_FIELD_TOO_LARGE",
        `The card field '${size.field}' exceeds the allowed size.`,
        413,
      )
    }

    if (
      fields.lorebook &&
      fields.lorebook.entries.length > MAX_LOREBOOK_ENTRIES
    ) {
      throw new LorebookValidationError(
        `A lorebook can have at most ${MAX_LOREBOOK_ENTRIES} entries.`,
      )
    }

    const now = new Date()
    const characterId = randomUUIDv7()

    const character = Character.create({
      id: characterId,
      name: fields.name,
      createdAt: now,
      updatedAt: now,
    })

    const versionId = randomUUIDv7()
    const version = CharacterVersion.create({
      id: versionId,
      characterId,
      name: fields.name,
      subtitle: null,
      profileImageAssetId: null,
      description: fields.description,
      instructions: null,
      greeting: fields.greeting,
      versionNumber: 1,
      createdAt: now,
      cards: [],
      personality: fields.personality,
      scenario: fields.scenario,
      mesExample: fields.mesExample,
      alternateGreetings: fields.alternateGreetings,
      creatorNotes: fields.creatorNotes,
      tags: fields.tags,
      creator: fields.creator,
      cardCharacterVersion: fields.cardCharacterVersion,
      gender: fields.gender,
      pronouns: fields.pronouns,
      tagline: fields.tagline,
      systemPrompt: fields.systemPrompt,
      postHistoryInstructions: fields.postHistoryInstructions,
      extensions: fields.extensions,
      unknownFields: fields.unknownFields,
      unknownRootFields: fields.unknownRootFields,
    })

    const lorebook = fields.lorebook
      ? buildLorebookEntities(decoded.data, characterId, { now })
      : null

    await this.deps.characterRepository.createWithFirstVersion(
      character,
      version,
      lorebook ?? undefined,
    )

    const profileImageAssetId = await this.storeImage(
      characterId,
      versionId,
      decoded.imageBuffer,
      now,
    )

    return {
      id: character.id,
      name: character.name,
      subtitle: version.subtitle,
      profileImageAssetId,
      versionNumber: version.versionNumber,
      createdAt: character.createdAt.toISOString(),
      updatedAt: character.updatedAt.toISOString(),
    }
  }

  private async storeImage(
    characterId: string,
    versionId: string,
    imageBuffer: Buffer | null,
    now: Date,
  ): Promise<string | null> {
    if (!imageBuffer) return null
    try {
      const asset = await this.deps.storeCharacterAsset.store({
        characterId,
        mimeType: "image/png",
        data: imageBuffer,
        createdAt: now,
      })
      await this.deps.characterRepository.updateProfileImageAssetId(
        versionId,
        asset.id,
      )
      return asset.id
    } catch {
      // The image is a best-effort extra: never block the card import.
      return null
    }
  }
}
