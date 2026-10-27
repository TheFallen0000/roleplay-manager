import type {
  CreateProviderInstanceInput,
  ProviderInstance,
} from "@workspace/shared/types/provider-instance"
import type { ProviderId } from "@workspace/shared/types/provider"

import type { ProviderInstanceRepository } from "../../../domain/ports/provider-instance.repository"
import type { Logger } from "../../../domain/ports/logger.port"
import { DomainError } from "../../../domain/errors"
import { toProviderInstanceDTO } from "./provider-instance-dto"

const VALID_KINDS: ProviderId[] = ["ollama", "openai-compatible"]

export class CreateProviderInstanceUseCase {
  constructor(
    private readonly providerInstanceRepository: ProviderInstanceRepository,
    private readonly logger: Logger,
  ) {}

  async execute(input: CreateProviderInstanceInput): Promise<ProviderInstance> {
    if (!VALID_KINDS.includes(input.kind as ProviderId)) {
      throw new DomainError(
        "INVALID_PROVIDER_KIND",
        `Invalid provider kind. Must be one of: ${VALID_KINDS.join(", ")}`,
      )
    }

    if (!input.name.trim()) {
      throw new DomainError(
        "NAME_REQUIRED",
        "Provider instance name is required.",
      )
    }

    if (input.kind === "openai-compatible" && !input.url.trim()) {
      throw new DomainError(
        "URL_REQUIRED",
        "URL is required for openai-compatible providers.",
      )
    }

    if (input.kind === "openai-compatible" && input.url.trim()) {
      const url = input.url.trim().replace(/\/+$/, "")
      if (!/\/v1$/.test(url)) {
        this.logger.warn(
          `OpenAI-compatible base URL "${url}" does not end with /v1. ` +
          "This may cause 404 errors on OpenAI-compatible endpoints " +
          "(e.g. /chat/completions). Expected format: http://host:port/v1",
          { url, name: input.name },
        )
      }
    }

    const instance = await this.providerInstanceRepository.create({
      kind: input.kind,
      name: input.name.trim(),
      url: input.url.trim(),
      apiKey: input.apiKey,
    })

    return toProviderInstanceDTO(instance)
  }
}
