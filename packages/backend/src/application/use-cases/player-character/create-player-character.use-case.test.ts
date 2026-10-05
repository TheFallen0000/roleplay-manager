import { describe, it, expect, vi } from "vitest"

import { CreatePlayerCharacterUseCase } from "./create-player-character.use-case"
import type { PlayerCharacterRepository } from "../../../domain/ports/player-character.repository"

const buildRepo = (): PlayerCharacterRepository => ({
  findById: async () => null,
  list: async () => [],
  create: vi.fn(async (pc) => pc),
  update: async (pc) => pc,
  delete: async () => {},
})

describe("CreatePlayerCharacterUseCase", () => {
  it("crea un personaje jugado con id nuevo", async () => {
    const repo = buildRepo()
    const useCase = new CreatePlayerCharacterUseCase(repo)

    const result = await useCase.execute({
      name: "Alice",
      description: "Una exploradora curiosa.",
    })

    expect(result.name).toBe("Alice")
    expect(result.description).toBe("Una exploradora curiosa.")
    expect(result.id).toBeTruthy()
    expect(repo.create).toHaveBeenCalledTimes(1)
  })

  it("rechaza nombre vacío", async () => {
    const useCase = new CreatePlayerCharacterUseCase(buildRepo())

    await expect(
      useCase.execute({ name: "   ", description: "Desc" }),
    ).rejects.toThrow("Player character name is required")
  })

  it("rechaza descripción vacía", async () => {
    const useCase = new CreatePlayerCharacterUseCase(buildRepo())

    await expect(
      useCase.execute({ name: "Alice", description: "  " }),
    ).rejects.toThrow("Player character description is required")
  })
})
