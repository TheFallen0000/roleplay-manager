import { eq } from "drizzle-orm"

import { PlayerCharacter } from "../../../../../domain/entities/player-character.entity"
import type { PlayerCharacterRepository } from "../../../../../domain/ports/player-character.repository"
import type { Database } from "../../../../config/database"
import { playerCharacters } from "../schema"

type PlayerCharacterRow = typeof playerCharacters.$inferSelect

const toPlayerCharacter = (row: PlayerCharacterRow): PlayerCharacter =>
  PlayerCharacter.reconstruct({
    id: row.id,
    name: row.name,
    description: row.description,
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
  })

export class DrizzlePlayerCharacterRepository
  implements PlayerCharacterRepository
{
  constructor(private readonly db: Database) {}

  async findById(id: string): Promise<PlayerCharacter | null> {
    const rows = await this.db
      .select()
      .from(playerCharacters)
      .where(eq(playerCharacters.id, id))
      .limit(1)

    if (rows.length === 0) return null
    return toPlayerCharacter(rows[0])
  }

  async list(): Promise<PlayerCharacter[]> {
    const rows = await this.db
      .select()
      .from(playerCharacters)
      .orderBy(playerCharacters.createdAt)

    return rows.map(toPlayerCharacter)
  }

  async create(playerCharacter: PlayerCharacter): Promise<PlayerCharacter> {
    await this.db.insert(playerCharacters).values({
      id: playerCharacter.id,
      name: playerCharacter.name,
      description: playerCharacter.description,
      createdAt: playerCharacter.createdAt,
      updatedAt: playerCharacter.updatedAt,
    })

    return playerCharacter
  }

  async update(playerCharacter: PlayerCharacter): Promise<PlayerCharacter> {
    await this.db
      .update(playerCharacters)
      .set({
        name: playerCharacter.name,
        description: playerCharacter.description,
        updatedAt: playerCharacter.updatedAt,
      })
      .where(eq(playerCharacters.id, playerCharacter.id))

    return playerCharacter
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(playerCharacters).where(eq(playerCharacters.id, id))
  }
}
