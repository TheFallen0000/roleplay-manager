import type { CapabilityClaim } from "@workspace/shared/types/model-capabilities"
import type { EmbedRequest, EmbedResult } from "@workspace/shared/types/embedding"
import type {
  ListModelsResult,
  ProviderId,
  ProviderModel,
  ProviderStatus,
} from "@workspace/shared/types/provider"

import type { GenerateOptions, PromptContext, StreamChunk } from "../value-objects/prompt-context"

export interface ProviderPort {
  validateConnection(): Promise<ProviderStatus>
  listModels(): Promise<{ models: ProviderModel[]; manualEntryRequired: boolean }>
  /** Best-effort model context window; null when the provider cannot tell. */
  getModelContextWindow?(model: string): Promise<number | null>
  /** Rich capability claims from runtime introspection or the provider API. */
  resolveCapabilities?(model: string): Promise<CapabilityClaim[]>
  /** Optional: providers that can produce text embeddings (S137). */
  embed?(input: EmbedRequest): Promise<EmbedResult>
  /** Cheap capability check for callers that prefer not to attempt `embed`. */
  supportsEmbeddings?(): boolean
  generateStreaming(
    context: PromptContext,
    options?: GenerateOptions,
  ): AsyncIterable<StreamChunk>
}

export type { ListModelsResult, ProviderId, ProviderModel, ProviderStatus }

/**
 * Provider registry.
 *
 * Returns the adapter configured for a given `ProviderId`, or `null`
 * when the provider is not configured (typical case: OpenAI-compatible
 * without a base URL).
 *
 * The list of registered IDs is kept as a registry constant so the API
 * can announce which providers are available to the frontend without
 * instantiating every adapter.
 */
import type { ProviderInstance } from "@workspace/shared/types/provider-instance"

export interface ProviderRegistry {
  listRegistered(): ProviderId[]
  getAdapter(id: ProviderId): Promise<ProviderPort | null>
  createAdapter(instance: ProviderInstance): ProviderPort
}
