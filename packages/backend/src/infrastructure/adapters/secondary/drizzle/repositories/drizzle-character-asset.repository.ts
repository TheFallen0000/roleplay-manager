import { eq } from "drizzle-orm"

import type {
  CharacterAssetMaintenanceRepository,
  CharacterAssetMetadata,
} from "../../../../../domain/ports/character-asset.repository"
import type { Database } from "../../../../config/database"
import { characterAssets } from "../schema"

const toMetadata = (row: typeof characterAssets.$inferSelect): CharacterAssetMetadata => ({
  id: row.id,
  characterId: row.characterId,
  mimeType: row.mimeType,
  sizeBytes: row.sizeBytes,
  extension: row.extension,
  width: row.width,
  height: row.height,
  createdAt: new Date(row.createdAt),
})

export class DrizzleCharacterAssetRepository implements CharacterAssetMaintenanceRepository {
  constructor(private readonly db: Database) {}

  async create(metadata: CharacterAssetMetadata): Promise<void> {
    await this.db.insert(characterAssets).values({
      id: metadata.id,
      characterId: metadata.characterId,
      mimeType: metadata.mimeType,
      sizeBytes: metadata.sizeBytes,
      extension: metadata.extension,
      width: metadata.width,
      height: metadata.height,
      createdAt: metadata.createdAt,
    })
  }

  async findById(id: string): Promise<CharacterAssetMetadata | null> {
    const rows = await this.db
      .select()
      .from(characterAssets)
      .where(eq(characterAssets.id, id))
      .limit(1)

    return rows.length > 0 ? toMetadata(rows[0]) : null
  }

  async findByCharacterId(characterId: string): Promise<CharacterAssetMetadata[]> {
    const rows = await this.db
      .select()
      .from(characterAssets)
      .where(eq(characterAssets.characterId, characterId))

    return rows.map(toMetadata)
  }

  async findAll(): Promise<CharacterAssetMetadata[]> {
    const rows = await this.db.select().from(characterAssets)
    return rows.map(toMetadata)
  }

  async updateDimensions(
    id: string,
    width: number,
    height: number,
  ): Promise<void> {
    await this.db
      .update(characterAssets)
      .set({ width, height })
      .where(eq(characterAssets.id, id))
  }

  async deleteById(id: string): Promise<void> {
    await this.db.delete(characterAssets).where(eq(characterAssets.id, id))
  }
}
