import type {
  CreateProviderInstanceInput,
  ProviderInstance,
  UpdateProviderInstanceInput,
} from "@workspace/shared/types/provider-instance"

/**
 * Internal repository shape. `apiKey` is only used by the provider adapters and
 * must never be returned by the HTTP layer.
 */
export interface ProviderInstanceRecord extends ProviderInstance {
  apiKey: string | null
}

export interface ProviderInstanceRepository {
  list(): Promise<ProviderInstanceRecord[]>
  findById(id: string): Promise<ProviderInstanceRecord | null>
  create(input: CreateProviderInstanceInput): Promise<ProviderInstanceRecord>
  update(
    id: string,
    input: UpdateProviderInstanceInput,
  ): Promise<ProviderInstanceRecord>
  delete(id: string): Promise<void>
}
