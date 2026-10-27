import type { ProviderInstance } from "@workspace/shared/types/provider-instance"

import type { ProviderInstanceRepository } from "../../../domain/ports/provider-instance.repository"
import { toProviderInstanceDTO } from "./provider-instance-dto"

export class ListProviderInstancesUseCase {
  constructor(
    private readonly providerInstanceRepository: ProviderInstanceRepository,
  ) {}

  async execute(): Promise<ProviderInstance[]> {
    const instances = await this.providerInstanceRepository.list()
    return instances.map(toProviderInstanceDTO)
  }
}
