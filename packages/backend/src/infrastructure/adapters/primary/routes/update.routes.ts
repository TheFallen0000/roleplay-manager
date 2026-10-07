import { Router } from "express"
import { z } from "zod"

import type { ApplyUpdateUseCase } from "../../../../application/use-cases/updates/apply-update.use-case"
import type { CheckUpdatesUseCase } from "../../../../application/use-cases/updates/check-updates.use-case"
import type { CreateBackupUseCase } from "../../../../application/use-cases/updates/create-backup.use-case"
import type { GetUpdateStatusUseCase } from "../../../../application/use-cases/updates/get-update-status.use-case"

const ApplyBodySchema = z.object({
  withBackup: z.boolean().optional(),
})

export const buildUpdateRouter = (deps: {
  getUpdateStatus: GetUpdateStatusUseCase
  checkUpdates: CheckUpdatesUseCase
  applyUpdate: ApplyUpdateUseCase
  createBackup: CreateBackupUseCase
}): Router => {
  const router = Router()

  router.get("/updates", async (_req, res, next) => {
    try {
      res.json(await deps.getUpdateStatus.execute())
    } catch (error) {
      next(error)
    }
  })

  router.post("/updates/check", async (_req, res, next) => {
    try {
      res.json(await deps.checkUpdates.execute())
    } catch (error) {
      next(error)
    }
  })

  router.post("/updates/apply", async (req, res, next) => {
    try {
      const body = ApplyBodySchema.parse(req.body ?? {})
      res.json(
        await deps.applyUpdate.execute({ withBackup: body.withBackup ?? true }),
      )
    } catch (error) {
      next(error)
    }
  })

  router.post("/updates/backup", async (_req, res, next) => {
    try {
      res.json(await deps.createBackup.execute())
    } catch (error) {
      next(error)
    }
  })

  return router
}
