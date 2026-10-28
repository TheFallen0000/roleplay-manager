import { describe, it, expect } from "vitest"

import { CreateConversationUseCase } from "./create-conversation.use-case"
import type { ConversationRepository } from "../../../domain/ports/conversation.repository"
import type { MessageRepository } from "../../../domain/ports/message.repository"
import type { CharacterRepository } from "../../../domain/ports/character.repository"
import type { CharacterAssetRepository } from "../../../domain/ports/character-asset.repository"
import type { GetDefaultProviderUseCase } from "../provider/get-default-provider.use-case"
import type { ProviderInstanceRepository } from "../../../domain/ports/provider-instance.repository"
import { Conversation } from "../../../domain/entities/conversation.entity"
import { Character } from "../../../domain/entities/character.entity"
import { CharacterVersion } from "../../../domain/entities/character-version.entity"

const buildDefaultProvider = (
  provider: ProviderId | null = "openai-compatible",
  model: string | null = "gpt-4o-mini",
): GetDefaultProviderUseCase => {
  const models: Partial<Record<ProviderId, string>> = {}
  if (provider && model) models[provider] = model
  return { execute: async () => ({ provider, providerInstanceId: null, models }) } as unknown as GetDefaultProviderUseCase
}

import type { ProviderId } from "@workspace/shared/types/provider"

const now = new Date()
const character = Character.create({ id: "char-1", name: "Test", createdAt: now, updatedAt: now })
const version = CharacterVersion.create({
  id: "ver-1", characterId: "char-1", name: "Test",
  subtitle: null, profileImageAssetId: null,
  description: "A test character", instructions: null,
  greeting: "Hello!", versionNumber: 1, createdAt: now, cards: [],
})
const versionV2 = CharacterVersion.create({
  id: "ver-2", characterId: "char-1", name: "Test",
  subtitle: null, profileImageAssetId: null,
  description: "A test character", instructions: null,
  greeting: "Bonjour!", versionNumber: 2, createdAt: now, cards: [],
})
const otherVersion = CharacterVersion.create({
  id: "ver-3", characterId: "char-other", name: "Other",
  subtitle: null, profileImageAssetId: "asset-other",
  description: "Another character", instructions: null,
  greeting: "Hi!", versionNumber: 1, createdAt: now, cards: [],
})

const buildCharacterRepo = (): CharacterRepository => ({
  createWithFirstVersion: async () => ({ character, version }),
  findById: async () => ({ character, currentVersion: version }),
  list: async () => [],
  update: async (c) => c,
  delete: async () => {},
  findVersionById: async () => version,
  findVersionsByCharacterId: async () => [],
  findMaxVersionNumber: async () => 0,
  saveVersion: async (v) => v,
  updateProfileImageAssetId: async () => {},
})

const buildProviderInstanceRepo = (): ProviderInstanceRepository => ({
  findById: async () => null,
  create: async (_i) => ({}) as never,
  update: async (_id, _input) => ({}) as never,
  delete: async () => {},
  list: async () => [],
})

const buildConversationRepo = (): ConversationRepository => ({
  create: async (c) => c,
  findById: async () => null,
  findByIdWithMessages: async () => null,
  listByCharacterId: async () => [],
  list: async () => [],
  update: async (c) => c,
  updateSettings: async (_id: string, _settings: any) => ({} as Conversation),
  clearProviderInstanceId: async () => {},
})

const buildMessageRepo = (): MessageRepository => ({
  create: async (m) => m,
  findByConversationId: async () => [],
  findById: async () => null,
  findLastByConversationId: async () => null,
  update: async (m) => m,
  deleteById: async () => {},
  deleteAfterPosition: async () => {},
  clearAlternatives: async () => {},
})

const buildAssetRepo = (): CharacterAssetRepository => ({
  create: async () => {},
  findById: async () => null,
  findByCharacterId: async () => [],
  deleteById: async () => {},
})

describe("CreateConversationUseCase", () => {
  it("crea conversación con greeting del personaje", async () => {
    const useCase = new CreateConversationUseCase(
      buildConversationRepo(),
      buildMessageRepo(),
      buildCharacterRepo(),
      buildDefaultProvider(),
      buildProviderInstanceRepo(),
      buildAssetRepo(),
    )

    const result = await useCase.execute({ characterId: "char-1" })

    expect(result.conversation.characterName).toBe("Test")
    expect(result.conversation.messages).toHaveLength(1)
    expect(result.conversation.messages[0].role).toBe("assistant")
    expect(result.conversation.messages[0].content).toBe("Hello!")
    expect(result.conversation.messages[0].position).toBe(0)
    expect(result.conversation.provider).toBe("openai-compatible")
    expect(result.conversation.model).toBe("gpt-4o-mini")
    expect(result.defaultProviderStatus).toBe("available")
  })

  it("lanza CharacterNotFoundError si el personaje no existe", async () => {
    const repo = buildCharacterRepo()
    repo.findById = async () => null

    const useCase = new CreateConversationUseCase(
      buildConversationRepo(),
      buildMessageRepo(),
      repo,
      buildDefaultProvider(),
      buildProviderInstanceRepo(),
      buildAssetRepo(),
    )

    await expect(
      useCase.execute({ characterId: "nonexistent" }),
    ).rejects.toThrow("Character with id 'nonexistent' not found.")
  })

  it("usa la versionId solicitada para el greeting", async () => {
    const repo = buildCharacterRepo()
    repo.findVersionById = async (id) =>
      id === "ver-2" ? versionV2 : version

    const useCase = new CreateConversationUseCase(
      buildConversationRepo(),
      buildMessageRepo(),
      repo,
      buildDefaultProvider(),
      buildProviderInstanceRepo(),
      buildAssetRepo(),
    )

    const result = await useCase.execute({ characterId: "char-1", versionId: "ver-2" })

    expect(result.conversation.messages[0].content).toBe("Bonjour!")
    expect(result.conversation.characterName).toBe("Test")
  })

  it("lanza CharacterVersionNotFoundError si la versionId no existe", async () => {
    const repo = buildCharacterRepo()
    repo.findVersionById = async () => null

    const useCase = new CreateConversationUseCase(
      buildConversationRepo(),
      buildMessageRepo(),
      repo,
      buildDefaultProvider(),
      buildProviderInstanceRepo(),
      buildAssetRepo(),
    )

    await expect(
      useCase.execute({ characterId: "char-1", versionId: "nonexistent" }),
    ).rejects.toThrow("Character version with id 'nonexistent' not found.")
  })

  it("lanza InvalidVersionForCharacterError si la versionId pertenece a otro personaje", async () => {
    const repo = buildCharacterRepo()
    repo.findVersionById = async () => otherVersion

    const useCase = new CreateConversationUseCase(
      buildConversationRepo(),
      buildMessageRepo(),
      repo,
      buildDefaultProvider(),
      buildProviderInstanceRepo(),
      buildAssetRepo(),
    )

    await expect(
      useCase.execute({ characterId: "char-1", versionId: "ver-3" }),
    ).rejects.toThrow(
      "Version 'ver-3' does not belong to character 'char-1'.",
    )
  })
})
