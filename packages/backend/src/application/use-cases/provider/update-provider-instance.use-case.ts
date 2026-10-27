import type {
  ProviderInstance,
  UpdateProviderInstanceInput,
} from "@workspace/shared/types/provider-instance"

import type { ProviderInstanceRepository } from "../../../domain/ports/provider-instance.repository"
import type { Logger } from "../../../domain/ports/logger.port"
import { DomainError } from "../../../domain/errors"
import { toProviderInstanceDTO } from "./provider-instance-dto"

export class UpdateProviderInstanceUseCase {
  constructor(
    private readonly providerInstanceRepository: ProviderInstanceRepository,
    private readonly logger: Logger,
  ) {}

  async execute(
    id: string,
    input: UpdateProviderInstanceInput,
  ): Promise<ProviderInstance> {
    const existing = await this.providerInstanceRepository.findById(id)
    if (!existing) {
      throw new DomainError(
        "PROVIDER_INSTANCE_NOT_FOUND",
        `Provider instance '${id}' not found.`,
      )
    }

    if (input.name !== undefined && !input.name.trim()) {
      throw new DomainError(
        "NAME_REQUIRED",
        "Provider instance name cannot be empty.",
      )
    }

    if (input.url !== undefined && !input.url.trim()) {
      throw new DomainError(
        "URL_REQUIRED",
        "URL cannot be empty for openai-compatible providers.",
      )
    }

    if (existing.kind === "openai-compatible" && input.url !== undefined && input.url.trim()) {
      const url = input.url.trim().replace(/\/+$/, "")
      if (!/\/v1$/.test(url)) {
        this.logger.warn(
          `OpenAI-compatible base URL "${url}" does not end with /v1. ` +
          "This may cause 404 errors on OpenAI-compatible endpoints " +
          "(e.g. /chat/completions). Expected format: http://host:port/v1",
          { url, id },
        )
      }
    }

    const updated = await this.providerInstanceRepository.update(id, input)
    return toProviderInstanceDTO(updated)
  }
}
