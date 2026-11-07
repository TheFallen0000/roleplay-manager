import { v7 as randomUUIDv7 } from "uuid"

import type {
  CreateLorebookEntryInput as SharedCreateLorebookEntryInput,
  LorebookEntryDTO,
} from "@workspace/shared/types/sillytavern-card"

import { LorebookEntry } from "../../../../domain/entities/lorebook-entry.entity"
import { DomainError } from "../../../../domain/errors"
import type { LorebookRepository } from "../../../../domain/ports/lorebook.repository"

import { toLorebookEntryDTO } from "./lorebook.mapper"

export interface CreateLorebookEntryDeps {
  lorebookRepository: LorebookRepository
}

export interface CreateLorebookEntryInput
  extends SharedCreateLorebookEntryInput {
  characterId: string
  name?: string | null
  sourceId?: string | null
}

export class CreateLorebookEntryUseCase {
  constructor(private readonly deps: CreateLorebookEntryDeps) {}

  async execute(input: CreateLorebookEntryInput): Promise<LorebookEntryDTO> {
    const existing = await this.deps.lorebookRepository.findByCharacterId(
      input.characterId,
    )
    if (!existing) {
      throw new DomainError(
        "LOREBOOK_NOT_FOUND",
        "The character does not have a lorebook.",
        404,
      )
    }

    const entry = LorebookEntry.create({
      id: randomUUIDv7(),
      lorebookId: existing.book.id,
      name: input.name ?? null,
      sourceId: input.sourceId ?? null,
      keys: input.keys,
      secondaryKeys: input.secondaryKeys ?? [],
      comment: input.comment ?? null,
      content: input.content,
      constant: input.constant ?? false,
      selective: input.selective ?? false,
      selectiveLogic: input.selectiveLogic ?? 0,
      insertionOrder: input.insertionOrder ?? 100,
      position: input.position ?? "after_char",
      priority: input.priority ?? 0,
      enabled: input.enabled ?? true,
      caseSensitive: input.caseSensitive ?? false,
      wholeWords: input.wholeWords ?? false,
      order: existing.entries.length,
    })

    await this.deps.lorebookRepository.createEntry(entry)
    return toLorebookEntryDTO(entry)
  }
}
