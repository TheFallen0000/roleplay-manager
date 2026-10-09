import type { ProviderId, ProviderStatus } from "@workspace/shared/types/provider"

import { ProviderUnavailableError } from "../../../domain/errors"
import type { Logger } from "../../../domain/ports/logger.port"
import type { ProviderRegistry } from "../../../domain/ports/provider.port"

export interface ValidateProviderConnectionResult {
  id: ProviderId
  status: ProviderStatus
  message?: string
}

/**
 * Verifies connectivity with a provider.
 *
 * - If the provider is not configured (e.g. OpenAI-compatible without a base
 *   URL), returns `status: "unconfigured"` without throwing.
 * - If the adapter responds OK, returns `"available"`.
 * - If the connection fails or the timeout expires, returns `"unavailable"`.
 * - If the id is unknown, throws `ProviderUnavailableError`.
 */
export class ValidateProviderConnectionUseCase {
  constructor(
    private readonly registry: ProviderRegistry,
    private readonly logger: Logger,
  ) {}

  async execute(id: ProviderId): Promise<ValidateProviderConnectionResult> {
    const adapter = await this.registry.getAdapter(id)
    if (adapter === null) {
      this.logger.info("Provider is not configured", { id })
      return { id, status: "unconfigured" }
    }
    try {
      const status = await adapter.validateConnection()
      return { id, status }
    } catch (error) {
      this.logger.warn("Provider validation threw an error", {
        id,
        message: (error as Error).message,
      })
      throw new ProviderUnavailableError(
        `Provider ${id} is not available: ${(error as Error).message}`,
      )
    }
  }
}
