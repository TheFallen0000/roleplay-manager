import type { CharacterVersionDTO } from "@workspace/shared/types/character"

import { CharacterNotFoundError, DomainError } from "../../../../domain/errors"
import type { CharacterRepository } from "../../../../domain/ports/character.repository"
import type { LorebookRepository } from "../../../../domain/ports/lorebook.repository"
import type { UpdateCharacterUseCase } from "../update-character.use-case"

export interface LinkLorebookDeps {
  lorebookRepository: LorebookRepository
  characterRepository: CharacterRepository
  updateCharacter: UpdateCharacterUseCase
}

export interface LinkLorebookInput {
  lorebookId: string
  characterId: string
  versionId?: string
}

export class LinkLorebookUseCase {
  constructor(private readonly deps: LinkLorebookDeps) {}

  async execute(input: LinkLorebookInput): Promise<CharacterVersionDTO> {
    const found = await this.deps.lorebookRepository.findById(input.lorebookId)
    if (!found || found.book.deletedAt !== null) {
      throw new DomainError(
        "LOREBOOK_NOT_FOUND",
        `Lorebook with id '${input.lorebookId}' not found.`,
        404,
      )
    }

    const targetVersionId = input.versionId ?? found.book.currentVersionId
    if (!targetVersionId) {
      throw new DomainError(
        "LOREBOOK_VERSION_NOT_FOUND",
        `Lorebook '${input.lorebookId}' does not have a current version.`,
        404,
      )
    }

    const version = await this.deps.lorebookRepository.findVersionById(
      targetVersionId,
    )
    if (!version || version.lorebookId !== found.book.id) {
      throw new DomainError(
        "LOREBOOK_VERSION_NOT_FOUND",
        `Lorebook version with id '${targetVersionId}' not found.`,
        404,
      )
    }

    const existing = await this.deps.characterRepository.findById(
      input.characterId,
    )
    if (!existing) {
      throw new CharacterNotFoundError(input.characterId)
    }

    if (existing.currentVersion.lorebookVersionId === version.id) {
      throw new DomainError(
        "LOREBOOK_LINK_UNCHANGED",
        `Character '${input.characterId}' already uses lorebook version '${version.id}'.`,
        409,
      )
    }

    const detail = await this.deps.updateCharacter.execute(input.characterId, {
      lorebookVersionId: version.id,
    })

    return detail.currentVersion
  }
}
