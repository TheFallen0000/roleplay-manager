import type {
  SillyTavernCardExportSpec,
  SillyTavernCardFormat,
} from "@workspace/shared/types/sillytavern-card"
import { projectCardToV2 } from "@workspace/shared/lib/sillytavern-card"

import type { CharacterVersion } from "../../../domain/entities/character-version.entity"
import { CharacterNotFoundError } from "../../../domain/errors"
import type {
  CharacterAssetRepository,
  CharacterAssetStorage,
} from "../../../domain/ports/character-asset.repository"
import type { CardPngPort } from "../../../domain/ports/card-png.port"
import type { CharacterRepository } from "../../../domain/ports/character.repository"
import type { LorebookRepository } from "../../../domain/ports/lorebook.repository"

import {
  lorebookVersionToCardLorebook,
  versionFieldsToCardData,
} from "./sillytavern-card.mapper"
import { isRecord, type LorebookLike } from "./lorebook/lorebook.mapper"

export interface ExportSillyTavernCardDeps {
  characterRepository: CharacterRepository
  lorebookRepository: LorebookRepository
  cardPng: CardPngPort
  assetRepository?: CharacterAssetRepository
  assetStorage?: CharacterAssetStorage
}

export interface ExportSillyTavernCardInput {
  characterId: string
  format: SillyTavernCardFormat
  spec: SillyTavernCardExportSpec
}

export type ExportSillyTavernCardResult =
  | { format: "json"; body: Record<string, unknown> }
  | { format: "png"; body: Buffer }

export class ExportSillyTavernCardUseCase {
  constructor(private readonly deps: ExportSillyTavernCardDeps) {}

  async execute(
    input: ExportSillyTavernCardInput,
  ): Promise<ExportSillyTavernCardResult> {
    const found = await this.deps.characterRepository.findById(input.characterId)
    if (!found) throw new CharacterNotFoundError(input.characterId)
    const { currentVersion: version } = found

    const linkedVersion = version.lorebookVersionId
      ? await this.deps.lorebookRepository.findVersionById(
          version.lorebookVersionId,
        )
      : null
    const liveLorebook = linkedVersion
      ? null
      : await this.deps.lorebookRepository.findByCharacterId(input.characterId)

    const lorebook = linkedVersion
      ? lorebookVersionToCardLorebook(linkedVersion)
      : ((liveLorebook ?? null) as LorebookLike | null)

    const dataV3 = versionFieldsToCardData(version, lorebook)
    const rootExtras = isRecord(version.unknownRootFields)
      ? version.unknownRootFields
      : {}

    const envelopeV3: Record<string, unknown> = {
      ...rootExtras,
      spec: "chara_card_v3",
      spec_version: "3.0",
      data: dataV3,
    }
    const envelopeV2: Record<string, unknown> = {
      ...rootExtras,
      spec: "chara_card_v2",
      spec_version: "2.0",
      data: projectCardToV2(dataV3),
    }

    if (input.format === "json") {
      return {
        format: "json",
        body: input.spec === "v3" ? envelopeV3 : envelopeV2,
      }
    }

    const imagePng = await this.readProfilePng(version)
    return {
      format: "png",
      body: Buffer.from(
        this.deps.cardPng.build({
          charaJson: JSON.stringify(envelopeV2),
          ccv3Json: JSON.stringify(envelopeV3),
          imagePng,
        }),
      ),
    }
  }

  private async readProfilePng(
    version: CharacterVersion,
  ): Promise<Buffer | null> {
    const assetId = version.profileImageAssetId
    const { assetRepository, assetStorage } = this.deps
    if (!assetId || !assetRepository || !assetStorage) return null

    try {
      const asset = await assetRepository.findById(assetId)
      if (!asset || asset.mimeType !== "image/png") return null
      const stream = await assetStorage.read(
        asset.characterId,
        asset.id,
        asset.extension,
      )
      const chunks: Buffer[] = []
      for await (const chunk of stream) {
        chunks.push(Buffer.from(chunk))
      }
      return Buffer.concat(chunks)
    } catch {
      return null
    }
  }
}
