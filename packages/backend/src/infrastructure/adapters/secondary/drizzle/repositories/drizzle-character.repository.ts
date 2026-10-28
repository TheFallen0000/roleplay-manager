import { and, desc, eq, inArray, max, sql } from "drizzle-orm"

import { Character } from "../../../../../domain/entities/character.entity"
import { CharacterVersion } from "../../../../../domain/entities/character-version.entity"
import { CharacterCard } from "../../../../../domain/entities/character-card.entity"
import type {
  CharacterRepository,
  CharacterSummaryPage,
  CharacterSummaryPageOptions,
  CharacterSummaryRepository,
  CharacterVersionSummary,
  CharacterWithCurrentVersionSummary,
  CreateCharacterWithVersionResult,
} from "../../../../../domain/ports/character.repository"
import type { Database } from "../../../../config/database"
import { characterCards, characterVersions, characters } from "../schema"

type CharacterRow = typeof characters.$inferSelect
type VersionRow = typeof characterVersions.$inferSelect
type CardRow = typeof characterCards.$inferSelect

const toCharacter = (row: CharacterRow): Character =>
  Character.create({ ...row, createdAt: new Date(row.createdAt), updatedAt: new Date(row.updatedAt) })

const toVersion = (row: VersionRow, cards: CharacterCard[]): CharacterVersion =>
  CharacterVersion.create({
    ...row,
    subtitle: row.subtitle ?? null,
    instructions: row.instructions ?? null,
    createdAt: new Date(row.createdAt),
    cards,
  })

const toCard = (row: CardRow): CharacterCard =>
  CharacterCard.create({ ...row, active: row.active ?? true })

export class DrizzleCharacterRepository
  implements CharacterRepository, CharacterSummaryRepository
{
  constructor(private readonly db: Database) {}

  async createWithFirstVersion(
    character: Character,
    version: CharacterVersion,
  ): Promise<CreateCharacterWithVersionResult> {
    this.db.transaction((tx) => {
      tx.insert(characters).values({
        id: character.id,
        name: character.name,
        createdAt: character.createdAt,
        updatedAt: character.updatedAt,
      }).run()

      tx.insert(characterVersions).values({
        id: version.id,
        characterId: version.characterId,
        name: version.name,
        subtitle: version.subtitle,
        profileImageAssetId: version.profileImageAssetId,
        description: version.description,
        instructions: version.instructions,
        greeting: version.greeting,
        versionNumber: version.versionNumber,
        createdAt: version.createdAt,
      }).run()

      if (version.cards.length > 0) {
        tx.insert(characterCards).values(
          version.cards.map((c) => ({
            id: c.id,
            versionId: c.versionId,
            title: c.title,
            content: c.content,
            position: c.position,
            active: c.active,
          })),
        ).run()
      }
    })

    return { character, version }
  }

  async findById(
    id: string,
  ): Promise<{ character: Character; currentVersion: CharacterVersion } | null> {
    const rows = await this.db
      .select()
      .from(characters)
      .where(eq(characters.id, id))
      .limit(1)

    if (rows.length === 0) return null

    const character = toCharacter(rows[0])

    const versionRows = await this.db
      .select()
      .from(characterVersions)
      .where(eq(characterVersions.characterId, id))
      .orderBy(characterVersions.versionNumber)

    if (versionRows.length === 0) return null

    const currentVersionRow = versionRows[versionRows.length - 1]
    const versionIds = versionRows.map((v) => v.id)

    let allCards: CardRow[] = []
    if (versionIds.length > 0) {
      allCards = await this.db
        .select()
        .from(characterCards)
        .where(
          versionIds.length === 1
            ? eq(characterCards.versionId, versionIds[0])
            : sql`${characterCards.versionId} IN ${versionIds}`,
        )
    }

    const cardsByVersion = new Map<string, CardRow[]>()
    for (const card of allCards) {
      const existing = cardsByVersion.get(card.versionId) ?? []
      existing.push(card)
      cardsByVersion.set(card.versionId, existing)
    }

    const currentVersion = toVersion(
      currentVersionRow,
      (cardsByVersion.get(currentVersionRow.id) ?? []).sort(
        (a, b) => a.position - b.position,
      ).map(toCard),
    )

    return { character, currentVersion }
  }

  async list(): Promise<Character[]> {
    const rows = await this.db
      .select()
      .from(characters)
      .orderBy(characters.createdAt)

    return rows.map(toCharacter)
  }

  async listCurrentVersionSummaries(): Promise<
    CharacterWithCurrentVersionSummary[]
  > {
    const characterRows = await this.db
      .select()
      .from(characters)
      .orderBy(characters.createdAt)

    const latestVersions = this.db
      .select({
        characterId: characterVersions.characterId,
        versionNumber: max(characterVersions.versionNumber).as(
          "max_version_number",
        ),
      })
      .from(characterVersions)
      .groupBy(characterVersions.characterId)
      .as("latest_versions")

    const versionRows = await this.db
      .select({
        id: characterVersions.id,
        characterId: characterVersions.characterId,
        name: characterVersions.name,
        subtitle: characterVersions.subtitle,
        profileImageAssetId: characterVersions.profileImageAssetId,
        versionNumber: characterVersions.versionNumber,
      })
      .from(characterVersions)
      .innerJoin(
        latestVersions,
        and(
          eq(characterVersions.characterId, latestVersions.characterId),
          eq(characterVersions.versionNumber, latestVersions.versionNumber),
        ),
      )

    const versionsByCharacter = new Map<string, CharacterVersionSummary>()
    for (const row of versionRows) {
      versionsByCharacter.set(row.characterId, {
        id: row.id,
        characterId: row.characterId,
        name: row.name,
        subtitle: row.subtitle,
        profileImageAssetId: row.profileImageAssetId,
        versionNumber: row.versionNumber,
      })
    }

    return characterRows.flatMap((row) => {
      const currentVersion = versionsByCharacter.get(row.id)
      return currentVersion
        ? [{ character: toCharacter(row), currentVersion }]
        : []
    })
  }

  async listCurrentVersionSummariesPage({
    limit,
    offset,
  }: CharacterSummaryPageOptions): Promise<CharacterSummaryPage> {
    const safeLimit = Math.max(1, Math.min(limit, 200))
    const safeOffset = Math.max(0, offset)
    const characterRows = await this.db
      .select()
      .from(characters)
      .orderBy(characters.createdAt, characters.id)
      .limit(safeLimit + 1)
      .offset(safeOffset)

    const hasMore = characterRows.length > safeLimit
    const pageRows = hasMore
      ? characterRows.slice(0, safeLimit)
      : characterRows
    if (pageRows.length === 0) {
      return { entries: [], hasMore: false, nextOffset: null }
    }

    const characterIds = pageRows.map((row) => row.id)
    const latestVersions = this.db
      .select({
        characterId: characterVersions.characterId,
        versionNumber: max(characterVersions.versionNumber).as(
          "max_version_number",
        ),
      })
      .from(characterVersions)
      .where(inArray(characterVersions.characterId, characterIds))
      .groupBy(characterVersions.characterId)
      .as("latest_versions")

    const versionRows = await this.db
      .select({
        id: characterVersions.id,
        characterId: characterVersions.characterId,
        name: characterVersions.name,
        subtitle: characterVersions.subtitle,
        profileImageAssetId: characterVersions.profileImageAssetId,
        versionNumber: characterVersions.versionNumber,
      })
      .from(characterVersions)
      .innerJoin(
        latestVersions,
        and(
          eq(characterVersions.characterId, latestVersions.characterId),
          eq(characterVersions.versionNumber, latestVersions.versionNumber),
        ),
      )

    const versionsByCharacter = new Map<string, CharacterVersionSummary>()
    for (const row of versionRows) {
      versionsByCharacter.set(row.characterId, {
        id: row.id,
        characterId: row.characterId,
        name: row.name,
        subtitle: row.subtitle,
        profileImageAssetId: row.profileImageAssetId,
        versionNumber: row.versionNumber,
      })
    }

    const entries = pageRows.flatMap((row) => {
      const currentVersion = versionsByCharacter.get(row.id)
      return currentVersion
        ? [{ character: toCharacter(row), currentVersion }]
        : []
    })

    return {
      entries,
      hasMore,
      nextOffset: hasMore ? safeOffset + safeLimit : null,
    }
  }

  async findVersionSummariesByIds(
    ids: string[],
  ): Promise<CharacterVersionSummary[]> {
    if (ids.length === 0) return []

    return this.db
      .select({
        id: characterVersions.id,
        characterId: characterVersions.characterId,
        name: characterVersions.name,
        subtitle: characterVersions.subtitle,
        profileImageAssetId: characterVersions.profileImageAssetId,
        versionNumber: characterVersions.versionNumber,
      })
      .from(characterVersions)
      .where(inArray(characterVersions.id, ids))
  }

  async findCurrentVersionSummaryByCharacterId(
    characterId: string,
  ): Promise<CharacterVersionSummary | null> {
    const rows = await this.db
      .select({
        id: characterVersions.id,
        characterId: characterVersions.characterId,
        name: characterVersions.name,
        subtitle: characterVersions.subtitle,
        profileImageAssetId: characterVersions.profileImageAssetId,
        versionNumber: characterVersions.versionNumber,
      })
      .from(characterVersions)
      .where(eq(characterVersions.characterId, characterId))
      .orderBy(desc(characterVersions.versionNumber))
      .limit(1)

    return rows[0] ?? null
  }

  async update(character: Character): Promise<Character> {
    await this.db
      .update(characters)
      .set({ name: character.name, updatedAt: character.updatedAt })
      .where(eq(characters.id, character.id))

    return character
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(characters).where(eq(characters.id, id))
  }

  async findVersionById(id: string): Promise<CharacterVersion | null> {
    const rows = await this.db
      .select()
      .from(characterVersions)
      .where(eq(characterVersions.id, id))
      .limit(1)

    if (rows.length === 0) return null

    const cardRows = await this.db
      .select()
      .from(characterCards)
      .where(eq(characterCards.versionId, rows[0].id))
      .orderBy(characterCards.position)

    return toVersion(rows[0], cardRows.map(toCard))
  }

  async findVersionsByCharacterId(characterId: string): Promise<CharacterVersion[]> {
    const rows = await this.db
      .select()
      .from(characterVersions)
      .where(eq(characterVersions.characterId, characterId))
      .orderBy(characterVersions.versionNumber)

    if (rows.length === 0) return []

    const versionIds = rows.map((v) => v.id)
    let allCards: CardRow[] = []
    if (versionIds.length > 0) {
      allCards = await this.db
        .select()
        .from(characterCards)
        .where(
          versionIds.length === 1
            ? eq(characterCards.versionId, versionIds[0])
            : sql`${characterCards.versionId} IN ${versionIds}`,
        )
    }

    const cardsByVersion = new Map<string, CardRow[]>()
    for (const card of allCards) {
      const existing = cardsByVersion.get(card.versionId) ?? []
      existing.push(card)
      cardsByVersion.set(card.versionId, existing)
    }

    return rows.map((row) =>
      toVersion(
        row,
        (cardsByVersion.get(row.id) ?? []).sort(
          (a, b) => a.position - b.position,
        ).map(toCard),
      )
    )
  }

  async findMaxVersionNumber(characterId: string): Promise<number> {
    const rows = await this.db
      .select({ max: sql<number>`COALESCE(MAX(${characterVersions.versionNumber}), 0)` })
      .from(characterVersions)
      .where(eq(characterVersions.characterId, characterId))

    return rows[0]?.max ?? 0
  }

  async saveVersion(version: CharacterVersion): Promise<CharacterVersion> {
    this.db.transaction((tx) => {
      tx.insert(characterVersions).values({
        id: version.id,
        characterId: version.characterId,
        name: version.name,
        subtitle: version.subtitle,
        profileImageAssetId: version.profileImageAssetId,
        description: version.description,
        instructions: version.instructions,
        greeting: version.greeting,
        versionNumber: version.versionNumber,
        createdAt: version.createdAt,
      }).run()

      if (version.cards.length > 0) {
        tx.insert(characterCards).values(
          version.cards.map((c) => ({
            id: c.id,
            versionId: c.versionId,
            title: c.title,
            content: c.content,
            position: c.position,
            active: c.active,
          })),
        ).run()
      }
    })

    return version
  }

  async updateProfileImageAssetId(
    versionId: string,
    profileImageAssetId: string | null,
  ): Promise<void> {
    await this.db
      .update(characterVersions)
      .set({ profileImageAssetId })
      .where(eq(characterVersions.id, versionId))
  }
}
