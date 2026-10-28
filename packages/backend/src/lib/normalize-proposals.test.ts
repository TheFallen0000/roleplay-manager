import { describe, expect, it } from "vitest"

import { Memory } from "../domain/entities/memory.entity"
import { normalizeProposals } from "./normalize-proposals"
import type { RawProposal } from "./memory-proposal-extractor"

const buildMemory = (overrides: Partial<Parameters<typeof Memory.create>[0]> = {}): Memory =>
  Memory.create({
    id: "mem-1",
    conversationId: "conv-1",
    actor: "Aria",
    title: "Guardia",
    description: "Vigila la puerta.",
    priority: 7,
    createdBy: "assistant",
    updatedBy: "assistant",
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  })

const raw = (overrides: Partial<RawProposal>): RawProposal => ({
  operation: "CREATE",
  actor: "Aria",
  title: "Título",
  description: "Descripción",
  ...overrides,
})

describe("normalizeProposals", () => {
  it("recorta CREATE y limita la prioridad", () => {
    const result = normalizeProposals(
      [
        raw({
          actor: "  Aria ",
          title: " Herida ",
          description: " Corte en el brazo. ",
          priority: 11,
        }),
      ],
      [],
    )

    expect(result.dropped).toBe(0)
    expect(result.proposals).toEqual([
      {
        operation: "CREATE",
        targetMemoryId: null,
        actor: "Aria",
        title: "Herida",
        description: "Corte en el brazo.",
        priority: 10,
      },
    ])
  })

  it("descarta CREATE sin actor o título y conserva el resto", () => {
    const result = normalizeProposals(
      [
        raw({ actor: "", title: "x" }),
        raw({ actor: "Aria", title: "" }),
        raw({ actor: "Borin", title: "Deuda" }),
      ],
      [],
    )

    expect(result.proposals).toHaveLength(1)
    expect(result.proposals[0].title).toBe("Deuda")
    expect(result.dropped).toBe(2)
  })

  it("completa un UPDATE parcial desde la memoria objetivo", () => {
    const result = normalizeProposals(
      [
        raw({
          operation: "UPDATE",
          targetMemoryId: "mem-1",
          actor: "",
          title: "Nuevo título",
          description: "",
        }),
      ],
      [buildMemory()],
    )

    expect(result.proposals[0]).toEqual({
      operation: "UPDATE",
      targetMemoryId: "mem-1",
      actor: "Aria",
      title: "Nuevo título",
      description: "Vigila la puerta.",
      priority: 7,
    })
  })

  it("hidrata DELETE desde la memoria objetivo", () => {
    const result = normalizeProposals(
      [
        raw({
          operation: "DELETE",
          targetMemoryId: "mem-1",
          actor: "",
          title: "",
          description: "",
        }),
      ],
      [buildMemory()],
    )

    expect(result.proposals[0]).toMatchObject({
      operation: "DELETE",
      targetMemoryId: "mem-1",
      actor: "Aria",
      title: "Guardia",
      description: "Vigila la puerta.",
      priority: 7,
    })
  })

  it("descarta UPDATE y DELETE sin objetivo existente", () => {
    const result = normalizeProposals(
      [
        raw({ operation: "UPDATE", targetMemoryId: "missing" }),
        raw({ operation: "DELETE", targetMemoryId: "missing" }),
        raw({ operation: "DELETE", targetMemoryId: undefined }),
      ],
      [],
    )

    expect(result.proposals).toHaveLength(0)
    expect(result.dropped).toBe(3)
  })

  it("redondea y limita prioridades fuera de rango", () => {
    const result = normalizeProposals(
      [
        raw({ title: "a", priority: 0 }),
        raw({ title: "b", priority: 9.6 }),
        raw({ title: "c" }),
      ],
      [],
    )

    expect(result.proposals.map((proposal) => proposal.priority)).toEqual([
      1, 10, 5,
    ])
  })

  it("un UPDATE sin prioridad conserva la de la memoria", () => {
    const result = normalizeProposals(
      [raw({ operation: "UPDATE", targetMemoryId: "mem-1", title: "Otro" })],
      [buildMemory({ priority: 9 })],
    )

    expect(result.proposals[0].priority).toBe(9)
  })
})
