import { createReadStream } from "node:fs"

import { Router } from "express"
import { z } from "zod"

import type { GetRecentLogsUseCase } from "../../../../application/use-cases/logs/get-recent-logs.use-case"
import type { ListLogFilesUseCase } from "../../../../application/use-cases/logs/list-log-files.use-case"
import { validate } from "../middlewares/validation"

const RecentLogsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(2000).default(200),
  level: z.enum(["debug", "info", "warn", "error"]).optional(),
})

export const buildLogsRouter = (deps: {
  getRecentLogs: GetRecentLogsUseCase
  listLogFiles: ListLogFilesUseCase
}): Router => {
  const router = Router()

  router.get(
    "/logs",
    validate(RecentLogsQuerySchema, "query"),
    async (req, res, next) => {
      try {
        const { limit, level } = req.query as unknown as z.infer<
          typeof RecentLogsQuerySchema
        >
        res.json({ entries: await deps.getRecentLogs.execute({ limit, level }) })
      } catch (error) {
        next(error)
      }
    },
  )

  router.get("/logs/download", async (_req, res, next) => {
    try {
      const files = await deps.listLogFiles.execute()
      if (files.length === 0) {
        res.status(404).json({
          error: { code: "NO_LOGS", message: "There are no log files yet." },
        })
        return
      }

      res.setHeader("Content-Type", "text/plain; charset=utf-8")
      res.setHeader(
        "Content-Disposition",
        'attachment; filename="roleplay-manager-logs.txt"',
      )
      for (const file of files) {
        for await (const chunk of createReadStream(file)) {
          res.write(chunk)
        }
      }
      res.end()
    } catch (error) {
      next(error)
    }
  })

  return router
}
