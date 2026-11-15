import { v7 as randomUUIDv7 } from "uuid"

import type { LorebookDTO } from "@workspace/shared/types/sillytavern-card"

import {
  LorebookEntry,
  type LorebookEntryProps,
} from "../../../../domain/entities/lorebook-entry.entity"
import {
  Lorebook,
  type LorebookProps,
} from "../../../../domain/entities/lorebook.entity"
import { DomainError } from "../../../../domain/errors"
import type { LorebookRepository } from "../../../../domain/ports/lorebook.repository"

import type { UpdateLorebookRequest } from "./lorebook.input"
import { toLorebookDTO } from "./lorebook.mapper"

export interface UpdateLorebookByIdDeps {
  lorebookRepository: LorebookRepository
}

export interface UpdateLorebookByIdInput extends UpdateLorebookRequest {
  id: string
}

export interface UpdateLorebookByIdResult {
  lorebook: LorebookDTO
  createdNewVersion: boolean
}

type SettingsOverrides = Pick<
  UpdateLorebookRequest,
  "name" | "description" | "scanDepth" | "tokenBudget" | "recursiveScanning"
>

const settingsFrom = (input: UpdateLorebookByIdInput): SettingsOverrides => {
  const overrides: SettingsOverrides = {}
  if (input.name !== undefined) overrides.name = input.name
  if (input.description !== undefined) overrides.description = input.description
  if (input.scanDepth !== undefined) overrides.scanDepth = input.scanDepth
  if (input.tokenBudget !== undefined) overrides.tokenBudget = input.tokenBudget
  if (input.recursiveScanning !== undefined) {
    overrides.recursiveScanning = input.recursiveScanning
  }
  return overrides
}

export class UpdateLorebookByIdUseCase {
  constructor(private readonly deps: UpdateLorebookByIdDeps) {}

  async execute(
    input: UpdateLorebookByIdInput,
  ): Promise<UpdateLorebookByIdResult> {
    const found = await this.deps.lorebookRepository.findById(input.id)
    if (!found || found.book.deletedAt !== null) {
      throw new DomainError(
        "LOREBOOK_NOT_FOUND",
        `Lorebook with id '${input.id}' not found.`,
        404,
      )
    }

    const book = Lorebook.reconstruct(
      found.book as unknown as LorebookProps,
    ).withSettings(settingsFrom(input))

    const now = new Date()
    const entries = input.entries === undefined
      ? found.entries.map((entry) =>
          LorebookEntry.reconstruct(entry as unknown as LorebookEntryProps),
        )
      : input.entries.map((entry, order) =>
          LorebookEntry.create({
            id: randomUUIDv7(),
            lorebookId: book.id,
            name: entry.name ?? null,
            sourceId: entry.sourceId ?? null,
            keys: entry.keys,
            secondaryKeys: entry.secondaryKeys ?? [],
            comment: entry.comment ?? null,
            content: entry.content,
            constant: entry.constant ?? false,
            selective: entry.selective ?? false,
            selectiveLogic: entry.selectiveLogic ?? 0,
            insertionOrder: entry.insertionOrder ?? 100,
            position: entry.position ?? "after_char",
            priority: entry.priority ?? 0,
            enabled: entry.enabled ?? true,
            caseSensitive: entry.caseSensitive ?? false,
            wholeWords: entry.wholeWords ?? false,
            order,
            createdAt: now,
            updatedAt: now,
          }),
        )

    const saved = await this.deps.lorebookRepository.saveLiveHeadAndVersion(
      book,
      entries,
    )

    const currentVersionNumber = saved.version?.versionNumber
      ?? (saved.book.currentVersionId
        ? (await this.deps.lorebookRepository.findVersionById(
            saved.book.currentVersionId,
          ))?.versionNumber ?? null
        : null)

    return {
      lorebook: toLorebookDTO(saved.book, saved.entries, currentVersionNumber),
      createdNewVersion: saved.createdNewVersion,
    }
  }
}
