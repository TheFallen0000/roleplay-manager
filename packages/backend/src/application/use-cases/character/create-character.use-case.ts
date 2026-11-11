import { v7 as randomUUIDv7 } from "uuid"

import type {
  CreateCharacterInput,
  CharacterDetail,
} from "@workspace/shared/types/character"
import { MAX_LOREBOOK_ENTRIES } from "@workspace/shared/lib/sillytavern-card"

import { Character } from "../../../domain/entities/character.entity"
import { CharacterVersion } from "../../../domain/entities/character-version.entity"
import { CharacterCard } from "../../../domain/entities/character-card.entity"
import type {
  CharacterRepository,
  CreateCharacterLorebook,
} from "../../../domain/ports/character.repository"
import type { LorebookRepository } from "../../../domain/ports/lorebook.repository"
import {
  CharacterValidationError,
  DomainError,
  LorebookValidationError,
} from "../../../domain/errors"
import { buildLorebookEntities } from "./lorebook/lorebook.mapper"
import { resolveLorebookVersionId } from "./lorebook/lorebook-version-link"
import { toCharacterVersionDTOWithLorebookSummary } from "./lorebook/lorebook-version-summary"

export class CreateCharacterUseCase {
  constructor(
    private readonly characterRepository: CharacterRepository,
    private readonly lorebookRepository?: LorebookRepository,
  ) {}

  async execute(input: CreateCharacterInput): Promise<CharacterDetail> {
    if (input.cards?.some((c) => !c.title.trim() || !c.content.trim())) {
      throw new CharacterValidationError("Cards must have non-empty title and content")
    }

    const lorebookVersionId = await resolveLorebookVersionId(
      this.lorebookRepository,
      input.lorebookVersionId,
    )

    const now = new Date()
    const characterId = randomUUIDv7()

    const character = Character.create({
      id: characterId,
      name: input.name,
      createdAt: now,
      updatedAt: now,
    })

    const versionId = randomUUIDv7()
    const cards = (input.cards ?? []).map((c, i) =>
      CharacterCard.create({
        id: randomUUIDv7(),
        versionId,
        title: c.title,
        content: c.content,
        position: i,
        active: c.active ?? true,
      }),
    )

    const version = CharacterVersion.create({
      id: versionId,
      characterId,
      name: input.name,
      subtitle: input.subtitle ?? null,
      profileImageAssetId: input.profileImageAssetId ?? null,
      description: input.description,
      instructions: input.instructions ?? null,
      greeting: input.greeting,
      versionNumber: 1,
      createdAt: now,
      cards,
      lorebookVersionId,
      personality: input.personality ?? null,
      scenario: input.scenario ?? null,
      mesExample: input.mesExample ?? null,
      alternateGreetings: input.alternateGreetings ?? [],
      creatorNotes: input.creatorNotes ?? null,
      tags: input.tags ?? [],
      creator: input.creator ?? null,
      cardCharacterVersion: input.cardCharacterVersion ?? null,
      gender: input.gender ?? null,
      pronouns: input.pronouns ?? null,
      tagline: input.tagline ?? null,
      systemPrompt: input.systemPrompt ?? null,
      postHistoryInstructions: input.postHistoryInstructions ?? null,
      extensions: input.extensions ?? null,
      unknownFields: input.unknownFields ?? null,
      unknownRootFields: input.unknownRootFields ?? null,
    })

    const lorebook = this.buildLorebook(input, characterId)

    const result = await this.characterRepository.createWithFirstVersion(
      character,
      version,
      lorebook ?? undefined,
    )

    const currentVersion = await toCharacterVersionDTOWithLorebookSummary(
      result.version,
      this.lorebookRepository,
    )

    return {
      id: result.character.id,
      name: result.character.name,
      createdAt: result.character.createdAt.toISOString(),
      updatedAt: result.character.updatedAt.toISOString(),
      currentVersion,
      versions: [currentVersion],
    }
  }

  private buildLorebook(
    input: CreateCharacterInput,
    characterId: string,
  ): CreateCharacterLorebook | null {
    if (!input.lorebook) return null

    let parsed: unknown
    try {
      parsed = JSON.parse(input.lorebook.payload)
    } catch {
      throw new DomainError(
        "INVALID_CARD_JSON",
        "The lorebook payload is not valid JSON.",
        400,
      )
    }

    const entities = buildLorebookEntities(parsed, characterId)
    if (!entities) {
      throw new DomainError(
        "INVALID_CARD_JSON",
        "The payload is not a SillyTavern lorebook.",
        400,
      )
    }
    if (entities.entries.length > MAX_LOREBOOK_ENTRIES) {
      throw new LorebookValidationError(
        `A lorebook can have at most ${MAX_LOREBOOK_ENTRIES} entries.`,
      )
    }

    return entities
  }
}
