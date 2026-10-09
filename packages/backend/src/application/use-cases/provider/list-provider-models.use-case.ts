import type {
  ProviderId,
  ProviderModel,
} from "@workspace/shared/types/provider"

import {
  DomainError,
  ProviderUnavailableError,
} from "../../../domain/errors"
import type { Logger } from "../../../domain/ports/logger.port"
import type { ProviderRegistry } from "../../../domain/ports/provider.port"
import type { ProviderInstanceRepository } from "../../../domain/ports/provider-instance.repository"

export interface ListProviderModelsResult {
  id: ProviderId
  models: ProviderModel[]
  manualEntryRequired: boolean
}

/**
 * Lists the models of a provider. When `providerInstanceId` is omitted,
 * `getAdapter` is used (legacy settings). When an instance ID is passed,
 * `ProviderInstanceRepository` is queried and `createAdapter` is used.
 * If the provider is not configured, returns `{ models: [], manualEntryRequired: true }`
 * so the frontend enables manual entry.
 */
export class ListProviderModelsUseCase {
  constructor(
    private readonly registry: ProviderRegistry,
    private readonly providerInstanceRepository: ProviderInstanceRepository,
    private readonly logger: Logger,
  ) {}

  async execute(
    id: ProviderId,
    providerInstanceId?: string | undefined,
  ): Promise<ListProviderModelsResult> {
    let adapter
    if (providerInstanceId) {
      const instance = await this.providerInstanceRepository.findById(
        providerInstanceId,
      )
      if (!instance) {
        throw new DomainError(
          "PROVIDER_INSTANCE_NOT_FOUND",
          `Provider instance '${providerInstanceId}' not found.`,
        )
      }
      adapter = this.registry.createAdapter(instance)
    } else {
      adapter = await this.registry.getAdapter(id)
    }

    if (adapter === null) {
      this.logger.info("Provider not configured; returning manual entry flag", {
        id,
      })
      return { id, models: [], manualEntryRequired: true }
    }
    try {
      const result = await adapter.listModels()
      return {
        id,
        models: result.models,
        manualEntryRequired: result.manualEntryRequired,
      }
    } catch (error) {
      this.logger.warn("listModels threw an error", {
        id,
        message: (error as Error).message,
      })
      throw new ProviderUnavailableError(
        `Could not list models for ${id}: ${(error as Error).message}`,
      )
    }
  }
}
