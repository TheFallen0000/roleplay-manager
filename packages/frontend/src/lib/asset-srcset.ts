import {
  CHARACTER_ASSET_VARIANTS_BY_USAGE,
  getCharacterAssetVariantWidth,
  type CharacterAssetUsage,
} from "@workspace/shared/types/image"

import { getCharacterAssetUrl } from "./api/client"

/**
 * Builds a truthful `srcset` for an asset: one candidate per distinct width
 * the processor can generate (never upscaled beyond the original).
 */
export function createAssetSrcSet(
  characterId: string,
  assetId: string,
  originalWidth: number,
  usage: CharacterAssetUsage,
): string {
  const candidates = new Map<number, string>()
  for (const variant of CHARACTER_ASSET_VARIANTS_BY_USAGE[usage]) {
    const width = getCharacterAssetVariantWidth(originalWidth, variant)
    if (!candidates.has(width)) {
      candidates.set(
        width,
        `${getCharacterAssetUrl(characterId, assetId, variant)} ${width}w`,
      )
    }
  }
  return [...candidates.values()].join(", ")
}
