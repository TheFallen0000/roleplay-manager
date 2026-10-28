import type { ModelContextResult, ProviderId } from "@workspace/shared/types/provider"

import { DomainError } from "../../../domain/errors"
import type { Logger } from "../../../domain/ports/logger.port"
import type { ProviderRegistry } from "../../../domain/ports/provider.port"
import type { ProviderInstanceRepository } from "../../../domain/ports/provider-instance.repository"

/**
 * Resolves the context window of one model. The provider may not expose it
 * (OpenAI-compatible servers usually only publish `/v1/models`), in which
 * case `contextWindow` is null and the UI keeps the manual presets.
 */
export class GetProviderModelContextUseCase {
  constructor(
    private readonly registry: ProviderRegistry,
    private readonly providerInstanceRepository: ProviderInstanceRepository,
    private readonly logger: Logger,
  ) {}

  async execute(
    id: ProviderId,
    model: string,
    providerInstanceId?: string | undefined,
  ): Promise<ModelContextResult> {
    const adapter = providerInstanceId
      ? await this.buildInstanceAdapter(providerInstanceId)
      : await this.registry.getAdapter(id)

    if (adapter === null || !adapter.getModelContextWindow) {
      return { id, model, contextWindow: null }
    }

    try {
      const contextWindow = await adapter.getModelContextWindow(model)
      return { id, model, contextWindow }
    } catch (error) {
      this.logger.warn("getModelContextWindow threw an error", {
        id,
        model,
        message: (error as Error).message,
      })
      return { id, model, contextWindow: null }
    }
  }

  private async buildInstanceAdapter(providerInstanceId: string) {
    const instance =
      await this.providerInstanceRepository.findById(providerInstanceId)
    if (!instance) {
      throw new DomainError(
        "PROVIDER_INSTANCE_NOT_FOUND",
        `Provider instance '${providerInstanceId}' not found.`,
      )
    }
    return this.registry.createAdapter(instance)
  }
}
