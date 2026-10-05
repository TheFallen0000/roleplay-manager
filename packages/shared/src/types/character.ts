import type { ImageDimensions } from "./image"

export interface CharacterAssetDTO {
  id: string
  characterId: string
  mimeType: string
  sizeBytes: number
  createdAt: string
}

export interface CharacterSummary {
  id: string
  name: string
  subtitle: string | null
  profileImageAssetId: string | null
  profileImageDimensions?: ImageDimensions | null
  profileImageMimeType?: string | null
  versionNumber: number
  createdAt: string
  updatedAt: string
}

export interface CharacterDetail {
  id: string
  name: string
  createdAt: string
  updatedAt: string
  currentVersion: CharacterVersionDTO
  versions: CharacterVersionDTO[]
}

export interface CharacterVersionDTO {
  id: string
  characterId: string
  name: string
  subtitle: string | null
  profileImageAssetId: string | null
  description: string
  instructions: string | null
  greeting: string
  versionNumber: number
  createdAt: string
  cards: CharacterCardDTO[]
}

export interface CharacterCardDTO {
  id: string
  versionId: string
  title: string
  content: string
  position: number
  active: boolean
}

export interface CreateCharacterInput {
  name: string
  subtitle?: string | null
  profileImageAssetId?: string | null
  description: string
  instructions?: string | null
  greeting: string
  cards?: CreateCardInput[]
}

export interface CreateCardInput {
  title: string
  content: string
  active?: boolean
}

export interface UpdateCharacterInput {
  name?: string
  subtitle?: string | null
  profileImageAssetId?: string | null
  description?: string
  instructions?: string | null
  greeting?: string
  cards?: UpdateCardInput[]
}

export interface UpdateCardInput {
  id?: string
  title: string
  content: string
  position: number
  active?: boolean
}
