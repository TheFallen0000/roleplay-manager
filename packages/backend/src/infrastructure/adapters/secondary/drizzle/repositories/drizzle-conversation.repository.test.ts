import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { buildDatabase, runMigrations } from "../../../../config/database"
import { Conversation } from "../../../../../domain/entities/conversation.entity"
import { characterVersions, characters } from "../schema"
import { DrizzleConversationRepository } from "./drizzle-conversation.repository"

const root = mkdtempSync(join(tmpdir(), "rm-conversation-repository-"))
const db = buildDatabase(join(root, "test.db"))
const client = (db as unknown as { $client: { close: () => void } }).$client
const now = new Date("2026-10-28T12:00:00.000Z")

beforeAll(async () => {
  runMigrations(db)
  await db.insert(characters).values({
    id: "char-1",
    name: "Test",
    createdAt: now,
    updatedAt: now,
  })
  await db.insert(characterVersions).values({
    id: "ver-1",
    characterId: "char-1",
    name: "Test",
    description: "Description",
    greeting: "Hello",
    versionNumber: 1,
    createdAt: now,
  })
})

afterAll(() => {
  client.close()
  rmSync(root, { recursive: true, force: true })
})

describe("DrizzleConversationRepository context window", () => {
  it("persists, updates and clears the context window", async () => {
    const repository = new DrizzleConversationRepository(db)
    await repository.create(
      Conversation.create({
        id: "conv-1",
        versionId: "ver-1",
        title: null,
        titleSource: null,
        model: "llama3",
        provider: "ollama",
        providerInstanceId: null,
        recentMessageCount: 10,
        summaryFrequency: 20,
        contextWindow: 32_768,
        compactionThreshold: 80,
        temperature: 0.7,
        maxTokens: 2048,
        topP: 0.9,
        frequencyPenalty: 0,
        presencePenalty: 0,
        stopSequences: [],
        memoryProposalMode: "auto",
        createdAt: now,
        updatedAt: now,
      }),
    )

    expect((await repository.findById("conv-1"))?.contextWindow).toBe(32_768)

    await repository.updateSettings("conv-1", { contextWindow: 8_192 })
    expect((await repository.findById("conv-1"))?.contextWindow).toBe(8_192)

    await repository.updateSettings("conv-1", { contextWindow: null })
    expect((await repository.findById("conv-1"))?.contextWindow).toBeNull()
  })

  it("persists and updates the compaction threshold", async () => {
    const repository = new DrizzleConversationRepository(db)
    await repository.create(
      Conversation.create({
        id: "conv-threshold",
        versionId: "ver-1",
        title: null,
        titleSource: null,
        model: "llama3",
        provider: "ollama",
        providerInstanceId: null,
        recentMessageCount: 10,
        summaryFrequency: 20,
        contextWindow: 32_768,
        compactionThreshold: 80,
        temperature: 0.7,
        maxTokens: 2048,
        topP: 0.9,
        frequencyPenalty: 0,
        presencePenalty: 0,
        stopSequences: [],
        memoryProposalMode: "auto",
        createdAt: now,
        updatedAt: now,
      }),
    )

    expect(
      (await repository.findById("conv-threshold"))?.compactionThreshold,
    ).toBe(80)

    await repository.updateSettings("conv-threshold", {
      compactionThreshold: 60,
    })
    expect(
      (await repository.findById("conv-threshold"))?.compactionThreshold,
    ).toBe(60)
  })
})
