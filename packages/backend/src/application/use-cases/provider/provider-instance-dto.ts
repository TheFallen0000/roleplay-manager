import type { ProviderInstance } from "@workspace/shared/types/provider-instance"

import type { ProviderInstanceRecord } from "../../../domain/ports/provider-instance.repository"

/** Public DTO: strips the secret before it reaches the HTTP layer. */
export const toProviderInstanceDTO = ({
  apiKey: _apiKey,
  ...instance
}: ProviderInstanceRecord): ProviderInstance => instance
