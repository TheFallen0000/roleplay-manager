import type { LorebookEditorValue } from "./lorebook-editor"

export interface FormSnapshot {
  name: string
  subtitle: string | null
  profileImageAssetId: string | null
  description: string
  instructions: string | null
  greeting: string
  cards: { title: string; content: string; active: boolean }[]
  card?: string
  lorebook?: string
}

export interface CardSnapshotFields {
  personality: string
  scenario: string
  mesExample: string
  alternateGreetings: string[]
  creatorNotes: string
  tags: string[]
  creator: string
  cardCharacterVersion: string
  gender: string
  pronouns: string
  tagline: string
  systemPrompt: string
  postHistoryInstructions: string
  extensions: unknown
  unknownFields: unknown
  unknownRootFields: unknown
}

export function buildCardSnapshot(fields: CardSnapshotFields): string {
  return JSON.stringify({
    personality: fields.personality.trim(),
    scenario: fields.scenario.trim(),
    mesExample: fields.mesExample.trim(),
    alternateGreetings: fields.alternateGreetings,
    creatorNotes: fields.creatorNotes.trim(),
    tags: fields.tags,
    creator: fields.creator.trim(),
    cardCharacterVersion: fields.cardCharacterVersion.trim(),
    gender: fields.gender.trim(),
    pronouns: fields.pronouns.trim(),
    tagline: fields.tagline.trim(),
    systemPrompt: fields.systemPrompt.trim(),
    postHistoryInstructions: fields.postHistoryInstructions.trim(),
    extensions: fields.extensions ?? null,
    unknownFields: fields.unknownFields ?? null,
    unknownRootFields: fields.unknownRootFields ?? null,
  })
}

export function buildLorebookSnapshot(lorebook: LorebookEditorValue): string {
  return JSON.stringify({
    name: lorebook.name.trim(),
    entries: lorebook.entries.map((entry) => ({
      name: entry.name,
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
      rawPosition: entry.rawPosition ?? null,
    })),
  })
}

export function buildSnapshot(
  name: string,
  subtitle: string | null | undefined,
  profileImageAssetId: string | null,
  description: string,
  instructions: string | null | undefined,
  greeting: string,
  cards: { title: string; content: string; active: boolean }[],
  card?: string,
  lorebook?: string,
): FormSnapshot {
  const snapshot: FormSnapshot = {
    name: name.trim(),
    subtitle: (subtitle ?? "").trim() || null,
    profileImageAssetId,
    description: description.trim(),
    instructions: (instructions ?? "").trim() || null,
    greeting: greeting.trim(),
    cards: cards.map((c) => ({
      title: c.title.trim(),
      content: c.content.trim(),
      active: c.active,
    })),
  }
  if (card !== undefined) snapshot.card = card
  if (lorebook !== undefined) snapshot.lorebook = lorebook
  return snapshot
}

export function hasChanges(
  current: FormSnapshot,
  previous: FormSnapshot,
): boolean {
  if (current.name !== previous.name) return true
  if (current.subtitle !== previous.subtitle) return true
  if (current.profileImageAssetId !== previous.profileImageAssetId) return true
  if (current.description !== previous.description) return true
  if (current.instructions !== previous.instructions) return true
  if (current.greeting !== previous.greeting) return true
  if (current.card !== previous.card) return true
  if (current.lorebook !== previous.lorebook) return true
  if (current.cards.length !== previous.cards.length) return true
  return current.cards.some((c, i) => {
    const orig = previous.cards[i]
    return !orig || c.title !== orig.title || c.content !== orig.content || c.active !== orig.active
  })
}
