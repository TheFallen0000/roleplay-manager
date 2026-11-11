import { v7 as randomUUIDv7 } from "uuid"

import type { LorebookDTO } from "@workspace/shared/types/sillytavern-card"

import { Lorebook } from "../../../../domain/entities/lorebook.entity"
import type { LorebookRepository } from "../../../../domain/ports/lorebook.repository"

import { toLorebookDTO } from "./lorebook.mapper"

export interface UpdateLorebookDeps {
  lorebookRepository: LorebookRepository
}

export interface UpdateLorebookInput {
  characterId: string
  name?: string | null
  description?: string | null
  scanDepth?: number
  tokenBudget?: number
  recursiveScanning?: boolean
}

type SettingsOverrides = Pick<
  UpdateLorebookInput,
  "name" | "description" | "scanDepth" | "tokenBudget" | "recursiveScanning"
>

const settingsFrom = (input: UpdateLorebookInput): SettingsOverrides => {
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

export class UpdateLorebookUseCase {
  constructor(private readonly deps: UpdateLorebookDeps) {}

  async execute(input: UpdateLorebookInput): Promise<LorebookDTO> {
    const existing = await this.deps.lorebookRepository.findByCharacterId(
      input.characterId,
    )
    const overrides = settingsFrom(input)

    const book = existing
      ? existing.book.withSettings(overrides)
      : Lorebook.create({
          id: randomUUIDv7(),
          characterId: input.characterId,
          ...overrides,
        })

    const saved = await this.deps.lorebookRepository.upsertBook(book)
    return toLorebookDTO(saved, existing?.entries ?? [])
  }
}
