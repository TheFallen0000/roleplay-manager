import type { CharacterVersionDTO } from "@workspace/shared/types/character"
import type { LorebookDTO } from "@workspace/shared/types/sillytavern-card"

import type { CharacterCardFieldValues } from "./character-card-fields"
import type {
  LorebookEditorEntry,
  LorebookEditorValue,
} from "./lorebook-editor"

export function emptyLorebook(): LorebookEditorValue {
  return { name: "", entries: [] }
}

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

function toEditorEntry(
  entry: LorebookDTO["entries"][number],
): LorebookEditorEntry {
  return {
    id: entry.id,
    name: entry.name ?? "",
    keys: entry.keys,
    content: entry.content,
    secondaryKeys: entry.secondaryKeys,
    constant: entry.constant,
    selective: entry.selective,
    selectiveLogic: entry.selectiveLogic,
    insertionOrder: entry.insertionOrder,
    position: entry.position,
    priority: entry.priority,
    enabled: entry.enabled,
    caseSensitive: entry.caseSensitive,
    wholeWords: entry.wholeWords,
    comment: entry.comment,
    rawPosition: entry.rawPosition,
  }
}

export function lorebookToEditorValue(
  lorebook: LorebookDTO,
): LorebookEditorValue {
  return {
    name: lorebook.name ?? "",
    entries: lorebook.entries.map(toEditorEntry),
  }
}

export function serializeLorebook(lorebook: LorebookEditorValue): string {
  return JSON.stringify({
    spec: "lorebook_v3",
    data: {
      name: lorebook.name || null,
      description: null,
      scan_depth: 4,
      token_budget: 400,
      recursive_scanning: false,
      extensions: {},
      entries: lorebook.entries.map((entry) => ({
        keys: entry.keys,
        secondary_keys: entry.secondaryKeys,
        content: entry.content,
        enabled: entry.enabled,
        insertion_order: entry.insertionOrder,
        case_sensitive: entry.caseSensitive,
        constant: entry.constant,
        selective: entry.selective,
        selectiveLogic: entry.selectiveLogic,
        position: entry.position,
        priority: entry.priority,
        comment: entry.comment,
        name: entry.name || null,
        whole_words: entry.wholeWords,
        ...(entry.rawPosition ? { raw_position: entry.rawPosition } : {}),
      })),
    },
  })
}
