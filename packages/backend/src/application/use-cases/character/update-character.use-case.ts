import { isDeepStrictEqual } from "node:util"

import { v7 as randomUUIDv7 } from "uuid"

import type {
  CharacterDetail,
  UpdateCharacterInput,
} from "@workspace/shared/types/character"

import { CharacterCard } from "../../../domain/entities/character-card.entity"
import { CharacterVersion } from "../../../domain/entities/character-version.entity"
import type { CharacterRepository } from "../../../domain/ports/character.repository"
import type { LorebookRepository } from "../../../domain/ports/lorebook.repository"
import {
  CharacterNotFoundError,
  CharacterValidationError,
  NoChangesDetectedError,
} from "../../../domain/errors"
import { resolveLorebookVersionId } from "./lorebook/lorebook-version-link"
import { toCharacterVersionDTOWithLorebookSummary } from "./lorebook/lorebook-version-summary"

export interface UpdateCharacterDeps {
  lorebookRepository?: LorebookRepository
}

export class UpdateCharacterUseCase {
  constructor(
    private readonly characterRepository: CharacterRepository,
    private readonly deps: UpdateCharacterDeps = {},
  ) {}

  async execute(
    id: string,
    input: UpdateCharacterInput,
  ): Promise<CharacterDetail> {
    const existing = await this.characterRepository.findById(id)

    if (!existing) {
      throw new CharacterNotFoundError(id)
    }

    const prevVersion = existing.currentVersion

    const requestedLorebookVersionId =
      input.lorebookVersionId !== undefined
        ? input.lorebookVersionId
        : prevVersion.lorebookVersionId
    const newLorebookVersionId = await resolveLorebookVersionId(
      this.deps.lorebookRepository,
      requestedLorebookVersionId,
    )

    const newName = input.name ?? existing.character.name
    const newSubtitle = input.subtitle !== undefined ? input.subtitle : prevVersion.subtitle
    const newProfileImageAssetId = input.profileImageAssetId !== undefined ? input.profileImageAssetId : prevVersion.profileImageAssetId
    const newDescription = input.description ?? prevVersion.description
    const newInstructions = input.instructions !== undefined ? input.instructions : prevVersion.instructions
    const newGreeting = input.greeting ?? prevVersion.greeting
    const newPersonality =
      input.personality !== undefined ? input.personality : prevVersion.personality
    const newScenario =
      input.scenario !== undefined ? input.scenario : prevVersion.scenario
    const newMesExample =
      input.mesExample !== undefined ? input.mesExample : prevVersion.mesExample
    const newAlternateGreetings =
      input.alternateGreetings !== undefined
        ? input.alternateGreetings
        : prevVersion.alternateGreetings
    const newCreatorNotes =
      input.creatorNotes !== undefined ? input.creatorNotes : prevVersion.creatorNotes
    const newTags = input.tags !== undefined ? input.tags : prevVersion.tags
    const newCreator =
      input.creator !== undefined ? input.creator : prevVersion.creator
    const newCardCharacterVersion =
      input.cardCharacterVersion !== undefined
        ? input.cardCharacterVersion
        : prevVersion.cardCharacterVersion
    const newGender = input.gender !== undefined ? input.gender : prevVersion.gender
    const newPronouns =
      input.pronouns !== undefined ? input.pronouns : prevVersion.pronouns
    const newTagline =
      input.tagline !== undefined ? input.tagline : prevVersion.tagline
    const newSystemPrompt =
      input.systemPrompt !== undefined ? input.systemPrompt : prevVersion.systemPrompt
    const newPostHistoryInstructions =
      input.postHistoryInstructions !== undefined
        ? input.postHistoryInstructions
        : prevVersion.postHistoryInstructions
    const newExtensions =
      input.extensions !== undefined ? input.extensions : prevVersion.extensions
    const newUnknownFields =
      input.unknownFields !== undefined
        ? input.unknownFields
        : prevVersion.unknownFields
    const newUnknownRootFields =
      input.unknownRootFields !== undefined
        ? input.unknownRootFields
        : prevVersion.unknownRootFields

    if (
      newName === existing.character.name &&
      newSubtitle === prevVersion.subtitle &&
      newProfileImageAssetId === prevVersion.profileImageAssetId &&
      newDescription === prevVersion.description &&
      newInstructions === prevVersion.instructions &&
      newGreeting === prevVersion.greeting &&
      input.cards === undefined &&
      newPersonality === prevVersion.personality &&
      newScenario === prevVersion.scenario &&
      newMesExample === prevVersion.mesExample &&
      arraysEqual(newAlternateGreetings, prevVersion.alternateGreetings) &&
      newCreatorNotes === prevVersion.creatorNotes &&
      arraysEqual(newTags, prevVersion.tags) &&
      newCreator === prevVersion.creator &&
      newCardCharacterVersion === prevVersion.cardCharacterVersion &&
      newGender === prevVersion.gender &&
      newPronouns === prevVersion.pronouns &&
      newTagline === prevVersion.tagline &&
      newSystemPrompt === prevVersion.systemPrompt &&
      newPostHistoryInstructions === prevVersion.postHistoryInstructions &&
      isDeepStrictEqual(newExtensions, prevVersion.extensions) &&
      isDeepStrictEqual(newUnknownFields, prevVersion.unknownFields) &&
      isDeepStrictEqual(newUnknownRootFields, prevVersion.unknownRootFields) &&
      newLorebookVersionId === prevVersion.lorebookVersionId
    ) {
      throw new NoChangesDetectedError()
    }

    if (input.cards?.some((c) => !c.title.trim() || !c.content.trim())) {
      throw new CharacterValidationError("Cards must have non-empty title and content")
    }

    const now = new Date()
    const updated = existing.character.withName(newName)
    await this.characterRepository.update(updated)

    const maxVersion = await this.characterRepository.findMaxVersionNumber(id)
    const newVersionNumber = maxVersion + 1
    const newVersionId = randomUUIDv7()

    const cards = (input.cards ?? prevVersion.cards.map((c) => ({
      id: c.id,
      title: c.title,
      content: c.content,
      position: c.position,
      active: c.active,
    }))).map((c, i) =>
      CharacterCard.create({
        id: randomUUIDv7(),
        versionId: newVersionId,
        title: c.title,
        content: c.content,
        position: i,
        active: c.active ?? true,
      }),
    )

    const newVersion = CharacterVersion.create({
      id: newVersionId,
      characterId: id,
      name: newName,
      subtitle: newSubtitle,
      profileImageAssetId: newProfileImageAssetId,
      description: newDescription,
      instructions: newInstructions,
      greeting: newGreeting,
      versionNumber: newVersionNumber,
      createdAt: now,
      cards,
      personality: newPersonality,
      scenario: newScenario,
      mesExample: newMesExample,
      alternateGreetings: newAlternateGreetings,
      creatorNotes: newCreatorNotes,
      tags: newTags,
      creator: newCreator,
      cardCharacterVersion: newCardCharacterVersion,
      gender: newGender,
      pronouns: newPronouns,
      tagline: newTagline,
      systemPrompt: newSystemPrompt,
      postHistoryInstructions: newPostHistoryInstructions,
      extensions: newExtensions,
      unknownFields: newUnknownFields,
      unknownRootFields: newUnknownRootFields,
      lorebookVersionId: newLorebookVersionId,
    })

    await this.characterRepository.saveVersion(newVersion)

    const allVersions = await this.characterRepository.findVersionsByCharacterId(id)

    const currentVersion = await toCharacterVersionDTOWithLorebookSummary(
      newVersion,
      this.deps.lorebookRepository,
    )
    const versions = await Promise.all(
      allVersions.map((version) =>
        toCharacterVersionDTOWithLorebookSummary(
          version,
          this.deps.lorebookRepository,
        ),
      ),
    )

    return {
      id: updated.id,
      name: updated.name,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
      currentVersion,
      versions,
    }
  }
}

const arraysEqual = (a: readonly string[], b: readonly string[]): boolean =>
  a.length === b.length && a.every((value, index) => value === b[index])
