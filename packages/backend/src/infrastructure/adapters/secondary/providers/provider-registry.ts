import type { ProviderId } from "@workspace/shared/types/provider"
import type { ProviderInstanceRecord } from "../../../../domain/ports/provider-instance.repository"

import { ProviderError } from "../../primary/middlewares/error-handler"
import type { Logger } from "../../../../domain/ports/logger.port"
import type { ProviderPort, ProviderRegistry } from "../../../../domain/ports/provider.port"
import type { SettingsRepository } from "../../../../domain/ports/settings.repository"
import { OllamaAdapter } from "./ollama.adapter"
import { OpenAICompatibleAdapter } from "./openai-compatible.adapter"

export interface ProviderRegistryOptions {
  settings: SettingsRepository
  ollamaBaseUrl: string
  timeoutMs: number
  streamingTimeoutMs: number
  logger: Logger
}

const SETTINGS_KEYS = {
  openaiUrl: "provider_openai_compatible_url",
  openaiApiKey: "provider_openai_compatible_api_key",
} as const

const REGISTERED: ProviderId[] = ["ollama", "openai-compatible"]

export class ProviderRegistryImpl implements ProviderRegistry {
  constructor(private readonly options: ProviderRegistryOptions) {}

  listRegistered(): ProviderId[] {
    return [...REGISTERED]
  }

  async getAdapter(id: ProviderId): Promise<ProviderPort | null> {
    if (id === "ollama") {
      return this.buildOllamaAdapter()
    }
    if (id === "openai-compatible") {
      const cfg = await this.options.settings.getMany([
        SETTINGS_KEYS.openaiUrl,
        SETTINGS_KEYS.openaiApiKey,
      ])
      const url = cfg[SETTINGS_KEYS.openaiUrl]
      if (!url) return null
      return new OpenAICompatibleAdapter({
        baseUrl: url,
        apiKey: cfg[SETTINGS_KEYS.openaiApiKey],
        timeoutMs: this.options.timeoutMs,
        streamingTimeoutMs: this.options.streamingTimeoutMs,
        logger: this.options.logger,
      })
    }
    throw new ProviderError(
      "PROVIDER_CONNECTION_FAILED",
      `Unknown provider id: ${id}`,
    )
  }

  createAdapter(instance: ProviderInstanceRecord): ProviderPort {
    if (instance.kind === "ollama") {
      return this.buildOllamaAdapter()
    }
    if (instance.kind === "openai-compatible") {
      return new OpenAICompatibleAdapter({
        baseUrl: instance.url || "http://localhost:1234/v1",
        apiKey: instance.apiKey,
        timeoutMs: this.options.timeoutMs,
        streamingTimeoutMs: this.options.streamingTimeoutMs,
        logger: this.options.logger,
      })
    }
    throw new ProviderError(
      "PROVIDER_CONNECTION_FAILED",
      `Unknown provider kind: ${(instance as { kind: string }).kind}`,
    )
  }

  private buildOllamaAdapter(): OllamaAdapter {
    return new OllamaAdapter({
      baseUrl: this.options.ollamaBaseUrl,
      timeoutMs: this.options.timeoutMs,
      streamingTimeoutMs: this.options.streamingTimeoutMs,
      logger: this.options.logger,
    })
  }
}
