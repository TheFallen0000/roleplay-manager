import type { Readable } from "node:stream"
import type { CharacterAssetVariant } from "@workspace/shared/types/image"

export interface CharacterAssetMetadata {
  id: string
  characterId: string
  mimeType: string
  sizeBytes: number
  extension: string
  width: number | null
  height: number | null
  createdAt: Date
}

export interface CharacterAssetRepository {
  create(metadata: CharacterAssetMetadata): Promise<void>
  findById(id: string): Promise<CharacterAssetMetadata | null>
  findByCharacterId(characterId: string): Promise<CharacterAssetMetadata[]>
  deleteById(id: string): Promise<void>
}

export interface CharacterAssetStorage {
  write(characterId: string, assetId: string, extension: string, data: Buffer): Promise<void>
  read(characterId: string, assetId: string, extension: string): Promise<Readable>
  delete(characterId: string, assetId: string, extension: string): Promise<void>
}

export interface CharacterAssetVariantStorage extends CharacterAssetStorage {
  writeVariant(
    characterId: string,
    assetId: string,
    variant: CharacterAssetVariant,
    data: Buffer,
  ): Promise<void>
  readVariant(
    characterId: string,
    assetId: string,
    variant: CharacterAssetVariant,
  ): Promise<Readable | null>
  hasVariant(
    characterId: string,
    assetId: string,
    variant: CharacterAssetVariant,
  ): Promise<boolean>
  deleteVariants(characterId: string, assetId: string): Promise<void>
}

export interface CharacterAssetMaintenanceRepository
  extends CharacterAssetRepository {
  findAll(): Promise<CharacterAssetMetadata[]>
  updateDimensions(id: string, width: number, height: number): Promise<void>
}
