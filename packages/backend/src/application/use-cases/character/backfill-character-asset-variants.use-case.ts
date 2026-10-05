import type {
  CharacterAssetMaintenanceRepository,
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
}
