import { describe, it, expect, vi } from "vitest"

import { DeletePlayerCharacterUseCase } from "./delete-player-character.use-case"
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
  update: async (pc) => pc,
  delete: vi.fn(async () => {}),
})

describe("DeletePlayerCharacterUseCase", () => {
  it("elimina el personaje jugado", async () => {
    const repo = buildRepo()
    const useCase = new DeletePlayerCharacterUseCase(repo)

    await useCase.execute("pc-1")

    expect(repo.delete).toHaveBeenCalledWith("pc-1")
  })

  it("lanza PlayerCharacterNotFoundError si no existe", async () => {
    const repo: PlayerCharacterRepository = {
      ...buildRepo(),
      findById: async () => null,
    }
    const useCase = new DeletePlayerCharacterUseCase(repo)

    await expect(useCase.execute("missing")).rejects.toThrow(
      "Player character with id 'missing' not found.",
    )
  })
})
