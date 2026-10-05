import { describe, it, expect, vi } from "vitest"

import { UpdatePlayerCharacterUseCase } from "./update-player-character.use-case"
import type { PlayerCharacterRepository } from "../../../domain/ports/player-character.repository"
import { PlayerCharacter } from "../../../domain/entities/player-character.entity"

const now = new Date("2026-08-12T10:00:00Z")

const existing = PlayerCharacter.create({
  id: "pc-1",
  name: "Alice",
  description: "Exploradora",
  createdAt: now,
  updatedAt: now,
})

const buildRepo = (): PlayerCharacterRepository => ({
  findById: async () => existing,
  list: async () => [existing],
  create: async (pc) => pc,
  update: vi.fn(async (pc) => pc),
  delete: async () => {},
})

describe("UpdatePlayerCharacterUseCase", () => {
  it("actualiza nombre y descripción", async () => {
    const repo = buildRepo()
    const useCase = new UpdatePlayerCharacterUseCase(repo)

    const result = await useCase.execute("pc-1", {
      name: "Alicia",
      description: "Ahora es una mercader.",
    })

    expect(result.name).toBe("Alicia")
    expect(result.description).toBe("Ahora es una mercader.")
    expect(repo.update).toHaveBeenCalledTimes(1)
  })

  it("mantiene los campos no enviados", async () => {
    const useCase = new UpdatePlayerCharacterUseCase(buildRepo())

    const result = await useCase.execute("pc-1", { name: "Alicia" })

    expect(result.name).toBe("Alicia")
    expect(result.description).toBe("Exploradora")
  })

  it("lanza PlayerCharacterNotFoundError si no existe", async () => {
    const repo: PlayerCharacterRepository = {
      ...buildRepo(),
      findById: async () => null,
    }
    const useCase = new UpdatePlayerCharacterUseCase(repo)

    await expect(
      useCase.execute("missing", { name: "X" }),
    ).rejects.toThrow("Player character with id 'missing' not found.")
  })
})
