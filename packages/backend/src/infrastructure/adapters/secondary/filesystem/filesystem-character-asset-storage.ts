import { createReadStream } from "node:fs"
import { randomUUID } from "node:crypto"
import { mkdir, writeFile, unlink, access, rename, rm } from "node:fs/promises"
import { join, dirname } from "node:path"
import { Readable } from "node:stream"

import type { CharacterAssetStorage } from "../../../../domain/ports/character-asset.repository"
import type { CharacterAssetVariant } from "@workspace/shared/types/image"
import { CharacterAssetValidationError } from "../../../../domain/errors"

export class FilesystemCharacterAssetStorage implements CharacterAssetStorage {
  private readonly root: string

  constructor(root: string) {
    this.root = root
  }

  resolvePath(characterId: string, assetId: string, extension: string): string {
    this.validatePath(characterId, assetId, extension)
    return join(this.root, characterId, `${assetId}.${extension}`)
  }

  private resolveVariantPath(
    characterId: string,
    assetId: string,
    variant: CharacterAssetVariant,
  ): string {
    this.validatePath(characterId, assetId, variant)
    return join(this.root, characterId, assetId, `${variant}.webp`)
  }

  async write(
    characterId: string,
    assetId: string,
    extension: string,
    data: Buffer,
  ): Promise<void> {
    const filePath = this.resolvePath(characterId, assetId, extension)
    await mkdir(dirname(filePath), { recursive: true })
    await writeFile(filePath, data)
  }

  async read(
    characterId: string,
    assetId: string,
    extension: string,
  ): Promise<Readable> {
    const filePath = this.resolvePath(characterId, assetId, extension)
    try {
      await access(filePath)
    } catch {
      throw new CharacterAssetValidationError("Asset file not found on disk")
    }
    return createReadStream(filePath)
  }

  async writeVariant(
    characterId: string,
    assetId: string,
    variant: CharacterAssetVariant,
    data: Buffer,
  ): Promise<void> {
    const filePath = this.resolveVariantPath(characterId, assetId, variant)
    await mkdir(dirname(filePath), { recursive: true })
    const temporaryPath = `${filePath}.${randomUUID()}.tmp`
    try {
      await writeFile(temporaryPath, data, { flag: "wx" })
      await rename(temporaryPath, filePath)
    } catch (error) {
      await unlink(temporaryPath).catch(() => undefined)
      throw error
    }
  }

  async readVariant(
    characterId: string,
    assetId: string,
    variant: CharacterAssetVariant,
  ): Promise<Readable | null> {
    const filePath = this.resolveVariantPath(characterId, assetId, variant)
    try {
      await access(filePath)
    } catch {
      return null
    }
    return createReadStream(filePath)
  }

  async hasVariant(
    characterId: string,
    assetId: string,
    variant: CharacterAssetVariant,
  ): Promise<boolean> {
    try {
      await access(this.resolveVariantPath(characterId, assetId, variant))
      return true
    } catch {
      return false
    }
  }

  async deleteVariants(characterId: string, assetId: string): Promise<void> {
    this.validatePath(characterId, assetId, "variants")
    await rm(join(this.root, characterId, assetId), {
      recursive: true,
      force: true,
    })
  }

  async delete(
    characterId: string,
    assetId: string,
    extension: string,
  ): Promise<void> {
    const filePath = this.resolvePath(characterId, assetId, extension)
    try {
      await access(filePath)
      await unlink(filePath)
    } catch {
      // File may not exist — idempotent delete
    }
    await this.deleteVariants(characterId, assetId)
  }

  private validatePath(characterId: string, assetId: string, extension: string): void {
    const parts = [characterId, assetId, extension]
    for (const part of parts) {
      if (part.includes("..") || part.includes("/") || part.includes("\\")) {
        throw new CharacterAssetValidationError("Invalid path component")
      }
    }
  }
}
