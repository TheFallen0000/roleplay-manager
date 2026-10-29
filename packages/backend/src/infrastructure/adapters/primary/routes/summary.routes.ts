import { Router } from "express"
import { z } from "zod"

import type { ListSummariesUseCase } from "../../../../application/use-cases/summary/list-summaries.use-case"
import type { CompactConversationUseCase } from "../../../../application/use-cases/summary/compact-conversation.use-case"
import type { UpdateSummaryUseCase } from "../../../../application/use-cases/summary/update-summary.use-case"
import type { DeleteSummaryUseCase } from "../../../../application/use-cases/summary/delete-summary.use-case"
import type { GenerateConversationTitleUseCase } from "../../../../application/use-cases/conversation/generate-conversation-title.use-case"
import type { Logger } from "../../../../domain/ports/logger.port"
import { resolveRequestLocale } from "../request-locale"
import { validate } from "../middlewares/validation"

const UpdateSummarySchema = z.object({
  content: z.string().min(1),
})

export const buildSummaryRouter = (deps: {
  listSummaries: ListSummariesUseCase
  compactConversation: CompactConversationUseCase
  updateSummary: UpdateSummaryUseCase
  deleteSummary: DeleteSummaryUseCase
  generateConversationTitle: GenerateConversationTitleUseCase
  logger: Logger
}): Router => {
  const router = Router()

  router.get("/conversations/:id/summaries", async (req, res, next) => {
    try {
      const { id } = req.params as { id: string }
      const result = await deps.listSummaries.execute(id)
      res.json(result)
    } catch (error) {
      next(error)
    }
  })

  router.post(
    "/conversations/:id/summaries/generate",
    async (req, res, next) => {
      try {
        const { id } = req.params as { id: string }
        const result = await deps.compactConversation.execute(
          id,
          resolveRequestLocale(req.header("accept-language")),
        )
        if (result.error) {
          res.status(400).json(result)
          return
        }

        try {
          const titleResult = await deps.generateConversationTitle.execute(id, {
            locale: resolveRequestLocale(req.header("accept-language")),
          })
          res.status(201).json({
            summary: result.summary,
            title: titleResult.title,
            titleSource: titleResult.titleSource,
          })
        } catch (error) {
          deps.logger.error(
            "Failed to generate conversation title after manual summary",
            error as Error,
            { conversationId: id },
          )
          res.status(201).json({ summary: result.summary })
        }
      } catch (error) {
        next(error)
      }
    },
  )

  router.put(
    "/conversations/:id/summaries/:summaryId",
    validate(UpdateSummarySchema),
    async (req, res, next) => {
      try {
        const { id, summaryId } = req.params as { id: string; summaryId: string }
        const body = req.body as z.infer<typeof UpdateSummarySchema>
        const result = await deps.updateSummary.execute(id, summaryId, body)
        res.json(result)
      } catch (error) {
        next(error)
      }
    },
  )

  router.delete(
    "/conversations/:id/summaries/:summaryId",
    async (req, res, next) => {
      try {
        const { id, summaryId } = req.params as { id: string; summaryId: string }
        await deps.deleteSummary.execute(id, summaryId)
        res.status(204).end()
      } catch (error) {
        next(error)
      }
    },
  )

  return router
}
