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

/** Decodes an uploaded image and generates local delivery variants. */
export interface CharacterAssetImageProcessor {
  process(data: Buffer, mimeType: string): Promise<ProcessedCharacterAssetImage>
}
