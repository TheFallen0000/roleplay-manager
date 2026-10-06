import { describe, it, expect, vi } from "vitest"

import type { ConversationSettingsUpdate } from "@workspace/shared/types/conversation"

import { ApplySettingsTemplateUseCase } from "./apply-settings-template.use-case"
import type { CharacterRepository } from "../../../domain/ports/character.repository"
import type { ConversationRepository } from "../../../domain/ports/conversation.repository"
import type { ProviderInstanceRepository } from "../../../domain/ports/provider-instance.repository"
import type { UpdateConversationSettingsUseCase } from "../conversation/update-conversation-settings.use-case"
import { Character } from "../../../domain/entities/character.entity"
import { CharacterVersion } from "../../../domain/entities/character-version.entity"
import { Conversation } from "../../../domain/entities/conversation.entity"

const now = new Date("2026-10-06T12:00:00Z")

const char1 = Character.create({ id: "char-1", name: "Lyra", createdAt: now, updatedAt: now })

const ver1 = CharacterVersion.create({
  id: "ver-1", characterId: "char-1", name: "Lyra", subtitle: null,
  profileImageAssetId: null, description: "d", instructions: null,
  greeting: "hi", versionNumber: 1, createdAt: now, cards: [],
})
const ver2 = CharacterVersion.create({
  id: "ver-2", characterId: "char-2", name: "Mira", subtitle: null,
  profileImageAssetId: null, description: "d", instructions: null,
  greeting: "hi", versionNumber: 1, createdAt: now, cards: [],
})

const buildConversation = (id: string, versionId: string, updatedAt = now) =>
  Conversation.create({
    id,
    versionId,
    title: null,
    titleSource: null,
    model: null,
    provider: null,
    providerInstanceId: null,
    recentMessageCount: 10,
    summaryFrequency: 20,
    temperature: 0.7,
    maxTokens: 2048,
    topP: 0.9,
    frequencyPenalty: 0,
    presencePenalty: 0,
    stopSequences: [],
    memoryProposalMode: "auto",
    createdAt: now,
    updatedAt,
  })

const conversations = [
  buildConversation("conv-1", "ver-1", new Date("2026-10-05T10:00:00Z")),
  buildConversation("conv-2", "ver-1", new Date("2026-10-06T10:00:00Z")),
  buildConversation("conv-other", "ver-2"),
]

const buildCharacterRepo = (exists = true): CharacterRepository =>
  ({
    findById: async () => (exists ? { character: char1, currentVersion: ver1 } : null),
    findVersionById: async (id: string) =>
      id === "ver-1" ? ver1 : id === "ver-2" ? ver2 : null,
  }) as unknown as CharacterRepository

const buildConversationRepo = (): ConversationRepository =>
  ({ list: async () => conversations }) as unknown as ConversationRepository

const buildProviderInstances = (exists: boolean): ProviderInstanceRepository =>
  ({
    findById: async (id: string) => (exists ? { id } : null),
  }) as unknown as ProviderInstanceRepository

const buildUpdateSettings = () => {
  const execute = vi.fn(
    async (_id: string, _settings: ConversationSettingsUpdate) => ({}),
  )
  return { useCase: { execute } as unknown as UpdateConversationSettingsUseCase, execute }
}

const buildUseCase = (
  options: { characterExists?: boolean; instanceExists?: boolean } = {},
) => {
  const updateSettings = buildUpdateSettings()
  const useCase = new ApplySettingsTemplateUseCase(
    buildCharacterRepo(options.characterExists ?? true),
    buildConversationRepo(),
    buildProviderInstances(options.instanceExists ?? true),
    updateSettings.useCase,
  )
  return { useCase, updateSettings }
}

describe("ApplySettingsTemplateUseCase", () => {
  it("applies every setting to all conversations of the character", async () => {
    const { useCase, updateSettings } = buildUseCase()

    const result = await useCase.execute({
      characterId: "char-1",
      settings: {
        model: "gpt-4o-mini",
        provider: "ollama",
        providerInstanceId: null,
        recentMessageCount: 8,
        summaryFrequency: 15,
        temperature: 0.9,
        maxTokens: 1024,
        topP: 0.8,
        frequencyPenalty: 0.2,
        presencePenalty: -0.2,
        stopSequences: ["END"],
        memoryProposalMode: "manual",
        memoryDecayMode: "off",
        memoryDecayThreshold: 4,
        memoryDecayAgeThreshold: 20,
        memoryDecaySpeed: 5,
      },
    })

    expect(result).toEqual({ applied: 2, warnings: [] })
    expect(updateSettings.execute).toHaveBeenCalledTimes(2)
    expect(updateSettings.execute).toHaveBeenCalledWith(
      "conv-2",
      expect.objectContaining({
        provider: "ollama",
        providerInstanceId: null,
        model: "gpt-4o-mini",
        recentMessageCount: 8,
        summaryFrequency: 15,
        temperature: 0.9,
        maxTokens: 1024,
        topP: 0.8,
        frequencyPenalty: 0.2,
        presencePenalty: -0.2,
        stopSequences: ["END"],
        memoryProposalMode: "manual",
        memoryDecayMode: "off",
        memoryDecayThreshold: 4,
        memoryDecayAgeThreshold: 20,
        memoryDecaySpeed: 5,
        force: true,
      }),
    )
    expect(updateSettings.execute).toHaveBeenCalledWith(
      "conv-1",
      expect.any(Object),
    )
    // The other character's conversation is never touched.
    expect(updateSettings.execute).not.toHaveBeenCalledWith(
      "conv-other",
      expect.any(Object),
    )
  })

  it("keeps provider and model when the template instance is missing", async () => {
    const { useCase, updateSettings } = buildUseCase({ instanceExists: false })

    const result = await useCase.execute({
      characterId: "char-1",
      settings: {
        provider: "openai-compatible",
        providerInstanceId: "missing-instance",
        model: "gpt-4o",
        temperature: 0.5,
      },
    })

    expect(result.warnings).toContain("PROVIDER_INSTANCE_NOT_FOUND")
    const update = updateSettings.execute.mock.calls[0][1]
    expect(update).not.toHaveProperty("provider")
    expect(update).not.toHaveProperty("providerInstanceId")
    expect(update).not.toHaveProperty("model")
    expect(update).toHaveProperty("temperature", 0.5)
  })

  it("applies the provider when the instance exists", async () => {
    const { useCase, updateSettings } = buildUseCase({ instanceExists: true })

    const result = await useCase.execute({
      characterId: "char-1",
      settings: {
        provider: "openai-compatible",
        providerInstanceId: "inst-1",
        model: "gpt-4o",
      },
    })

    expect(result.warnings).toEqual([])
    expect(updateSettings.execute.mock.calls[0][1]).toEqual(
      expect.objectContaining({
        provider: "openai-compatible",
        providerInstanceId: "inst-1",
        model: "gpt-4o",
        force: true,
      }),
    )
  })

  it("warns about unsupported providers without touching them", async () => {
    const { useCase, updateSettings } = buildUseCase()

    const result = await useCase.execute({
      characterId: "char-1",
      settings: { provider: "something-else", model: "x" },
    })

    expect(result.warnings).toContain("PROVIDER_UNSUPPORTED")
    expect(updateSettings.execute.mock.calls[0][1]).not.toHaveProperty("provider")
  })

  it("warns when the character has no conversations", async () => {
    const updateSettings = buildUpdateSettings()
    const useCase = new ApplySettingsTemplateUseCase(
      buildCharacterRepo(),
      { list: async () => [] } as unknown as ConversationRepository,
      buildProviderInstances(true),
      updateSettings.useCase,
    )

    const result = await useCase.execute({
      characterId: "char-1",
      settings: { temperature: 0.3 },
    })

    expect(result).toEqual({ applied: 0, warnings: ["NO_CONVERSATIONS"] })
    expect(updateSettings.execute).not.toHaveBeenCalled()
  })

  it("throws when the character does not exist", async () => {
    const { useCase } = buildUseCase({ characterExists: false })

    await expect(
      useCase.execute({ characterId: "missing", settings: { temperature: 0.3 } }),
    ).rejects.toThrow("not found")
  })
})
