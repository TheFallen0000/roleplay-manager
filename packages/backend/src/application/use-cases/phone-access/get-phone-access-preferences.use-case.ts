import type { PhoneAccessPreferencesResponseDTO } from "@workspace/shared/types/phone-access"

import type { SettingsRepository } from "../../../domain/ports/settings.repository"
import { readPhoneAccessPreferences } from "../../services/phone-access-preferences"

/** Devuelve los ajustes del enlace telefónico de ambos modos. */
export class GetPhoneAccessPreferencesUseCase {
  constructor(private readonly settings: SettingsRepository) {}

  execute(): Promise<PhoneAccessPreferencesResponseDTO> {
    return readPhoneAccessPreferences(this.settings)
  }
}
