import { describe, it, expect, vi } from "vitest"

import { GetCharacterUseCase } from "./get-character.use-case"
import type { CharacterRepository } from "../../../domain/ports/character.repository"
import { Character } from "../../../domain/entities/character.entity"
import { CharacterVersion } from "../../../domain/entities/character-version.entity"
import { CharacterCard } from "../../../domain/entities/character-card.entity"

const now = new Date()
const card = CharacterCard.create({
  id: "card-1",
  versionId: "ver-1",
  title: "Card",
  content: "Content",
  position: 0,
  active: true,
})
const character = Character.create({ id: "char-1", name: "Test", createdAt: now, updatedAt: now })
const version = CharacterVersion.create({
  id: "ver-1",
  characterId: "char-1",
  name: "Test",
  subtitle: null,
  profileImageAssetId: null,
  description: "Desc",
  instructions: null,
  greeting: "Hi",
  versionNumber: 1,
  createdAt: now,
  cards: [card],
})

const linkedVersion = CharacterVersion.create({
  id: "ver-linked",
  characterId: "char-1",
  name: "Test",
  subtitle: null,
  profileImageAssetId: null,
  description: "Desc",
  instructions: null,
  greeting: "Hi",
  versionNumber: 2,
  createdAt: now,
  cards: [],
  lorebookVersionId: "lv-1",
} as never)

const buildRepo = (): CharacterRepository => ({
  createWithFirstVersion: async () => ({ character, version }),
  findById: async (id) =>
    id === "char-1" ? { character, currentVersion: version } : null,
  list: async () => [character],
  update: async (c) => c,
  delete: async () => {},
  findVersionById: async () => version,
  findVersionsByCharacterId: async () => [version],
  findMaxVersionNumber: async () => 1,
  saveVersion: async (v) => v,
  updateProfileImageAssetId: async () => {},
})

const buildLinkedRepo = (): CharacterRepository => ({
  ...buildRepo(),
  findById: async (id) =>
    id === "char-1" ? { character, currentVersion: linkedVersion } : null,
  findVersionsByCharacterId: async () => [linkedVersion],
})

const buildLorebookRepo = (container: Record<string, unknown>) =>
  ({
    findVersionById: async () => ({
      id: "lv-1",
      lorebookId: "book-1",
      versionNumber: 2,
      name: "Forest lore",
      description: null,
      scanDepth: 4,
      tokenBudget: 400,
      recursiveScanning: false,
      entriesJson: "[]",
      sourceKey: "a".repeat(64),
      createdAt: now,
    }),
    findById: async () => container,
  }) as never

describe("GetCharacterUseCase", () => {
  it("retorna el personaje con su version actual", async () => {
    const useCase = new GetCharacterUseCase(buildRepo())
    const result = await useCase.execute("char-1")

    expect(result.id).toBe("char-1")
    expect(result.currentVersion.versionNumber).toBe(1)
    expect(result.currentVersion.cards).toHaveLength(1)
  })

  it("summarizes current, outdated and deleted linked lorebook versions", async () => {
    const cases = [
      {
        currentVersionId: "lv-1",
        deletedAt: null,
        status: "current",
      },
      {
        currentVersionId: "lv-2",
        deletedAt: null,
        status: "outdated",
      },
      {
        currentVersionId: "lv-2",
        deletedAt: now,
        status: "deleted",
      },
    ] as const

    for (const item of cases) {
      const useCase = new GetCharacterUseCase(
        buildLinkedRepo(),
        buildLorebookRepo({
          book: {
            id: "book-1",
            originId: "origin-1",
            currentVersionId: item.currentVersionId,
            deletedAt: item.deletedAt,
          },
          entries: [],
        }),
      )

      const result = await useCase.execute("char-1")

      expect(result.currentVersion.lorebookVersion).toMatchObject({
        lorebookId: "book-1",
        versionId: "lv-1",
        versionNumber: 2,
        name: "Forest lore",
        entryCount: 0,
        sourceKey: "a".repeat(64),
        originId: "origin-1",
        status: item.status,
      })
    }
  })

  it("resolves linked lorebook summaries in one batch (I1)", async () => {
    const secondLinkedVersion = CharacterVersion.create({
      id: "ver-linked-2",
      characterId: "char-1",
      name: "Test",
      subtitle: null,
      profileImageAssetId: null,
      description: "Desc",
      instructions: null,
      greeting: "Hi",
      versionNumber: 3,
      createdAt: now,
      cards: [],
      lorebookVersionId: "lv-2",
    } as never)

    const characterRepository: CharacterRepository = {
      ...buildRepo(),
      findById: async () => ({ character, currentVersion: linkedVersion }),
      findVersionsByCharacterId: async () => [
        linkedVersion,
        secondLinkedVersion,
      ],
    }

    const versionOne = {
      id: "lv-1",
      lorebookId: "book-1",
      versionNumber: 2,
      name: "Forest lore",
      description: null,
      scanDepth: 4,
      tokenBudget: 400,
      recursiveScanning: false,
      entriesJson: "[]",
      sourceKey: "a".repeat(64),
      createdAt: now,
    }
    const versionTwo = {
      ...versionOne,
      id: "lv-2",
      lorebookId: "book-2",
      versionNumber: 1,
      name: "River lore",
    }
    const lorebookRepository = {
      findVersionsByIds: vi.fn(async (_ids: string[]) => [
        versionOne,
        versionTwo,
      ]),
      // The plan's contract is `findByIds(ids): Promise<Lorebook[]>`: books
      // only, because the I1 summary does not need the live entries.
      findByIds: vi.fn(async (_ids: string[]) => [
        {
          id: "book-1",
          originId: "origin-1",
          currentVersionId: "lv-1",
          deletedAt: null,
        },
        {
          id: "book-2",
          originId: "origin-2",
          currentVersionId: "lv-2",
          deletedAt: null,
        },
      ]),
      // Legacy per-id methods stay available but must not drive the mapping.
      findVersionById: vi.fn(async (_id: string) => versionOne),
      findById: vi.fn(async (_id: string) => ({
        book: {
          id: "book-1",
          originId: "origin-1",
          currentVersionId: "lv-1",
          deletedAt: null,
        },
        entries: [],
      })),
    }

    const useCase = new GetCharacterUseCase(
      characterRepository,
      lorebookRepository as never,
    )
    const result = await useCase.execute("char-1")

    expect(lorebookRepository.findVersionsByIds).toHaveBeenCalledTimes(1)
    const requestedVersionIds = lorebookRepository.findVersionsByIds.mock
      .calls[0][0] as string[]
    expect(requestedVersionIds).toHaveLength(2)
    expect(new Set(requestedVersionIds)).toEqual(new Set(["lv-1", "lv-2"]))

    expect(lorebookRepository.findByIds).toHaveBeenCalledTimes(1)
    const requestedContainerIds = lorebookRepository.findByIds.mock
      .calls[0][0] as string[]
    expect(requestedContainerIds).toHaveLength(2)
    expect(new Set(requestedContainerIds)).toEqual(
      new Set(["book-1", "book-2"]),
    )

    expect(lorebookRepository.findVersionById).not.toHaveBeenCalled()
    expect(
      result.versions.map((version) => version.lorebookVersion?.lorebookId),
    ).toEqual(["book-1", "book-2"])
    expect(result.currentVersion.lorebookVersion).toMatchObject({
      versionId: "lv-1",
      status: "current",
    })
  })

  it("lanza CharacterNotFoundError si no existe", async () => {
    const useCase = new GetCharacterUseCase(buildRepo())
    await expect(useCase.execute("nonexistent")).rejects.toThrow(
      "Character with id 'nonexistent' not found.",
    )
  })
})
