import type { CharacterSummary } from "@workspace/shared/types/character"

export type CharacterSortKey =
  | "recency-desc"
  | "recency-asc"
  | "activity-desc"
  | "activity-asc"

export const DEFAULT_CHARACTER_SORT: CharacterSortKey = "recency-desc"

function recencyValue(
  character: CharacterSummary,
  lastActivityByCharacter: Map<string, string>,
): number {
  const createdAt = new Date(character.createdAt).getTime()
  const activity = lastActivityByCharacter.get(character.id)
  return Math.max(createdAt, activity ? new Date(activity).getTime() : createdAt)
}

function activityValue(
  character: CharacterSummary,
  lastActivityByCharacter: Map<string, string>,
): number {
  const activity = lastActivityByCharacter.get(character.id)
  return activity
    ? new Date(activity).getTime()
    : new Date(character.createdAt).getTime()
}

export function sortCharacters(
  characters: CharacterSummary[],
  lastActivityByCharacter: Map<string, string>,
  key: CharacterSortKey = DEFAULT_CHARACTER_SORT,
): CharacterSummary[] {
  const direction = key.endsWith("asc") ? 1 : -1
  const valueOf = key.startsWith("activity")
    ? (character: CharacterSummary) =>
        activityValue(character, lastActivityByCharacter)
    : (character: CharacterSummary) =>
        recencyValue(character, lastActivityByCharacter)

  return characters.toSorted((a, b) => (valueOf(a) - valueOf(b)) * direction)
}
