import type {
  PhoneAccessMode,
  PhoneAccessPreferencesResponseDTO,
} from "@workspace/shared/types/phone-access"

import type { SettingsRepository } from "../../../domain/ports/settings.repository"
import {
  updatePhoneAccessPreferences,
  type PhoneAccessPreferencesPatch,
} from "../../services/phone-access-preferences"

/** Persiste un cambio parcial de un modo y devuelve los ajustes frescos. */
export class UpdatePhoneAccessPreferencesUseCase {
  constructor(private readonly settings: SettingsRepository) {}

  execute(
    mode: PhoneAccessMode,
    patch: PhoneAccessPreferencesPatch,
  ): Promise<PhoneAccessPreferencesResponseDTO> {
    return updatePhoneAccessPreferences(this.settings, mode, patch)
  }
}
