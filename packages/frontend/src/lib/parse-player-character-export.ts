import {
  PLAYER_CHARACTER_EXPORT_KIND,
  PLAYER_CHARACTER_EXPORT_SCHEMA_VERSION,
  type PlayerCharacterExport,
} from "@workspace/shared/types/export"
import {
  DEFAULT_LOCALE,
  translate,
  type Locale,
  type TranslationParams,
} from "@workspace/shared/i18n"

export type ParsePlayerCharacterExportResult =
  | { ok: true; payload: PlayerCharacterExport }
  | { ok: false; error: string }

export function parsePlayerCharacterExport(
  text: string,
  locale: Locale = DEFAULT_LOCALE,
): ParsePlayerCharacterExportResult {
  const tr = (key: string, params?: TranslationParams) =>
    translate(locale, key, params)

  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    return { ok: false, error: tr("players.importInvalidJson") }
  }

  if (!data || typeof data !== "object") {
    return { ok: false, error: tr("players.importInvalidObject") }
  }

  const payload = data as Partial<PlayerCharacterExport>

  if (payload.kind !== PLAYER_CHARACTER_EXPORT_KIND) {
    return { ok: false, error: tr("players.importIncompatible") }
  }

  if (payload.schemaVersion !== PLAYER_CHARACTER_EXPORT_SCHEMA_VERSION) {
    return {
      ok: false,
      error: tr("players.importUnsupportedVersion", {
        version: payload.schemaVersion ?? tr("players.unknownVersion"),
        expected: PLAYER_CHARACTER_EXPORT_SCHEMA_VERSION,
      }),
    }
  }

  if (!payload.playerCharacter?.name) {
    return { ok: false, error: tr("players.importMissingName") }
  }

  if (!payload.playerCharacter?.description) {
    return { ok: false, error: tr("players.importMissingDescription") }
  }

  return { ok: true, payload: payload as PlayerCharacterExport }
}
