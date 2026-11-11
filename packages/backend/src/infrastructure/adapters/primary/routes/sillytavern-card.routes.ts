import express, { Router } from "express"
import { z } from "zod"

import type { ImportSillyTavernCardUseCase } from "../../../../application/use-cases/character/import-sillytavern-card.use-case"
import type { PreviewSillyTavernCardUseCase } from "../../../../application/use-cases/character/preview-sillytavern-card.use-case"
import type { ExportSillyTavernCardUseCase } from "../../../../application/use-cases/character/export-sillytavern-card.use-case"

const CardPayloadSchema = z.object({
  format: z.enum(["json", "png"]),
  payload: z.string(),
})

const CardExportSchema = z.object({
  format: z.enum(["json", "png"]),
  spec: z.enum(["v2", "v3"]),
})

export const buildSillyTavernCardRouter = (deps: {
  previewSillyTavernCard: PreviewSillyTavernCardUseCase
  importSillyTavernCard: ImportSillyTavernCardUseCase
  exportSillyTavernCard: ExportSillyTavernCardUseCase
}): Router => {
  const router = Router()
  router.use(express.json({ limit: "15mb" }))

  router.post("/characters/cards/preview", async (req, res, next) => {
    try {
      const input = CardPayloadSchema.parse(req.body)
      res.json(await deps.previewSillyTavernCard.execute(input))
    } catch (error) {
      next(error)
    }
  })

  router.post("/characters/cards/import", async (req, res, next) => {
    try {
      const input = CardPayloadSchema.parse(req.body)
      res.status(201).json(await deps.importSillyTavernCard.execute(input))
    } catch (error) {
      next(error)
    }
  })

  router.post("/characters/:id/cards/export", async (req, res, next) => {
    try {
      const input = CardExportSchema.parse(req.body)
      const result = await deps.exportSillyTavernCard.execute({
        characterId: req.params.id,
        format: input.format,
        spec: input.spec,
      })
      if (result.format === "json") {
        res.json(result.body)
      } else {
        res.setHeader("Content-Type", "image/png")
        res.send(result.body)
      }
    } catch (error) {
      next(error)
    }
  })

  return router
}
