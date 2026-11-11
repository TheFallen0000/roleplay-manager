import express, { Router } from "express"
import { z } from "zod"

import type { CreateLorebookEntryUseCase } from "../../../../application/use-cases/character/lorebook/create-lorebook-entry.use-case"
import type { DeleteLorebookEntryUseCase } from "../../../../application/use-cases/character/lorebook/delete-lorebook-entry.use-case"
import type { ExportLorebookUseCase } from "../../../../application/use-cases/character/lorebook/export-lorebook.use-case"
import type { GetLorebookUseCase } from "../../../../application/use-cases/character/lorebook/get-lorebook.use-case"
import type { ImportLorebookUseCase } from "../../../../application/use-cases/character/lorebook/import-lorebook.use-case"
import type { PreviewLorebookUseCase } from "../../../../application/use-cases/character/lorebook/preview-lorebook.use-case"
import type { ReorderLorebookEntriesUseCase } from "../../../../application/use-cases/character/lorebook/reorder-lorebook-entries.use-case"
import type { UpdateLorebookEntryUseCase } from "../../../../application/use-cases/character/lorebook/update-lorebook-entry.use-case"
import type { UpdateLorebookUseCase } from "../../../../application/use-cases/character/lorebook/update-lorebook.use-case"

const LorebookPreviewSchema = z.object({
  format: z.literal("json"),
  payload: z.string(),
})

const LorebookImportSchema = z.object({
  format: z.enum(["json", "ccv3", "st-native"]),
  payload: z.string(),
  replace: z.boolean().optional(),
})

const LorebookExportSchema = z.object({
  format: z.enum(["ccv3", "st-native"]),
})

const LorebookSettingsSchema = z.object({
  name: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  scanDepth: z.number().int().min(0).max(64).optional(),
  tokenBudget: z.number().int().min(0).max(100_000).optional(),
  recursiveScanning: z.boolean().optional(),
})

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

const UpdateLorebookEntrySchema = LorebookEntrySchema.partial()

const ReorderLorebookEntriesSchema = z.object({
  entryIds: z.array(z.string()),
})

export const buildLorebookRouter = (deps: {
  previewLorebook: PreviewLorebookUseCase
  importLorebook: ImportLorebookUseCase
  exportLorebook: ExportLorebookUseCase
  getLorebook: GetLorebookUseCase
  updateLorebook: UpdateLorebookUseCase
  createLorebookEntry: CreateLorebookEntryUseCase
  updateLorebookEntry: UpdateLorebookEntryUseCase
  deleteLorebookEntry: DeleteLorebookEntryUseCase
  reorderLorebookEntries: ReorderLorebookEntriesUseCase
}): Router => {
  const router = Router()
  router.use(express.json({ limit: "15mb" }))

  router.post("/lorebooks/preview", async (req, res, next) => {
    try {
      const input = LorebookPreviewSchema.parse(req.body)
      res.json(await deps.previewLorebook.execute(input))
    } catch (error) {
      next(error)
    }
  })

  router.post("/characters/:id/lorebook/import", async (req, res, next) => {
    try {
      const body = LorebookImportSchema.parse(req.body)
      const result = await deps.importLorebook.execute({
        characterId: req.params.id,
        format: body.format,
        payload: body.payload,
        ...(body.replace === undefined ? {} : { replace: body.replace }),
      })
      res.json(result)
    } catch (error) {
      next(error)
    }
  })

  router.post("/characters/:id/lorebook/export", async (req, res, next) => {
    try {
      const body = LorebookExportSchema.parse(req.body)
      const result = await deps.exportLorebook.execute({
        characterId: req.params.id,
        format: body.format,
      })
      res.json(result)
    } catch (error) {
      next(error)
    }
  })

  router.get("/characters/:id/lorebook", async (req, res, next) => {
    try {
      res.json(await deps.getLorebook.execute({ characterId: req.params.id }))
    } catch (error) {
      next(error)
    }
  })

  router.put("/characters/:id/lorebook", async (req, res, next) => {
    try {
      const body = LorebookSettingsSchema.parse(req.body)
      const result = await deps.updateLorebook.execute({
        characterId: req.params.id,
        ...body,
      })
      res.json(result)
    } catch (error) {
      next(error)
    }
  })

  router.post("/characters/:id/lorebook/entries", async (req, res, next) => {
    try {
      const body = LorebookEntrySchema.parse(req.body)
      const result = await deps.createLorebookEntry.execute({
        characterId: req.params.id,
        ...body,
      })
      res.status(201).json(result)
    } catch (error) {
      next(error)
    }
  })

  router.put("/characters/:id/lorebook/entries", async (req, res, next) => {
    try {
      const body = ReorderLorebookEntriesSchema.parse(req.body)
      await deps.reorderLorebookEntries.execute({
        characterId: req.params.id,
        entryIds: body.entryIds,
      })
      res.json({ ok: true })
    } catch (error) {
      next(error)
    }
  })

  router.put(
    "/characters/:id/lorebook/entries/:entryId",
    async (req, res, next) => {
      try {
        const body = UpdateLorebookEntrySchema.parse(req.body)
        const result = await deps.updateLorebookEntry.execute({
          characterId: req.params.id,
          entryId: req.params.entryId,
          ...body,
        })
        res.json(result)
      } catch (error) {
        next(error)
      }
    },
  )

  router.delete(
    "/characters/:id/lorebook/entries/:entryId",
    async (req, res, next) => {
      try {
        await deps.deleteLorebookEntry.execute({
          characterId: req.params.id,
          entryId: req.params.entryId,
        })
        res.status(204).end()
      } catch (error) {
        next(error)
      }
    },
  )

  return router
}
