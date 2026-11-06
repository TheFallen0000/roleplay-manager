import type { ConversationRepository } from "../../../domain/ports/conversation.repository"
import type { ProviderInstanceRepository } from "../../../domain/ports/provider-instance.repository"
import type { SettingsRepository } from "../../../domain/ports/settings.repository"
import { DomainError } from "../../../domain/errors"

const DEFAULT_INSTANCE_KEY = "default_provider_instance_id"

export class DeleteProviderInstanceUseCase {
  constructor(
    private readonly providerInstanceRepository: ProviderInstanceRepository,
    private readonly conversationRepository: ConversationRepository,
    private readonly settingsRepository: SettingsRepository,
    private readonly capabilitiesCache?: {
      invalidateInstance(id: string): void
    },
  ) {}

  async execute(id: string): Promise<void> {
    const existing = await this.providerInstanceRepository.findById(id)
    if (!existing) {
      throw new DomainError(
        "PROVIDER_INSTANCE_NOT_FOUND",
        `Provider instance '${id}' not found.`,
      )
    }

    await this.conversationRepository.clearProviderInstanceId(id)

    const currentDefault = await this.settingsRepository.get(DEFAULT_INSTANCE_KEY)
    if (currentDefault === id) {
      await this.settingsRepository.setMany({
        default_provider: "",
        default_provider_instance_id: "",
      })
    }

    await this.providerInstanceRepository.delete(id)
    this.capabilitiesCache?.invalidateInstance(id)
  }
}
