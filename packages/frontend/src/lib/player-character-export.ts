import {
  PLAYER_CHARACTER_EXPORT_KIND,
  PLAYER_CHARACTER_EXPORT_SCHEMA_VERSION,
  type PlayerCharacterExport,
} from "@workspace/shared/types/export"
import type { PlayerCharacterDTO } from "@workspace/shared/types/player-character"

/** Slug for file names (same shape the character export uses). */
const slugify = (value: string, fallback: string): string => {
  const slug = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
  return slug || fallback
}

export const buildPlayerCharacterExport = (
  playerCharacter: Pick<PlayerCharacterDTO, "name" | "description">,
  exportedAt: Date = new Date(),
): PlayerCharacterExport => ({
  schemaVersion: PLAYER_CHARACTER_EXPORT_SCHEMA_VERSION,
  kind: PLAYER_CHARACTER_EXPORT_KIND,
  exportedAt: exportedAt.toISOString(),
  playerCharacter: {
    name: playerCharacter.name.trim(),
    description: playerCharacter.description.trim(),
  },
})

export const playerCharacterExportFilename = (
  name: string,
  fallback: string,
  date: Date = new Date(),
): string =>
  `${fallback}-${slugify(name, fallback)}-${date.toISOString().slice(0, 10)}.json`
