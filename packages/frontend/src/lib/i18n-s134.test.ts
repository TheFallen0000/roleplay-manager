import { describe, expect, it } from "vitest"

import { en, es } from "@workspace/shared/i18n"

const dictionaries = { en, es }

const newLorebookKeys = [
  "restoreVersion",
  "restoreHint",
  "inUseBy",
  "history",
  "linkToCharacter",
  "linkCreatesVersion",
  "linked",
  "linkUnchanged",
  "delete",
  "deleteTitle",
  "deleteWarning",
  "deleted",
  "import",
  "importPreview",
  "restoreHistory",
  "createNewBook",
  "createNewVersion",
  "reuse",
  "usageCharactersVersions",
  "exportVersion",
  "versionRestored",
]

const newGreetingKeys = [
  "greetingPickerTitle",
  "greetingPickerFirstMes",
  "greetingPickerAlternate",
  "greetingPickerConfirm",
]

const obsoleteKeys = [
  "lorebooks.linkDeferredTitle",
  "lorebooks.linkDeferred",
  "lorebooks.versionsDeferred",
  "characters.tabCards",
]

const hasLeaf = (dictionary: unknown, path: string): boolean => {
  let node: unknown = dictionary
  for (const part of path.split(".")) {
    if (node === null || typeof node !== "object") return false
    node = (node as Record<string, unknown>)[part]
  }
  return typeof node === "string"
}

const missingKeys = (dictionary: unknown, paths: string[]) =>
  paths.filter((path) => !hasLeaf(dictionary, path))

describe.each(Object.entries(dictionaries))(
  "S134 i18n contract (%s)",
  (locale, dictionary) => {
    it(`defines every new lorebook key in ${locale}`, () => {
      expect(
        missingKeys(
          (dictionary as Record<string, unknown>).lorebooks,
          newLorebookKeys,
        ),
      ).toEqual([])
    })

    it(`defines every new greeting-picker key in ${locale}`, () => {
      expect(
        missingKeys(
          (dictionary as Record<string, unknown>).characters,
          newGreetingKeys,
        ),
      ).toEqual([])
    })

    it(`removes the S133 placeholders and the dead tabCards key in ${locale}`, () => {
      expect(
        obsoleteKeys.filter((path) => hasLeaf(dictionary, path)),
      ).toEqual([])
    })
  },
)
