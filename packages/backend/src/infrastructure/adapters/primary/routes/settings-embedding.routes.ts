import { Router } from "express"
import { z } from "zod"

import type { ConfigureEmbeddingInput } from "@workspace/shared/types/embedding"

import type { ConfigureEmbeddingUseCase } from "../../../../application/use-cases/memory/configure-embedding.use-case"
import type { GetEmbeddingConfigUseCase } from "../../../../application/use-cases/memory/get-embedding-config.use-case"
import type { ReindexMemoryEmbeddingsUseCase } from "../../../../application/use-cases/memory/reindex-memory-embeddings.use-case"
import { validate } from "../middlewares/validation"

const ConfigureEmbeddingBodySchema = z.object({
  provider: z.enum(["ollama", "openai-compatible"]).nullable(),
  providerInstanceId: z.string().nullable().optional(),
  models: z
    .object({
      ollama: z.string().optional(),
      openaiCompatible: z.string().optional(),
    })
    .optional(),
})

export const buildSettingsEmbeddingRouter = (deps: {
  getEmbeddingConfig: GetEmbeddingConfigUseCase
  configureEmbedding: ConfigureEmbeddingUseCase
  reindexMemoryEmbeddings: ReindexMemoryEmbeddingsUseCase
}): Router => {
  const router = Router()

  router.get("/embeddings", async (_req, res, next) => {
    try {
      res.json(await deps.getEmbeddingConfig.execute())
    } catch (error) {
      next(error)
    }
  })

  router.put(
    "/embeddings",
    validate(ConfigureEmbeddingBodySchema),
    async (req, res, next) => {
      try {
        const body = req.body as z.infer<typeof ConfigureEmbeddingBodySchema>
        const input: ConfigureEmbeddingInput = {
          provider: body.provider,
          providerInstanceId: body.providerInstanceId ?? null,
          models: body.models ?? {},
        }
        await deps.configureEmbedding.execute(input)
        // The response is always the public DTO: it never echoes an API key.
        res.json(await deps.getEmbeddingConfig.execute())
      } catch (error) {
        next(error)
      }
    },
  )

  router.post("/embeddings/reindex", async (_req, res, next) => {
    try {
      res.json(await deps.reindexMemoryEmbeddings.execute())
    } catch (error) {
      next(error)
    }
  })

  return router
}
