import { Router } from "express"
import { z } from "zod"

import type { CreatePlayerCharacterUseCase } from "../../../../application/use-cases/player-character/create-player-character.use-case"
import type { ListPlayerCharactersUseCase } from "../../../../application/use-cases/player-character/list-player-characters.use-case"
import type { UpdatePlayerCharacterUseCase } from "../../../../application/use-cases/player-character/update-player-character.use-case"
import type { DeletePlayerCharacterUseCase } from "../../../../application/use-cases/player-character/delete-player-character.use-case"

const CreatePlayerCharacterSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().min(1, "Description is required"),
})

const UpdatePlayerCharacterSchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  description: z.string().min(1, "Description is required").optional(),
})

export const buildPlayerCharacterRouter = (deps: {
  createPlayerCharacter: CreatePlayerCharacterUseCase
  listPlayerCharacters: ListPlayerCharactersUseCase
  updatePlayerCharacter: UpdatePlayerCharacterUseCase
  deletePlayerCharacter: DeletePlayerCharacterUseCase
}): Router => {
  const router = Router()

  router.get("/player-characters", async (_req, res, next) => {
    try {
      const result = await deps.listPlayerCharacters.execute()
      res.json(result)
    } catch (error) {
      next(error)
    }
  })

  router.post("/player-characters", async (req, res, next) => {
    try {
      const input = CreatePlayerCharacterSchema.parse(req.body)
      const result = await deps.createPlayerCharacter.execute(input)
      res.status(201).json(result)
    } catch (error) {
      next(error)
    }
  })

  router.put("/player-characters/:id", async (req, res, next) => {
    try {
      const input = UpdatePlayerCharacterSchema.parse(req.body)
      const result = await deps.updatePlayerCharacter.execute(
        req.params.id,
        input,
      )
      res.json(result)
    } catch (error) {
      next(error)
    }
  })

  router.delete("/player-characters/:id", async (req, res, next) => {
    try {
      await deps.deletePlayerCharacter.execute(req.params.id)
      res.status(204).end()
    } catch (error) {
      next(error)
    }
  })

  return router
}
