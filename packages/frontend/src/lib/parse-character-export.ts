import type { CharacterExport } from "@workspace/shared/types/export"
import {
  EXPORT_KIND,
  EXPORT_SCHEMA_VERSION,
} from "@workspace/shared/types/export"
import {
  DEFAULT_LOCALE,
  translate,
  type Locale,
  type TranslationParams,
} from "@workspace/shared/i18n"

export type ParseCharacterExportResult =
  | { ok: true; payload: CharacterExport }
  | { ok: false; error: string }

export function parseCharacterExport(
  text: string,
  locale: Locale = DEFAULT_LOCALE,
): ParseCharacterExportResult {
  const tr = (key: string, params?: TranslationParams) =>
    translate(locale, key, params)

  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    return { ok: false, error: tr("characters.importInvalidJson") }
  }

  if (!data || typeof data !== "object") {
    return { ok: false, error: tr("characters.importInvalidObject") }
  }

  const payload = data as Partial<CharacterExport>

  if (payload.kind !== EXPORT_KIND) {
    return {
      ok: false,
      error: tr("characters.importIncompatible"),
    }
  }

  if (payload.schemaVersion !== EXPORT_SCHEMA_VERSION) {
    return {
      ok: false,
      error: tr("characters.importUnsupportedVersion", {
        version: payload.schemaVersion ?? tr("characters.unknownVersion"),
        expected: EXPORT_SCHEMA_VERSION,
      }),
    }
  }

  if (!payload.character?.name) {
    return { ok: false, error: tr("characters.importMissingName") }
  }

  if (!payload.definition && (!payload.versions || payload.versions.length === 0)) {
    return {
      ok: false,
      error: tr("characters.importMissingDefinition"),
    }
  }

  return { ok: true, payload: payload as CharacterExport }
}
