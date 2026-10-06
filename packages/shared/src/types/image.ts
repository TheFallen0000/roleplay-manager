export const CHARACTER_ASSET_VARIANTS = [
  "thumbnail",
  "small",
  "medium",
] as const

export type CharacterAssetVariant = (typeof CHARACTER_ASSET_VARIANTS)[number]

/** Target maximum pixel width for each responsive variant. */
export const CHARACTER_ASSET_VARIANT_WIDTHS: Record<
  CharacterAssetVariant,
  number
> = {
  thumbnail: 128,
  small: 384,
  medium: 768,
}

export interface ImageDimensions {
  width: number
  height: number
}

export function isCharacterAssetVariant(
  value: unknown,
): value is CharacterAssetVariant {
  return (
    typeof value === "string" &&
    (CHARACTER_ASSET_VARIANTS as readonly string[]).includes(value)
  )
}

/** Width of a non-upscaled variant, used for truthful `srcset` descriptors. */
export function getCharacterAssetVariantWidth(
  originalWidth: number,
  variant: CharacterAssetVariant,
): number {
  return Math.min(originalWidth, CHARACTER_ASSET_VARIANT_WIDTHS[variant])
}

/**
 * Variants to try for a requested size, from the requested one down to the
 * smallest. The caller falls back to the original when none exists.
 */
export function getCharacterAssetVariantFallbackOrder(
  requested: CharacterAssetVariant,
): CharacterAssetVariant[] {
  const index = CHARACTER_ASSET_VARIANTS.indexOf(requested)
  return CHARACTER_ASSET_VARIANTS.slice(0, index + 1).reverse()
}
