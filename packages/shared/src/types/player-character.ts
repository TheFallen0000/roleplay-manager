export interface PlayerCharacterDTO {
  id: string
  name: string
  description: string
  createdAt: string
  updatedAt: string
}

export interface CreatePlayerCharacterInput {
  name: string
  description: string
}

export interface UpdatePlayerCharacterInput {
  name?: string
  description?: string
}
