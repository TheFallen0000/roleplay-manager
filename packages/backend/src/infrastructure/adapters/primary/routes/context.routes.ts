import { Router } from "express"

import type { GetPromptContextUseCase } from "../../../../application/use-cases/conversation/get-prompt-context.use-case"
import { resolveRequestLocale } from "../request-locale"

export const buildContextRouter = (deps: {
  getPromptContext: GetPromptContextUseCase
}): Router => {
  const router = Router()

  router.get("/conversations/:id/context", async (req, res, next) => {
    try {
      const { id } = req.params as { id: string }
      const pendingMessage = req.query.pendingMessage as string | undefined
      const result = await deps.getPromptContext.execute(
        id,
        pendingMessage,
        resolveRequestLocale(req.header("accept-language")),
      )
      res.json(result)
    } catch (error) {
      next(error)
    }
  })

  return router
}
