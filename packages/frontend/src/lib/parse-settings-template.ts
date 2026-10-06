import type { CharacterExport, ExportSettings } from "@workspace/shared/types/export"
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

export type ParseSettingsTemplateResult =
  | { ok: true; settings: Partial<ExportSettings> }
  | { ok: false; error: string }

/** Parses an exported settings template (`standaloneSettings`). */
export function parseSettingsTemplate(
  text: string,
  locale: Locale = DEFAULT_LOCALE,
): ParseSettingsTemplateResult {
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
    return { ok: false, error: tr("characters.importIncompatible") }
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

  if (
    !payload.standaloneSettings ||
    typeof payload.standaloneSettings !== "object"
  ) {
    return { ok: false, error: tr("characters.settingsMissingTemplate") }
  }

  return { ok: true, settings: payload.standaloneSettings }
}
