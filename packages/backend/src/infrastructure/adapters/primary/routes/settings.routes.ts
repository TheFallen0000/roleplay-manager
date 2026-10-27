import { Router } from "express"
import { z } from "zod"

import type { GetDefaultProviderUseCase } from "../../../../application/use-cases/provider/get-default-provider.use-case"
import type { ConfigureDefaultProviderUseCase } from "../../../../application/use-cases/provider/configure-default-provider.use-case"
import type { SetProviderModelUseCase } from "../../../../application/use-cases/provider/set-provider-model.use-case"
import { validate } from "../middlewares/validation"

const ConfigureBodySchema = z.object({
  provider: z.enum(["ollama", "openai-compatible"]),
  providerInstanceId: z.string().nullable().optional(),
  force: z.boolean().optional(),
})

const SetProviderModelSchema = z.object({
  model: z.string().trim().min(1),
  providerInstanceId: z.string().optional(),
  force: z.boolean().optional(),
})

const OpenAICompatibleConfigSchema = z.object({
  url: z.url(),
  apiKey: z.string().min(1).optional(),
})

export const buildSettingsRouter = (deps: {
  getDefaultProvider: GetDefaultProviderUseCase
  configureDefaultProvider: ConfigureDefaultProviderUseCase
  setProviderModel: SetProviderModelUseCase
  settings: {
    get(key: string): Promise<string | null>
    set(key: string, value: string): Promise<void>
  }
}): Router => {
  const router = Router()

  router.get("/default-provider", async (_req, res, next) => {
    try {
      const result = await deps.getDefaultProvider.execute()
      res.json(result)
    } catch (error) {
      next(error)
    }
  })

  router.put(
    "/default-provider",
    validate(ConfigureBodySchema),
    async (req, res, next) => {
      try {
        const body = req.body as z.infer<typeof ConfigureBodySchema>
        const result = await deps.configureDefaultProvider.execute(body)
        res.json(result)
      } catch (error) {
        next(error)
      }
    },
  )

  router.put(
    "/provider-model/:providerId",
    validate(SetProviderModelSchema),
    async (req, res, next) => {
      try {
        const providerId = req.params.providerId as "ollama" | "openai-compatible"
        const body = req.body as z.infer<typeof SetProviderModelSchema>
        await deps.setProviderModel.execute(providerId, body)
        res.status(204).end()
      } catch (error) {
        next(error)
      }
    },
  )

  router.get("/openai-compatible", async (_req, res, next) => {
    try {
      const [url, apiKey] = await Promise.all([
        deps.settings.get("provider_openai_compatible_url"),
        deps.settings.get("provider_openai_compatible_api_key"),
      ])
      res.json({ url: url ?? "", hasApiKey: apiKey !== null })
    } catch (error) {
      next(error)
    }
  })

  router.put(
    "/openai-compatible",
    validate(OpenAICompatibleConfigSchema),
    async (req, res, next) => {
      try {
        const body = req.body as z.infer<typeof OpenAICompatibleConfigSchema>
        await deps.settings.set(
          "provider_openai_compatible_url",
          body.url,
        )
        if (body.apiKey !== undefined) {
          await deps.settings.set(
            "provider_openai_compatible_api_key",
            body.apiKey,
          )
        }
        res.status(204).end()
      } catch (error) {
        next(error)
      }
    },
  )

  return router
}
