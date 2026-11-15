import { v7 as randomUUIDv7 } from "uuid"

import type { LorebookDTO } from "@workspace/shared/types/sillytavern-card"

import { LorebookEntry } from "../../../../domain/entities/lorebook-entry.entity"
import { Lorebook } from "../../../../domain/entities/lorebook.entity"
import { LorebookVersion } from "../../../../domain/entities/lorebook-version.entity"
import type { LorebookRepository } from "../../../../domain/ports/lorebook.repository"

import type { CreateLorebookRequest } from "./lorebook.input"
import {
  serializeLorebookEntries,
  toLorebookCanonicalContent,
  toLorebookDTO,
} from "./lorebook.mapper"
import {
  canonicalizeLorebookContent,
  computeLorebookSourceKey,
} from "./source-key"

export interface CreateLorebookDeps {
  lorebookRepository: LorebookRepository
}

export class CreateLorebookUseCase {
  constructor(private readonly deps: CreateLorebookDeps) {}

  async execute(input: CreateLorebookRequest): Promise<LorebookDTO> {
    const now = new Date()
    const book = Lorebook.create({
      id: randomUUIDv7(),
      characterId: null,
      name: input.name,
      description: input.description ?? null,
      scanDepth: input.scanDepth ?? 4,
      tokenBudget: input.tokenBudget ?? 400,
      recursiveScanning: input.recursiveScanning ?? false,
      createdAt: now,
      updatedAt: now,
    })

    const entries = (input.entries ?? []).map((entry, order) =>
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

    const version = LorebookVersion.create({
      id: randomUUIDv7(),
      lorebookId: book.id,
      versionNumber: 1,
      name: book.name,
      description: book.description,
      scanDepth: book.scanDepth,
      tokenBudget: book.tokenBudget,
      recursiveScanning: book.recursiveScanning,
      entriesJson: serializeLorebookEntries(entries),
      sourceKey: computeLorebookSourceKey(
        canonicalizeLorebookContent(toLorebookCanonicalContent(book, entries)),
      ),
      createdAt: now,
    })

    const saved = await this.deps.lorebookRepository.createContainerWithVersion(
      book,
      entries,
      version,
    )

    return toLorebookDTO(
      saved.book,
      saved.entries,
      saved.version.versionNumber,
    )
  }
}
