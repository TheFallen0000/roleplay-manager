import type {
  CharacterCardDTO,
  CharacterVersionDTO,
} from "@workspace/shared/types/character"

import type { CharacterCard } from "../../../domain/entities/character-card.entity"
import type { CharacterVersion } from "../../../domain/entities/character-version.entity"

export function toCharacterVersionDTO(
  version: CharacterVersion,
): CharacterVersionDTO {
  return {
    id: version.id,
    characterId: version.characterId,
    name: version.name,
    subtitle: version.subtitle,
    profileImageAssetId: version.profileImageAssetId,
    description: version.description,
    instructions: version.instructions,
    greeting: version.greeting,
    versionNumber: version.versionNumber,
    createdAt: version.createdAt.toISOString(),
    cards: version.cards.map(toCharacterCardDTO),
    personality: version.personality,
    scenario: version.scenario,
    mesExample: version.mesExample,
    alternateGreetings: version.alternateGreetings,
    creatorNotes: version.creatorNotes,
    tags: version.tags,
    creator: version.creator,
    cardCharacterVersion: version.cardCharacterVersion,
    gender: version.gender,
    pronouns: version.pronouns,
    tagline: version.tagline,
    systemPrompt: version.systemPrompt,
    postHistoryInstructions: version.postHistoryInstructions,
    extensions: version.extensions,
    unknownFields: version.unknownFields,
    unknownRootFields: version.unknownRootFields,
  }
}

function toCharacterCardDTO(card: CharacterCard): CharacterCardDTO {
  return {
    id: card.id,
    versionId: card.versionId,
    title: card.title,
    content: card.content,
    position: card.position,
    active: card.active,
  }
}
