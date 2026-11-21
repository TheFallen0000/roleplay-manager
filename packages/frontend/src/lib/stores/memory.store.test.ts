import { describe, it, expect, vi, beforeEach } from "vitest"

import * as memoriesApi from "@/lib/api/memories"
import { useMemoryStore } from "./memory.store"
import type { MemoryDTO } from "@workspace/shared/types/memory"

vi.mock("@/lib/api/memories", () => ({
  decayConversationMemories: vi.fn(),
  listMemories: vi.fn(),
  createMemory: vi.fn(),
  applyProposals: vi.fn(),
  applyAllProposals: vi.fn(),
}))

const buildMemory = (
  id: string,
  type: MemoryDTO["type"] = "fact",
): MemoryDTO => ({
  id,
  conversationId: "conv-1",
  actor: "Test",
  title: `Memory ${id}`,
  description: "A test memory",
  priority: 5,
  type,
  createdBy: "assistant",
  updatedBy: "system",
  createdAt: "2026-07-31T12:00:00Z",
  updatedAt: "2026-07-31T12:00:00Z",
})

describe("useMemoryStore.runDecay", () => {
  beforeEach(() => {
    useMemoryStore.getState().reset()
    vi.clearAllMocks()
  })

  it("llama al endpoint de decay y refresca la lista de memorias", async () => {
    vi.mocked(memoriesApi.decayConversationMemories).mockResolvedValue({ deleted: 2 })
    vi.mocked(memoriesApi.listMemories).mockResolvedValue([buildMemory("m-1")])

    const result = await useMemoryStore.getState().runDecay("conv-1")

    expect(memoriesApi.decayConversationMemories).toHaveBeenCalledWith("conv-1")
    expect(memoriesApi.listMemories).toHaveBeenCalledWith("conv-1")
    expect(result).toEqual({ deleted: 2 })
  })

  it("guarda el registro de la última limpieza con fecha y conteo", async () => {
    vi.mocked(memoriesApi.decayConversationMemories).mockResolvedValue({ deleted: 2 })
    vi.mocked(memoriesApi.listMemories).mockResolvedValue([])

    await useMemoryStore.getState().runDecay("conv-1")

    const lastDecay = useMemoryStore.getState().lastDecay
    expect(lastDecay).not.toBeNull()
    expect(lastDecay!.deleted).toBe(2)
    expect(() => new Date(lastDecay!.at)).not.toThrow()
  })

  it("reemplaza la lista de memorias con el estado post-borrado", async () => {
    vi.mocked(memoriesApi.decayConversationMemories).mockResolvedValue({ deleted: 1 })
    vi.mocked(memoriesApi.listMemories).mockResolvedValue([buildMemory("m-kept")])

    useMemoryStore.setState({
      memories: [buildMemory("m-kept"), buildMemory("m-gone")],
    })
    await useMemoryStore.getState().runDecay("conv-1")

    expect(useMemoryStore.getState().memories.map((m) => m.id)).toEqual(["m-kept"])
  })

  it("propaga el error del endpoint al llamador", async () => {
    vi.mocked(memoriesApi.decayConversationMemories).mockRejectedValue(
      new Error("boom"),
    )

    await expect(useMemoryStore.getState().runDecay("conv-1")).rejects.toThrow("boom")
  })

  it("crea una memoria con su tipo y la añade al estado", async () => {
    vi.mocked(memoriesApi.createMemory).mockResolvedValue(
      buildMemory("m-new", "thread"),
    )

    const created = await useMemoryStore.getState().createMemory("conv-1", {
      actor: "Test",
      title: "Promesa",
      description: "Volverá.",
      type: "thread",
    })

    expect(memoriesApi.createMemory).toHaveBeenCalledWith(
      "conv-1",
      expect.objectContaining({ type: "thread" }),
    )
    expect(created.type).toBe("thread")
    expect(useMemoryStore.getState().memories.at(-1)?.type).toBe("thread")
  })

  it("devuelve result.memories al aplicar propuestas", async () => {
    const memories = [buildMemory("m-1"), buildMemory("m-2", "thread")]
    vi.mocked(memoriesApi.applyProposals).mockResolvedValue({
      memories,
      created: 1,
      updated: 1,
      discarded: 0,
    })

    const result = await useMemoryStore.getState().applyProposals("conv-1", [
      { proposalId: "proposal-1", action: "apply" },
    ])

    expect(result).toEqual(memories)
  })

  it("devuelve result.memories al aplicar todas las propuestas", async () => {
    const memories = [buildMemory("m-1"), buildMemory("m-2", "episode")]
    vi.mocked(memoriesApi.applyAllProposals).mockResolvedValue({
      memories,
      created: 2,
      updated: 0,
      discarded: 0,
    })

    const result = await useMemoryStore.getState().applyAllProposals("conv-1")

    expect(result).toEqual(memories)
  })
})
