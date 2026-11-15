import type { CharacterVersionDTO } from "@workspace/shared/types/character"

import type { CharacterCardFieldValues } from "./character-card-fields"

export function cardFieldsFromVersion(
  version?: CharacterVersionDTO,
): CharacterCardFieldValues {
  return {
    personality: version?.personality ?? "",
    scenario: version?.scenario ?? "",
    mesExample: version?.mesExample ?? "",
    alternateGreetings: version?.alternateGreetings ?? [],
    creatorNotes: version?.creatorNotes ?? "",
    tags: version?.tags ?? [],
    creator: version?.creator ?? "",
    cardCharacterVersion: version?.cardCharacterVersion ?? "",
    gender: version?.gender ?? "",
    pronouns: version?.pronouns ?? "",
    tagline: version?.tagline ?? "",
    systemPrompt: version?.systemPrompt ?? "",
    postHistoryInstructions: version?.postHistoryInstructions ?? "",
    extensions: version?.extensions ?? null,
    unknownFields: version?.unknownFields ?? null,
    unknownRootFields: version?.unknownRootFields ?? null,
  }
}

export function cardFieldsToInput(fields: CharacterCardFieldValues) {
  return {
    personality: fields.personality.trim() || null,
    scenario: fields.scenario.trim() || null,
    mesExample: fields.mesExample.trim() || null,
    alternateGreetings: fields.alternateGreetings,
    creatorNotes: fields.creatorNotes.trim() || null,
    tags: fields.tags,
    creator: fields.creator.trim() || null,
    cardCharacterVersion: fields.cardCharacterVersion.trim() || null,
    gender: fields.gender.trim() || null,
    pronouns: fields.pronouns.trim() || null,
    tagline: fields.tagline.trim() || null,
    systemPrompt: fields.systemPrompt.trim() || null,
    postHistoryInstructions: fields.postHistoryInstructions.trim() || null,
    extensions: fields.extensions,
    unknownFields: fields.unknownFields,
    unknownRootFields: fields.unknownRootFields,
  }
}
