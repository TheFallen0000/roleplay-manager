/**
 * Deterministic lorebook fixtures shared by the S134 backend tests.
 *
 * Pure builders only: no database, no network and no timers. Tests that need
 * persisted rows seed them through the Drizzle repository in their own file.
 */

import {
  Lorebook,
  type LorebookProps,
} from "../domain/entities/lorebook.entity"
import {
  LorebookEntry,
  type LorebookEntryProps,
} from "../domain/entities/lorebook-entry.entity"
import {
  LorebookVersion,
  type LorebookVersionProps,
} from "../domain/entities/lorebook-version.entity"
import {
  buildCCv3Entry,
  buildLorebookCCv3,
  buildLorebookStNativeObject,
  buildStNativeEntry,
} from "./sillytavern-fixtures"

export const LOREBOOK_FIXTURE_NOW = new Date("2026-11-20T12:00:00.000Z")

export const buildLorebookEntity = (
  overrides: Partial<LorebookProps> = {},
): Lorebook =>
  Lorebook.create({
    id: "book-1",
    name: "Forest lore",
    description: "Facts about the forest",
    scanDepth: 4,
    tokenBudget: 400,
    recursiveScanning: false,
    extensions: {},
    unknownFields: null,
    createdAt: LOREBOOK_FIXTURE_NOW,
    updatedAt: LOREBOOK_FIXTURE_NOW,
    ...overrides,
  })

export const buildLorebookEntryEntity = (
  overrides: Partial<LorebookEntryProps> = {},
): LorebookEntry =>
  LorebookEntry.create({
    id: "entry-1",
    lorebookId: "book-1",
    name: "Dragon lore",
    sourceId: "1",
    keys: ["dragon"],
    secondaryKeys: [],
    comment: "Dragon lore",
    content: "Dragons dwell in the northern mountains.",
    constant: false,
    selective: false,
    selectiveLogic: 0,
    insertionOrder: 100,
    position: "after_char",
    rawPosition: "1",
    priority: 0,
    enabled: true,
    caseSensitive: false,
    wholeWords: false,
    order: 0,
    extensions: {},
    unknownFields: null,
    createdAt: LOREBOOK_FIXTURE_NOW,
    updatedAt: LOREBOOK_FIXTURE_NOW,
    ...overrides,
  })

export const buildLorebookVersionEntity = (
  overrides: Partial<LorebookVersionProps> = {},
): LorebookVersion =>
  LorebookVersion.create({
    id: "version-1",
    lorebookId: "book-1",
    versionNumber: 1,
    name: "Forest lore",
    description: "Facts about the forest",
    scanDepth: 4,
    tokenBudget: 400,
    recursiveScanning: false,
    entriesJson: JSON.stringify([
      {
        sourceId: "1",
        keys: ["dragon"],
        content: "Dragons dwell in the northern mountains.",
      },
    ]),
    sourceKey: "a".repeat(64),
    createdAt: LOREBOOK_FIXTURE_NOW,
    ...overrides,
  })

export interface ImportPayloadOptions {
  originId?: string
  name?: string
  content?: string
}

export const buildCCv3ImportPayload = (
  options: ImportPayloadOptions = {},
): string => {
  const data: Record<string, unknown> = {
    name: options.name ?? "Forest lore",
  }
  if (options.originId) {
    data.extensions = { rm: { version: 1, originId: options.originId } }
  }

  return JSON.stringify(
    buildLorebookCCv3(
      [
        buildCCv3Entry({
          content:
            options.content ?? "Dragons dwell in the northern mountains.",
        }),
      ],
      data,
    ),
  )
}

export const buildStNativeImportPayload = (
  options: ImportPayloadOptions = {},
): string => {
  const container = buildLorebookStNativeObject([
    buildStNativeEntry({
      content: options.content ?? "Dragons dwell in the northern mountains.",
    }),
  ])

  return JSON.stringify({
    ...container,
    name: options.name ?? "Forest lore",
    ...(options.originId
      ? { extensions: { rm: { version: 1, originId: options.originId } } }
      : {}),
  })
}
