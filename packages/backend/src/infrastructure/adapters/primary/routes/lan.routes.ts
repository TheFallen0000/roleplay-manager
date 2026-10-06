import { Router } from "express"

import type { DisableLanAccessUseCase } from "../../../../application/use-cases/lan/disable-lan-access.use-case"
import type { EnableLanAccessUseCase } from "../../../../application/use-cases/lan/enable-lan-access.use-case"
import type { GetLanStatusUseCase } from "../../../../application/use-cases/lan/get-lan-status.use-case"

export const buildLanRouter = (deps: {
  getLanStatus: GetLanStatusUseCase
  enableLanAccess: EnableLanAccessUseCase
  disableLanAccess: DisableLanAccessUseCase
}): Router => {
  const router = Router()

  router.get("/lan", async (_req, res, next) => {
    try {
      res.json(await deps.getLanStatus.execute())
    } catch (error) {
      next(error)
    }
  })

  router.post("/lan/enable", async (_req, res, next) => {
    try {
      res.json(await deps.enableLanAccess.execute())
    } catch (error) {
      next(error)
    }
  })

  router.post("/lan/disable", async (_req, res, next) => {
    try {
      res.json(await deps.disableLanAccess.execute())
    } catch (error) {
      next(error)
    }
  })

  return router
}
