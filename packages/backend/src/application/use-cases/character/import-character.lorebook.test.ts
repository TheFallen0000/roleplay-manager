import { describe, expect, it, vi } from "vitest"

import type { CharacterExport } from "@workspace/shared/types/export"
import type { CharacterVersionDTO } from "@workspace/shared/types/character"

import { ImportCharacterUseCase } from "./import-character.use-case"

const version: CharacterVersionDTO = {
  id: "old-ver-1",
  characterId: "old-char",
  name: "Lyra",
  subtitle: null,
  profileImageAssetId: null,
  description: "A guardian of the forest.",
  instructions: null,
  greeting: "Hello!",
  versionNumber: 1,
  createdAt: "2026-08-01T10:00:00.000Z",
  cards: [],
}

const lorebook = {
  id: "book-1",
  characterId: "old-char",
  name: "Forest lore",
  description: "Facts about the forest",
  scanDepth: 4,
  tokenBudget: 400,
  recursiveScanning: false,
  extensions: {},
  unknownFields: null,
  entries: [],
}

const buildPayload = (overrides: Partial<CharacterExport> = {}): CharacterExport => ({
  schemaVersion: 1,
  kind: "character-export",
  exportedAt: "2026-11-07T10:00:00.000Z",
  character: {
    id: "old-char",
    name: "Lyra",
    createdAt: "2026-08-01T10:00:00.000Z",
    updatedAt: "2026-08-02T10:00:00.000Z",
  },
  definition: version,
  ...overrides,
})

const buildRepos = () => ({
  characterRepository: {
    createWithFirstVersion: vi.fn(async (character, version) => ({
      character,
      version,
    })),
    findById: async () => null,
    list: async () => [],
    update: async (character) => character,
    delete: async () => {},
    findVersionById: async () => null,
    findVersionsByCharacterId: async () => [],
    findMaxVersionNumber: async () => 0,
    saveVersion: vi.fn(async (value) => value),
    updateProfileImageAssetId: vi.fn(async () => {}),
  },
  conversationRepository: {
    create: vi.fn(async (value) => value),
    findById: async () => null,
    listByCharacterId: async () => [],
    listByCharacterIds: async () => [],
    existsByAssetId: async () => false,
    list: async () => [],
    update: async (value) => value,
    updateSettings: async () => ({}) as never,
    clearProviderInstanceId: async () => {},
  },
  messageRepository: {
    create: vi.fn(async (value) => value),
    findByConversationId: async () => [],
    findById: async () => null,
    findLastByConversationId: async () => null,
    update: async (value) => value,
    deleteById: async () => {},
    deleteAfterPosition: async () => {},
    clearAlternatives: async () => {},
  },
  memoryRepository: {
    findById: async () => null,
    findByConversationId: async () => [],
    create: vi.fn(async (value) => value),
    update: async (value) => value,
    deleteById: async () => {},
  },
  summaryRepository: {
    findById: async () => null,
    findByConversationId: async () => [],
    findLatestByConversationId: async () => null,
    create: vi.fn(async (value) => value),
    update: async (value) => value,
    deleteById: async () => {},
    deleteByIds: async () => {},
  },
  storeCharacterAsset: {
    store: vi.fn(),
  },
  lorebookRepository: {
    findByCharacterId: vi.fn(async () => null),
    upsertBook: vi.fn(async (value) => value),
    createEntry: vi.fn(async (value) => value),
    updateEntry: vi.fn(async (value) => value),
    deleteEntry: vi.fn(async () => {}),
    reorderEntries: vi.fn(async () => {}),
    replaceBook: vi.fn(async () => {}),
  },
})

const buildUseCase = (repos = buildRepos()) =>
  new ImportCharacterUseCase(
    repos.characterRepository as never,
    repos.conversationRepository as never,
    repos.messageRepository as never,
    repos.memoryRepository as never,
    repos.summaryRepository as never,
    repos.storeCharacterAsset as never,
    repos.lorebookRepository as never
  )

describe("internal import — lorebook round-trip", () => {
  it("creates the lorebook when payload.lorebook is present", async () => {
    const repos = buildRepos()

    await buildUseCase(repos).execute({
      payload: buildPayload({ lorebook } as never),
    })

    expect(repos.lorebookRepository.replaceBook).toHaveBeenCalledTimes(1)
    expect(
      (repos.lorebookRepository.replaceBook as ReturnType<typeof vi.fn>).mock
        .calls[0][0]
    ).toMatchObject({
      name: "Forest lore",
      scanDepth: 4,
      tokenBudget: 400,
    })
  })

  it("imports an old export without lorebook (backward compatible)", async () => {
    const repos = buildRepos()

    await buildUseCase(repos).execute({ payload: buildPayload() })

    expect(repos.lorebookRepository.replaceBook).not.toHaveBeenCalled()
    expect(repos.characterRepository.createWithFirstVersion).toHaveBeenCalledTimes(
      1
    )
  })

  it("ignores lorebook when the payload has no definition", async () => {
    const repos = buildRepos()

    await buildUseCase(repos).execute({
      payload: buildPayload({
        definition: undefined,
        versions: [version],
        lorebook,
      } as never),
    })

    expect(repos.lorebookRepository.replaceBook).not.toHaveBeenCalled()
  })
})
