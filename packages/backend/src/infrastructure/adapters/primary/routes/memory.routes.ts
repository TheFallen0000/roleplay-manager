import { Router } from "express"

import type { ListMemoriesUseCase } from "../../../../application/use-cases/memory/list-memories.use-case"
import type { CreateMemoryUseCase } from "../../../../application/use-cases/memory/create-memory.use-case"
import type { UpdateMemoryUseCase } from "../../../../application/use-cases/memory/update-memory.use-case"
import type { DeleteMemoryUseCase } from "../../../../application/use-cases/memory/delete-memory.use-case"
import type { ListProposalsUseCase } from "../../../../application/use-cases/memory/list-proposals.use-case"
import type { ApplyMemoryChangesUseCase } from "../../../../application/use-cases/memory/apply-memory-changes.use-case"
import type { ApplyAllMemoryChangesUseCase } from "../../../../application/use-cases/memory/apply-all-memory-changes.use-case"
import type { DecayConversationMemoryUseCase } from "../../../../application/use-cases/memory/decay-conversation-memory.use-case"
import { validate } from "../middlewares/validation"
import { z } from "zod"

const MemoryTypeSchema = z.enum(["fact", "episode", "thread"])

const CreateMemorySchema = z.object({
  actor: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  priority: z.number().int().min(1).max(10).optional(),
  type: MemoryTypeSchema.optional(),
})

const UpdateMemorySchema = z.object({
  actor: z.string().min(1).optional(),
  title: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  priority: z.number().int().min(1).max(10).optional(),
  type: MemoryTypeSchema.optional(),
})

const ApplyProposalsSchema = z.object({
  decisions: z.array(
    z.object({
      proposalId: z.string().min(1),
      action: z.enum(["apply", "discard"]),
      overrides: z
        .object({
          actor: z.string().optional(),
          title: z.string().optional(),
          description: z.string().optional(),
          priority: z.number().int().min(1).max(10).optional(),
          type: MemoryTypeSchema.optional(),
        })
        .optional(),
    }),
  ),
})

export const buildMemoryRouter = (deps: {
  listMemories: ListMemoriesUseCase
  createMemory: CreateMemoryUseCase
  updateMemory: UpdateMemoryUseCase
  deleteMemory: DeleteMemoryUseCase
  listProposals: ListProposalsUseCase
  applyMemoryChanges: ApplyMemoryChangesUseCase
  applyAllMemoryChanges: ApplyAllMemoryChangesUseCase
  decayMemories: DecayConversationMemoryUseCase
}): Router => {
  const router = Router()

  router.get("/conversations/:id/memories", async (req, res, next) => {
    try {
      const { id } = req.params as { id: string }
      const result = await deps.listMemories.execute(id)
      res.json(result)
    } catch (error) {
      next(error)
    }
  })

  router.post(
    "/conversations/:id/memories",
    validate(CreateMemorySchema),
    async (req, res, next) => {
      try {
        const { id } = req.params as { id: string }
        const body = req.body as z.infer<typeof CreateMemorySchema>
        const result = await deps.createMemory.execute(id, body)
        res.status(201).json(result)
      } catch (error) {
        next(error)
      }
    },
  )

  router.put(
    "/conversations/:id/memories/:memoryId",
    validate(UpdateMemorySchema),
    async (req, res, next) => {
      try {
        const { id, memoryId } = req.params as { id: string; memoryId: string }
        const body = req.body as z.infer<typeof UpdateMemorySchema>
        const result = await deps.updateMemory.execute(id, memoryId, body)
        res.json(result)
      } catch (error) {
        next(error)
      }
    },
  )

  router.delete(
    "/conversations/:id/memories/:memoryId",
    async (req, res, next) => {
      try {
        const { id, memoryId } = req.params as { id: string; memoryId: string }
        await deps.deleteMemory.execute(id, memoryId)
        res.status(204).end()
      } catch (error) {
        next(error)
      }
    },
  )

  router.get(
    "/conversations/:id/memories/proposals",
    async (req, res, next) => {
      try {
        const { id } = req.params as { id: string }
        const result = await deps.listProposals.execute(id)
        res.json(result)
      } catch (error) {
        next(error)
      }
    },
  )

  router.post(
    "/conversations/:id/memories/proposals/apply",
    validate(ApplyProposalsSchema),
    async (req, res, next) => {
      try {
        const { id } = req.params as { id: string }
        const { decisions } = req.body as z.infer<typeof ApplyProposalsSchema>
        const result = await deps.applyMemoryChanges.execute({
          conversationId: id,
          decisions,
        })
        res.json(result)
      } catch (error) {
        next(error)
      }
    },
  )

  router.post(
    "/conversations/:id/memories/proposals/apply-all",
    async (req, res, next) => {
      try {
        const { id } = req.params as { id: string }
        const result = await deps.applyAllMemoryChanges.execute({
          conversationId: id,
          processedBy: "user",
        })
        res.json(result)
      } catch (error) {
        next(error)
      }
    },
  )

  router.post(
    "/conversations/:id/memories/decay",
    async (req, res, next) => {
      try {
        const { id } = req.params as { id: string }
        const result = await deps.decayMemories.execute({
          conversationId: id,
          manual: true,
        })
        res.json(result)
      } catch (error) {
        next(error)
      }
    },
  )

  return router
}
