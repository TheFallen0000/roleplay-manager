import express, { Router } from "express"
import { z } from "zod"

import { MAX_LOREBOOK_ENTRIES } from "@workspace/shared/lib/sillytavern-card"

import type { CreateLorebookUseCase } from "../../../../application/use-cases/character/lorebook/create-lorebook.use-case"
import type { ExportLorebookUseCase } from "../../../../application/use-cases/character/lorebook/export-lorebook.use-case"
import type { GetLorebookByIdUseCase } from "../../../../application/use-cases/character/lorebook/get-lorebook-by-id.use-case"
import type { GetLorebookVersionUseCase } from "../../../../application/use-cases/character/lorebook/get-lorebook-version.use-case"
import type { ListLorebookVersionsUseCase } from "../../../../application/use-cases/character/lorebook/list-lorebook-versions.use-case"
import type { ListLorebooksUseCase } from "../../../../application/use-cases/character/lorebook/list-lorebooks.use-case"
import type { UpdateLorebookByIdUseCase } from "../../../../application/use-cases/character/lorebook/update-lorebook-by-id.use-case"

const SelectiveLogicSchema = z.union([
  z.literal(0),
  z.literal(1),
  z.literal(2),
  z.literal(3),
])

const LorebookEntrySchema = z.object({
  name: z.string().nullable().optional(),
  sourceId: z.string().nullable().optional(),
  keys: z.array(z.string()),
  secondaryKeys: z.array(z.string()).optional(),
  comment: z.string().nullable().optional(),
  content: z.string(),
  constant: z.boolean().optional(),
  selective: z.boolean().optional(),
  selectiveLogic: SelectiveLogicSchema.optional(),
  insertionOrder: z.number().int().min(0).max(10_000).optional(),
  position: z.enum(["before_char", "after_char"]).optional(),
  priority: z.number().int().min(-10_000).max(10_000).optional(),
  enabled: z.boolean().optional(),
  caseSensitive: z.boolean().optional(),
  wholeWords: z.boolean().optional(),
})

const LorebookEntriesSchema = z
  .array(LorebookEntrySchema)
  .max(MAX_LOREBOOK_ENTRIES)

const LorebookSettingsSchema = z.object({
  name: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  scanDepth: z.number().int().min(0).max(64).optional(),
  tokenBudget: z.number().int().min(0).max(100_000).optional(),
  recursiveScanning: z.boolean().optional(),
})

const CreateLorebookSchema = LorebookSettingsSchema.extend({
  name: z.string().min(1),
  entries: LorebookEntriesSchema.optional(),
})

const UpdateLorebookSchema = LorebookSettingsSchema.extend({
  entries: LorebookEntriesSchema.optional(),
})

const ListLorebooksQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).optional(),
  offset: z.coerce.number().int().min(0).optional(),
})

const ExportLorebookSchema = z.object({
  format: z.enum(["ccv3", "st-native"]),
})

export const buildLorebooksRouter = (deps: {
  listLorebooks: ListLorebooksUseCase
  getLorebookById: GetLorebookByIdUseCase
  listLorebookVersions: ListLorebookVersionsUseCase
  getLorebookVersion: GetLorebookVersionUseCase
  createLorebook: CreateLorebookUseCase
  updateLorebook: UpdateLorebookByIdUseCase
  exportLorebook: ExportLorebookUseCase
}): Router => {
  const router = Router()
  router.use(express.json({ limit: "15mb" }))

  router.get("/lorebooks", async (req, res, next) => {
    try {
      const query = ListLorebooksQuerySchema.parse(req.query)
      res.json(await deps.listLorebooks.execute(query))
    } catch (error) {
      next(error)
    }
  })

  router.get("/lorebooks/:id/versions/:versionId", async (req, res, next) => {
    try {
      res.json(
        await deps.getLorebookVersion.execute({
          lorebookId: req.params.id,
          versionId: req.params.versionId,
        }),
      )
    } catch (error) {
      next(error)
    }
  })

  router.get("/lorebooks/:id/versions", async (req, res, next) => {
    try {
      res.json(
        await deps.listLorebookVersions.execute({
          lorebookId: req.params.id,
        }),
      )
    } catch (error) {
      next(error)
    }
  })

  router.post("/lorebooks/:id/export", async (req, res, next) => {
    try {
      const body = ExportLorebookSchema.parse(req.body)
      res.json(
        await deps.exportLorebook.executeById({
          lorebookId: req.params.id,
          format: body.format,
        }),
      )
    } catch (error) {
      next(error)
    }
  })

  router.get("/lorebooks/:id", async (req, res, next) => {
    try {
      res.json(await deps.getLorebookById.execute({ id: req.params.id }))
    } catch (error) {
      next(error)
    }
  })

  router.post("/lorebooks", async (req, res, next) => {
    try {
      const body = CreateLorebookSchema.parse(req.body)
      res.status(201).json(await deps.createLorebook.execute(body))
    } catch (error) {
      next(error)
    }
  })

  router.put("/lorebooks/:id", async (req, res, next) => {
    try {
      const body = UpdateLorebookSchema.parse(req.body)
      res.json(
        await deps.updateLorebook.execute({ id: req.params.id, ...body }),
      )
    } catch (error) {
      next(error)
    }
  })

  return router
}
