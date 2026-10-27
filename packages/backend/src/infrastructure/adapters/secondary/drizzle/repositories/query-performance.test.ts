import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { buildDatabase, runMigrations } from "../../../../config/database"
import {
  characterAssets,
  characterCards,
  characterVersions,
  characters,
  conversations,
  memories,
  memoryChangeProposals,
  messages,
  summaries,
} from "../schema"
import { DrizzleCharacterRepository } from "./drizzle-character.repository"
import { DrizzleMessageRepository } from "./drizzle-message.repository"

const root = mkdtempSync(join(tmpdir(), "rm-query-performance-"))
const db = buildDatabase(join(root, "test.db"))
const client = (db as unknown as {
  $client: {
    prepare: (sql: string) => { all: (...params: unknown[]) => unknown[] }
    close: () => void
  }
}).$client
const now = new Date("2026-10-27T12:00:00.000Z")

const insertFixture = async (): Promise<void> => {
  await db.insert(characters).values({
    id: "c1",
    name: "Alpha",
    createdAt: now,
    updatedAt: now,
  })
  await db.insert(characterVersions).values([
    {
      id: "v1",
      characterId: "c1",
      name: "Alpha",
      description: "Description",
      greeting: "Hello",
      versionNumber: 1,
      createdAt: now,
    },
    {
      id: "v2",
      characterId: "c1",
      name: "Alpha",
      description: "Description",
      greeting: "Hello again",
      versionNumber: 2,
      createdAt: now,
    },
  ])
  await db.insert(characterCards).values({
    id: "card1",
    versionId: "v1",
    title: "Card",
    content: "Content",
    position: 0,
  })
  await db.insert(characterAssets).values({
    id: "asset1",
    characterId: "c1",
    mimeType: "image/png",
    sizeBytes: 10,
    extension: "png",
    createdAt: now,
  })
  await db.insert(conversations).values({
    id: "conv1",
    versionId: "v1",
    createdAt: now,
    updatedAt: now,
  })
  await db.insert(messages).values([
    {
      id: "m1",
      conversationId: "conv1",
      role: "user",
      content: "First",
      position: 0,
      createdAt: now,
    },
    {
      id: "m2",
      conversationId: "conv1",
      role: "assistant",
      content: "Second",
      position: 1,
      createdAt: new Date(now.getTime() + 1000),
    },
  ])
  await db.insert(summaries).values({
    id: "s1",
    conversationId: "conv1",
    content: "Summary",
    firstMessageId: "m1",
    lastMessageId: "m2",
    createdAt: now,
  })
  await db.insert(memories).values({
    id: "mem1",
    conversationId: "conv1",
    actor: "Alpha",
    title: "Memory",
    description: "Memory description",
    createdBy: "assistant",
    updatedBy: "system",
    createdAt: now,
    updatedAt: now,
  })
  await db.insert(memoryChangeProposals).values({
    id: "p1",
    conversationId: "conv1",
    operation: "CREATE",
    actor: "Alpha",
    title: "Proposal",
    description: "Proposal description",
    createdAt: now,
  })
}

beforeAll(async () => {
  runMigrations(db)
  await insertFixture()
})

afterAll(() => {
  client.close()
  rmSync(root, { recursive: true, force: true })
})

const queryPlan = (sql: string, ...params: unknown[]): string =>
  client
    .prepare(`EXPLAIN QUERY PLAN ${sql}`)
    .all(...params)
    .map((row) => String((row as { detail: string }).detail))
    .join("\n")

describe("S90 query performance", () => {
  it("uses indexes for the hot lookups", () => {
    const plans = [
      queryPlan(
        "SELECT * FROM messages WHERE conversation_id = ? ORDER BY position",
        "conv1",
      ),
      queryPlan(
        "SELECT * FROM summaries WHERE conversation_id = ? ORDER BY created_at DESC LIMIT 1",
        "conv1",
      ),
      queryPlan(
        "SELECT * FROM character_versions WHERE character_id = ? ORDER BY version_number",
        "c1",
      ),
      queryPlan(
        "SELECT * FROM character_cards WHERE version_id = ? ORDER BY position",
        "v1",
      ),
      queryPlan(
        "SELECT * FROM memories WHERE conversation_id = ? ORDER BY priority",
        "conv1",
      ),
      queryPlan(
        "SELECT * FROM memory_change_proposals WHERE conversation_id = ? AND status = ?",
        "conv1",
        "pending",
      ),
    ]

    for (const plan of plans) {
      expect(plan).toContain("USING INDEX")
      expect(plan).not.toContain("SCAN ")
    }
  })

  it("returns the actual last message", async () => {
    const repository = new DrizzleMessageRepository(db)
    const last = await repository.findLastByConversationId("conv1")

    expect(last?.id).toBe("m2")
    expect(last?.position).toBe(1)
  })

  it("reads only the recent window and message statistics", async () => {
    const repository = new DrizzleMessageRepository(db)

    const recent = await repository.findRecentByConversationId("conv1", 1)
    expect(recent.map((message) => message.id)).toEqual(["m2"])

    const latestPage = await repository.findPageByConversationId("conv1", {
      limit: 1,
    })
    expect(latestPage.messages.map((message) => message.id)).toEqual(["m2"])
    expect(latestPage.hasMore).toBe(true)

    const olderPage = await repository.findPageByConversationId("conv1", {
      before: 1,
      limit: 1,
    })
    expect(olderPage.messages.map((message) => message.id)).toEqual(["m1"])
    expect(olderPage.hasMore).toBe(false)

    const after = await repository.findAfterPosition("conv1", 0)
    expect(after.map((message) => message.id)).toEqual(["m2"])

    expect(await repository.findMaxPosition("conv1")).toBe(1)
    expect(await repository.countByConversationId("conv1")).toBe(2)
    expect(
      (await repository.findUserMessageTimes("conv1")).map((date) =>
        date.toISOString(),
      ),
    ).toEqual([now.toISOString()])

    const [stats] = await repository.findStatsByConversationIds(["conv1"])
    expect(stats).toMatchObject({ conversationId: "conv1", messageCount: 2 })
    expect(stats.lastMessageAt?.toISOString()).toBe(
      new Date(now.getTime() + 1000).toISOString(),
    )
  })

  it("lists the current version summary in one batch", async () => {
    const repository = new DrizzleCharacterRepository(db)
    const entries = await repository.listCurrentVersionSummaries()

    expect(entries).toHaveLength(1)
    expect(entries[0].currentVersion.id).toBe("v2")
    expect(entries[0].currentVersion.versionNumber).toBe(2)
  })
})
