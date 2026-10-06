import type { CharacterAssetVariant } from "@workspace/shared/types/image"

export interface ProcessedCharacterAssetVariant {
  variant: CharacterAssetVariant
  width: number
  height: number
  data: Buffer
}

export interface ProcessedCharacterAssetImage {
  width: number
  height: number
  variants: ProcessedCharacterAssetVariant[]
}

export interface ProcessCharacterAssetOptions {
  /** Variant set to generate; defaults to the profile set. */
  variants?: CharacterAssetVariant[]
}

/** Decodes an uploaded image and generates local delivery variants. */
export interface CharacterAssetImageProcessor {
  process(
    data: Buffer,
    mimeType: string,
    options?: ProcessCharacterAssetOptions,
  ): Promise<ProcessedCharacterAssetImage>
}
