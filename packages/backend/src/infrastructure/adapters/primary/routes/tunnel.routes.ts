import { Router } from "express"

import type { DisableTunnelUseCase } from "../../../../application/use-cases/tunnel/disable-tunnel.use-case"
import type { EnableTunnelUseCase } from "../../../../application/use-cases/tunnel/enable-tunnel.use-case"
import type { GetTunnelStatusUseCase } from "../../../../application/use-cases/tunnel/get-tunnel-status.use-case"

export const buildTunnelRouter = (deps: {
  getTunnelStatus: GetTunnelStatusUseCase
  enableTunnel: EnableTunnelUseCase
  disableTunnel: DisableTunnelUseCase
}): Router => {
  const router = Router()

  router.get("/tunnel", async (_req, res, next) => {
    try {
      res.json(await deps.getTunnelStatus.execute())
    } catch (error) {
      next(error)
    }
  })

  router.post("/tunnel/enable", async (_req, res, next) => {
    try {
      res.json(await deps.enableTunnel.execute())
    } catch (error) {
      next(error)
    }
  })

  router.post("/tunnel/disable", async (_req, res, next) => {
    try {
      res.json(await deps.disableTunnel.execute())
    } catch (error) {
      next(error)
    }
  })

  return router
}
