import type {
  CharacterCardEnvelope,
  SillyTavernCardExportSpec,
} from "@workspace/shared/types/sillytavern-card"
import { projectCardToV2 } from "@workspace/shared/lib/sillytavern-card"

import {
  CharacterNotFoundError,
  CharacterVersionNotFoundError,
} from "../../../domain/errors"
import type { CharacterRepository } from "../../../domain/ports/character.repository"
import type { LorebookRepository } from "../../../domain/ports/lorebook.repository"

import { isRecord } from "./lorebook/lorebook.mapper"
import {
  lorebookVersionToCardLorebook,
  versionFieldsToCardData,
} from "./sillytavern-card.mapper"

export interface GetCharacterCardDeps {
  characterRepository: CharacterRepository
  lorebookRepository: LorebookRepository
}

export interface GetCharacterCardInput {
  characterId: string
  spec: SillyTavernCardExportSpec
  versionId?: string
}

export class GetCharacterCardUseCase {
  constructor(private readonly deps: GetCharacterCardDeps) {}

  async execute(input: GetCharacterCardInput): Promise<CharacterCardEnvelope> {
    const found = await this.deps.characterRepository.findById(input.characterId)
    if (!found) throw new CharacterNotFoundError(input.characterId)

    const version = input.versionId
      ? await this.resolveVersion(input.characterId, input.versionId)
      : found.currentVersion

    const linkedVersion = version.lorebookVersionId
      ? await this.deps.lorebookRepository.findVersionById(
          version.lorebookVersionId,
        )
      : null
    const lorebook = linkedVersion
      ? lorebookVersionToCardLorebook(linkedVersion)
      : null

    const data = versionFieldsToCardData(version, lorebook)
    const rootExtras = isRecord(version.unknownRootFields)
      ? version.unknownRootFields
      : {}

    if (input.spec === "v2") {
      return {
        ...rootExtras,
        spec: "chara_card_v2",
        spec_version: "2.0",
        data: projectCardToV2(data),
      }
    }

    return {
      ...rootExtras,
      spec: "chara_card_v3",
      spec_version: "3.0",
      data,
    }
  }

  private async resolveVersion(characterId: string, versionId: string) {
    const version = await this.deps.characterRepository.findVersionById(versionId)
    if (!version || version.characterId !== characterId) {
      throw new CharacterVersionNotFoundError(versionId)
    }
    return version
  }
}
