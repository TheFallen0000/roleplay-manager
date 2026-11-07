import type {
  LorebookEntryDTO,
  UpdateLorebookEntryInput as SharedUpdateLorebookEntryInput,
} from "@workspace/shared/types/sillytavern-card"

import {
  LorebookEntry,
  type LorebookEntry as LorebookEntryEntity,
  type LorebookEntryPosition,
  type LorebookEntryProps,
  type LorebookSelectiveLogic,
} from "../../../../domain/entities/lorebook-entry.entity"
import { DomainError } from "../../../../domain/errors"
import type { LorebookRepository } from "../../../../domain/ports/lorebook.repository"

import { toLorebookEntryDTO } from "./lorebook.mapper"

export interface UpdateLorebookEntryDeps {
  lorebookRepository: LorebookRepository
}

export interface UpdateLorebookEntryInput
  extends SharedUpdateLorebookEntryInput {
  characterId: string
  entryId: string
  name?: string | null
  sourceId?: string | null
}

type EntryChanges = Partial<{
  name: string | null
  sourceId: string | null
  keys: string[]
  secondaryKeys: string[]
  comment: string | null
  content: string
  constant: boolean
  selective: boolean
  selectiveLogic: LorebookSelectiveLogic
  insertionOrder: number
  position: LorebookEntryPosition
  priority: number
  enabled: boolean
  caseSensitive: boolean
  wholeWords: boolean
}>

const changesFrom = (input: UpdateLorebookEntryInput): EntryChanges => {
  const changes: EntryChanges = {}
  const keys: Array<keyof EntryChanges> = [
    "name",
    "sourceId",
    "keys",
    "secondaryKeys",
    "comment",
    "content",
    "constant",
    "selective",
    "selectiveLogic",
    "insertionOrder",
    "position",
    "priority",
    "enabled",
    "caseSensitive",
    "wholeWords",
  ]
  for (const key of keys) {
    if (input[key] !== undefined) {
      ;(changes as Record<string, unknown>)[key] = input[key]
    }
  }
  return changes
}

const applyChanges = (
  entry: LorebookEntryEntity,
  changes: EntryChanges,
): LorebookEntryEntity => {
  const candidate = entry as unknown as LorebookEntryEntity & {
    withChanges?: (next: EntryChanges) => LorebookEntryEntity
  }
  if (typeof candidate.withChanges === "function") {
    return candidate.withChanges(changes)
  }
  return LorebookEntry.reconstruct({
    ...(entry as unknown as LorebookEntryProps),
    ...changes,
    updatedAt: new Date(),
  })
}

export class UpdateLorebookEntryUseCase {
  constructor(private readonly deps: UpdateLorebookEntryDeps) {}

  async execute(input: UpdateLorebookEntryInput): Promise<LorebookEntryDTO> {
    const existing = await this.deps.lorebookRepository.findByCharacterId(
      input.characterId,
    )
    const entry = existing?.entries.find(
      (item) => item.id === input.entryId,
    )
    if (!entry) {
      throw new DomainError(
        "LOREBOOK_NOT_FOUND",
        "The lorebook entry does not exist.",
        404,
      )
    }

    const updated = applyChanges(entry, changesFrom(input))
    await this.deps.lorebookRepository.updateEntry(updated)
    return toLorebookEntryDTO(updated)
  }
}
