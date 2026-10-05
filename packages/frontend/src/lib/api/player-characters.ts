import type {
  CreatePlayerCharacterInput,
  PlayerCharacterDTO,
  UpdatePlayerCharacterInput,
} from "@workspace/shared/types/player-character"

import { apiRequest } from "./client"

export const listPlayerCharacters = (): Promise<PlayerCharacterDTO[]> =>
  apiRequest("/api/player-characters")

export const createPlayerCharacter = (
  input: CreatePlayerCharacterInput,
): Promise<PlayerCharacterDTO> =>
  apiRequest("/api/player-characters", {
    method: "POST",
    body: JSON.stringify(input),
  })

export const updatePlayerCharacter = (
  id: string,
  input: UpdatePlayerCharacterInput,
): Promise<PlayerCharacterDTO> =>
  apiRequest(`/api/player-characters/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  })

export const deletePlayerCharacter = (id: string): Promise<void> =>
  apiRequest(`/api/player-characters/${id}`, { method: "DELETE" })
