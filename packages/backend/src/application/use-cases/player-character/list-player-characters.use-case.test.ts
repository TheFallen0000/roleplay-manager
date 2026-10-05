import { describe, it, expect } from "vitest"

import { ListPlayerCharactersUseCase } from "./list-player-characters.use-case"
import type { PlayerCharacterRepository } from "../../../domain/ports/player-character.repository"
import { PlayerCharacter } from "../../../domain/entities/player-character.entity"

const now = new Date("2026-08-12T10:00:00Z")

const alice = PlayerCharacter.create({
  id: "pc-1",
  name: "Alice",
  description: "Exploradora",
  createdAt: now,
  updatedAt: now,
})

const buildRepo = (items: PlayerCharacter[]): PlayerCharacterRepository => ({
  findById: async () => null,
  list: async () => items,
  create: async (pc) => pc,
  update: async (pc) => pc,
  delete: async () => {},
})

describe("ListPlayerCharactersUseCase", () => {
  it("devuelve los personajes jugados como DTO", async () => {
    const useCase = new ListPlayerCharactersUseCase(buildRepo([alice]))

    const result = await useCase.execute()

    expect(result).toHaveLength(1)
    expect(result[0].id).toBe("pc-1")
    expect(result[0].name).toBe("Alice")
    expect(result[0].createdAt).toBe(now.toISOString())
  })

  it("devuelve una lista vacía cuando no hay ninguno", async () => {
    const useCase = new ListPlayerCharactersUseCase(buildRepo([]))

    expect(await useCase.execute()).toEqual([])
  })
})
