import { Router } from "express"
import { z } from "zod"

import type { ListProvidersUseCase } from "../../../../application/use-cases/provider/list-providers.use-case"
import type { ValidateProviderConnectionUseCase } from "../../../../application/use-cases/provider/validate-provider-connection.use-case"
import type { ListProviderModelsUseCase } from "../../../../application/use-cases/provider/list-provider-models.use-case"
import type { GetModelCapabilitiesUseCase } from "../../../../application/use-cases/provider/get-model-capabilities.use-case"

const ProviderIdSchema = z.enum(["ollama", "openai-compatible"])

export const buildProviderRouter = (deps: {
  listProviders: ListProvidersUseCase
  validateProviderConnection: ValidateProviderConnectionUseCase
  listProviderModels: ListProviderModelsUseCase
  getModelCapabilities: GetModelCapabilitiesUseCase
}): Router => {
  const router = Router()

  router.get("/providers", (_req, res, next) => {
    try {
      const result = deps.listProviders.execute()
      res.json(result)
    } catch (error) {
      next(error)
    }
  })

  router.get("/providers/:id/status", async (req, res, next) => {
    try {
      const idResult = ProviderIdSchema.safeParse(req.params.id)
      if (!idResult.success) {
        res.status(404).json({
          error: {
            code: "PROVIDER_NOT_FOUND",
            message: `Unknown provider id: ${req.params.id}`,
          },
        })
        return
      }
      const result = await deps.validateProviderConnection.execute(
        idResult.data,
      )
      res.json(result)
    } catch (error) {
      next(error)
    }
  })

  const ModelsQuerySchema = z.object({
    instanceId: z.string().optional(),
  })

  router.get("/providers/:id/models", async (req, res, next) => {
    try {
      const idResult = ProviderIdSchema.safeParse(req.params.id)
      if (!idResult.success) {
        res.status(404).json({
          error: {
            code: "PROVIDER_NOT_FOUND",
            message: `Unknown provider id: ${req.params.id}`,
          },
        })
        return
      }
      const queryResult = ModelsQuerySchema.safeParse(req.query)
      const instanceId = queryResult.success ? queryResult.data.instanceId : undefined
      const result = await deps.listProviderModels.execute(
        idResult.data,
        instanceId,
      )
      res.json(result)
    } catch (error) {
      next(error)
    }
  })

  const ModelContextQuerySchema = z.object({
    model: z.string().min(1).max(200),
    instanceId: z.string().optional(),
    refresh: z.enum(["true", "false"]).optional(),
  })

  const CapabilitiesQuerySchema = ModelContextQuerySchema.extend({
    contextWindow: z.coerce.number().int().positive().optional(),
    maxTokens: z.coerce.number().int().positive().optional(),
  })

  router.get("/providers/:id/model-context", async (req, res, next) => {
    try {
      const idResult = ProviderIdSchema.safeParse(req.params.id)
      if (!idResult.success) {
        res.status(404).json({
          error: {
            code: "PROVIDER_NOT_FOUND",
            message: `Unknown provider id: ${req.params.id}`,
          },
        })
        return
      }
      const queryResult = ModelContextQuerySchema.safeParse(req.query)
      if (!queryResult.success) {
        res.status(400).json({
          error: {
            code: "INVALID_REQUEST",
            message: "A model query parameter is required.",
          },
        })
        return
      }
      const refresh = queryResult.data.refresh === "true"
      const result = await deps.getModelCapabilities.execute({
        id: idResult.data,
        model: queryResult.data.model,
        providerInstanceId: queryResult.data.instanceId,
        probeOnly: true,
        ...(refresh ? { refresh } : {}),
      })
      res.json({
        id: result.id,
        model: result.model,
        contextWindow: result.capabilities.contextWindow,
      })
    } catch (error) {
      next(error)
    }
  })

  router.get("/providers/:id/capabilities", async (req, res, next) => {
    try {
      const idResult = ProviderIdSchema.safeParse(req.params.id)
      if (!idResult.success) {
        res.status(404).json({
          error: {
            code: "PROVIDER_NOT_FOUND",
            message: `Unknown provider id: ${req.params.id}`,
          },
        })
        return
      }
      const queryResult = CapabilitiesQuerySchema.safeParse(req.query)
      if (!queryResult.success) {
        res.status(400).json({
          error: {
            code: "INVALID_REQUEST",
            message: "A model query parameter is required.",
          },
        })
        return
      }
      const { contextWindow, maxTokens } = queryResult.data
      const conversationOverride =
        contextWindow !== undefined || maxTokens !== undefined
          ? { contextWindow, maxTokens }
          : undefined
      const refresh = queryResult.data.refresh === "true"
      const result = await deps.getModelCapabilities.execute({
        id: idResult.data,
        model: queryResult.data.model,
        providerInstanceId: queryResult.data.instanceId,
        ...(refresh ? { refresh } : {}),
        ...(conversationOverride ? { conversationOverride } : {}),
      })
      res.json(result)
    } catch (error) {
      next(error)
    }
  })

  return router
}
