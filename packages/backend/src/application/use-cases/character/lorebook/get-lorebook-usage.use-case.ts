import type {
  LorebookUsageDTO,
  LorebookUsageVersion,
} from "@workspace/shared/types/lorebook"

import { DomainError } from "../../../../domain/errors"
import type {
  CharacterVersionNumber,
  LorebookRepository,
  LorebookUsageRow,
} from "../../../../domain/ports/lorebook.repository"

export interface GetLorebookUsageDeps {
  lorebookRepository: LorebookRepository
}

export interface GetLorebookUsageInput {
  lorebookId: string
  versionId?: string
}

interface CharacterUsage {
  characterId: string
  characterName: string
  inUse: LorebookUsageVersion[]
  history: LorebookUsageVersion[]
}

const byCharacterName = (
  left: CharacterUsage,
  right: CharacterUsage,
): number => left.characterName.localeCompare(right.characterName)

const byCharacterVersionDescending = (
  left: LorebookUsageVersion,
  right: LorebookUsageVersion,
): number => right.characterVersionNumber - left.characterVersionNumber

export class GetLorebookUsageUseCase {
  constructor(private readonly deps: GetLorebookUsageDeps) {}

  async execute(input: GetLorebookUsageInput): Promise<LorebookUsageDTO> {
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

    const selected = await this.deps.lorebookRepository.findVersionById(
      targetVersionId,
    )
    if (!selected || selected.lorebookId !== found.book.id) {
      throw new DomainError(
        "LOREBOOK_VERSION_NOT_FOUND",
        `Lorebook version with id '${targetVersionId}' not found.`,
        404,
      )
    }

    const rows = await this.deps.lorebookRepository.findUsageVersions(
      input.lorebookId,
    )
    const currentVersions = await this.loadCurrentVersions(rows)
    const characters = new Map<string, CharacterUsage>()

    for (const row of rows) {
      if (row.lorebookVersionNumber > selected.versionNumber) continue

      const usage = characters.get(row.characterId) ?? {
        characterId: row.characterId,
        characterName: row.characterName,
        inUse: [],
        history: [],
      }
      const version = this.toUsageVersion(row, currentVersions)
      if (row.lorebookVersionNumber === selected.versionNumber) {
        usage.inUse.push(version)
      } else {
        usage.history.push(version)
      }
      characters.set(row.characterId, usage)
    }

    const grouped = [...characters.values()]
      .map((usage) => ({
        ...usage,
        inUse: usage.inUse.sort(byCharacterVersionDescending),
        history: usage.history.sort(byCharacterVersionDescending),
      }))
      .sort(byCharacterName)

    return { characters: grouped }
  }

  private async loadCurrentVersions(
    rows: LorebookUsageRow[],
  ): Promise<Map<string, number>> {
    const characterIds = [...new Set(rows.map((row) => row.characterId))]
    if (characterIds.length === 0) return new Map()

    const current: CharacterVersionNumber[] =
      await this.deps.lorebookRepository.findCurrentCharacterVersionNumbers(
        characterIds,
      )

    return new Map(
      current.map((item) => [item.characterId, item.versionNumber]),
    )
  }

  private toUsageVersion(
    row: LorebookUsageRow,
    currentVersions: Map<string, number>,
  ): LorebookUsageVersion {
    return {
      characterVersionId: row.characterVersionId,
      characterVersionNumber: row.characterVersionNumber,
      isCurrentCharacterVersion:
        currentVersions.get(row.characterId) === row.characterVersionNumber,
      lorebookVersionNumber: row.lorebookVersionNumber,
    }
  }
}
