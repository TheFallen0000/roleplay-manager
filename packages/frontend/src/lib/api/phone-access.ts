import type {
  PhoneAccessPreferencesResponseDTO,
  PhoneAccessPreferencesUpdateDTO,
} from "@workspace/shared/types/phone-access"

import { apiRequest } from "./client"

export const getPhoneAccessPreferences =
  (): Promise<PhoneAccessPreferencesResponseDTO> =>
    apiRequest<PhoneAccessPreferencesResponseDTO>(
      "/api/phone-access/preferences",
    )

export const updatePhoneAccessPreferences = (
  update: PhoneAccessPreferencesUpdateDTO,
): Promise<PhoneAccessPreferencesResponseDTO> =>
  apiRequest<PhoneAccessPreferencesResponseDTO>(
    "/api/phone-access/preferences",
    {
      method: "PUT",
      body: JSON.stringify(update),
    },
  )
