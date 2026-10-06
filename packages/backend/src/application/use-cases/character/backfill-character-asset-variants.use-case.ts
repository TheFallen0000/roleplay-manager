import {
  CHARACTER_ASSET_VARIANTS,
  getCharacterAssetVariantFallbackOrder,
  type CharacterAssetVariant,
} from "@workspace/shared/types/image"

import type {
  CharacterAssetMaintenanceRepository,
  CharacterAssetMetadata,
  CharacterAssetVariantStorage,
} from "../../../domain/ports/character-asset.repository"
import type { CharacterAssetImageProcessor } from "../../../domain/ports/character-asset-image-processor"

export interface BackfillCharacterAssetVariantsInput {
  dryRun?: boolean
}

export interface BackfillCharacterAssetVariantsResult {
  total: number
  processed: number
  variantsToCreate: number
  variantsSkipped: number
  gifsSkipped: number
  originalBytes: number
  variantBytesToWrite: number
  failures: Array<{ assetId: string; error: string }>
}

export interface AssetVariantUsageEntry {
  assetId: string
  characterId: string
  mimeType: string
  originalBytes: number
  /** Size in bytes of every variant present on disk. */
  variantBytes: Partial<Record<CharacterAssetVariant, number>>
  missingVariants: CharacterAssetVariant[]
  /** What a character card would download today (requested `medium`). */
  cardVariant: CharacterAssetVariant | "original"
  cardBytes: number
  /** What a chat avatar would download today (requested `thumbnail`). */
  avatarVariant: CharacterAssetVariant | "original"
  avatarBytes: number
}

export interface BackfillCharacterAssetVariantsReport {
  total: number
  gifsSkipped: number
  failures: Array<{ assetId: string; error: string }>
  totals: {
    originalBytes: number
    cardBytes: number
    avatarBytes: number
    cardSavingsPercent: number
    avatarSavingsPercent: number
  }
  assets: AssetVariantUsageEntry[]
}

export class BackfillCharacterAssetVariantsUseCase {
  constructor(
    private readonly assetRepository: CharacterAssetMaintenanceRepository,
    private readonly assetStorage: CharacterAssetVariantStorage,
    private readonly imageProcessor: CharacterAssetImageProcessor,
  ) {}

  async execute(
    input: BackfillCharacterAssetVariantsInput = {},
  ): Promise<BackfillCharacterAssetVariantsResult> {
    const dryRun = input.dryRun ?? false
    const assets = await this.assetRepository.findAll()
    const result: BackfillCharacterAssetVariantsResult = {
      total: assets.length,
      processed: 0,
      variantsToCreate: 0,
      variantsSkipped: 0,
      gifsSkipped: 0,
      originalBytes: 0,
      variantBytesToWrite: 0,
      failures: [],
    }

    for (const asset of assets) {
      try {
        const stream = await this.assetStorage.read(
          asset.characterId,
          asset.id,
          asset.extension,
        )
        const chunks: Buffer[] = []
        for await (const chunk of stream) {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
        }
        const original = Buffer.concat(chunks)
        result.originalBytes += original.length
        const processed = await this.imageProcessor.process(
          original,
          asset.mimeType,
        )

        if (
          asset.width !== processed.width ||
          asset.height !== processed.height
        ) {
          if (!dryRun) {
            await this.assetRepository.updateDimensions(
              asset.id,
              processed.width,
              processed.height,
            )
          }
        }

        if (asset.mimeType === "image/gif") result.gifsSkipped += 1
        for (const variant of processed.variants) {
          if (
            await this.assetStorage.hasVariant(
              asset.characterId,
              asset.id,
              variant.variant,
            )
          ) {
            result.variantsSkipped += 1
            continue
          }
          if (!dryRun) {
            await this.assetStorage.writeVariant(
              asset.characterId,
              asset.id,
              variant.variant,
              variant.data,
            )
          }
          result.variantsToCreate += 1
          result.variantBytesToWrite += variant.data.length
        }
        result.processed += 1
      } catch (error) {
        result.failures.push({
          assetId: asset.id,
          error: error instanceof Error ? error.message : "Unknown error",
        })
      }
    }

    return result
  }

  /**
   * Measures what the API would actually deliver today for the two real
   * consumers (card and avatar) and how it compares to the original file.
   * It never writes files or metadata.
   */
  async report(): Promise<BackfillCharacterAssetVariantsReport> {
    const assets = await this.assetRepository.findAll()
    const report: BackfillCharacterAssetVariantsReport = {
      total: assets.length,
      gifsSkipped: 0,
      failures: [],
      totals: {
        originalBytes: 0,
        cardBytes: 0,
        avatarBytes: 0,
        cardSavingsPercent: 0,
        avatarSavingsPercent: 0,
      },
      assets: [],
    }

    for (const asset of assets) {
      try {
        if (asset.mimeType === "image/gif") report.gifsSkipped += 1

        const variantBytes: Partial<Record<CharacterAssetVariant, number>> = {}
        const missingVariants: CharacterAssetVariant[] = []
        for (const variant of CHARACTER_ASSET_VARIANTS) {
          const size = await this.assetStorage.variantSize(
            asset.characterId,
            asset.id,
            variant,
          )
          if (size === null) {
            missingVariants.push(variant)
          } else {
            variantBytes[variant] = size
          }
        }

        const card = await this.pickDeliveredBytes(asset, "medium")
        const avatar = await this.pickDeliveredBytes(asset, "thumbnail")

        report.assets.push({
          assetId: asset.id,
          characterId: asset.characterId,
          mimeType: asset.mimeType,
          originalBytes: asset.sizeBytes,
          variantBytes,
          missingVariants,
          cardVariant: card.variant,
          cardBytes: card.bytes,
          avatarVariant: avatar.variant,
          avatarBytes: avatar.bytes,
        })
        report.totals.originalBytes += asset.sizeBytes
        report.totals.cardBytes += card.bytes
        report.totals.avatarBytes += avatar.bytes
      } catch (error) {
        report.failures.push({
          assetId: asset.id,
          error: error instanceof Error ? error.message : "Unknown error",
        })
      }
    }

    report.totals.cardSavingsPercent = savingsPercent(
      report.totals.originalBytes,
      report.totals.cardBytes,
    )
    report.totals.avatarSavingsPercent = savingsPercent(
      report.totals.originalBytes,
      report.totals.avatarBytes,
    )

    return report
  }

  private async pickDeliveredBytes(
    asset: CharacterAssetMetadata,
    requested: CharacterAssetVariant,
  ): Promise<{ variant: CharacterAssetVariant | "original"; bytes: number }> {
    for (const candidate of getCharacterAssetVariantFallbackOrder(requested)) {
      const size = await this.assetStorage.variantSize(
        asset.characterId,
        asset.id,
        candidate,
      )
      if (size !== null) return { variant: candidate, bytes: size }
    }
    return { variant: "original", bytes: asset.sizeBytes }
  }
}

function savingsPercent(originalBytes: number, deliveredBytes: number): number {
  if (originalBytes <= 0) return 0
  return Math.round((1 - deliveredBytes / originalBytes) * 100)
}
