import type { CharacterCard } from "./character-card.entity"

export interface CharacterVersionProps {
  id: string
  characterId: string
  name: string
  subtitle: string | null
  profileImageAssetId?: string | null
  description: string
  instructions: string | null
  greeting: string
  versionNumber: number
  createdAt: Date
  cards: CharacterCard[]
  personality?: string | null
  scenario?: string | null
  mesExample?: string | null
  alternateGreetings?: string[]
  creatorNotes?: string | null
  tags?: string[]
  creator?: string | null
  cardCharacterVersion?: string | null
  gender?: string | null
  pronouns?: string | null
  tagline?: string | null
  systemPrompt?: string | null
  postHistoryInstructions?: string | null
  extensions?: unknown
  unknownFields?: unknown
  unknownRootFields?: unknown
}

const withCardDefaults = (
  props: CharacterVersionProps,
): CharacterVersionProps => ({
  ...props,
  profileImageAssetId: props.profileImageAssetId ?? null,
  personality: props.personality ?? null,
  scenario: props.scenario ?? null,
  mesExample: props.mesExample ?? null,
  alternateGreetings: props.alternateGreetings ?? [],
  creatorNotes: props.creatorNotes ?? null,
  tags: props.tags ?? [],
  creator: props.creator ?? null,
  cardCharacterVersion: props.cardCharacterVersion ?? null,
  gender: props.gender ?? null,
  pronouns: props.pronouns ?? null,
  tagline: props.tagline ?? null,
  systemPrompt: props.systemPrompt ?? null,
  postHistoryInstructions: props.postHistoryInstructions ?? null,
  extensions: props.extensions ?? null,
  unknownFields: props.unknownFields ?? null,
  unknownRootFields: props.unknownRootFields ?? null,
})

export class CharacterVersion {
  private constructor(private readonly props: CharacterVersionProps) {}

  static create(props: CharacterVersionProps): CharacterVersion {
    if (!props.name.trim()) throw new Error("Version name is required")
    if (!props.description.trim()) throw new Error("Description is required")
    if (!props.greeting.trim()) throw new Error("Greeting is required")
    if (props.cards.some((c) => !c.title.trim() || !c.content.trim())) {
      throw new Error("Cards must have non-empty title and content")
    }
    return new CharacterVersion(withCardDefaults(props))
  }

  static reconstruct(props: CharacterVersionProps): CharacterVersion {
    return new CharacterVersion(withCardDefaults(props))
  }

  get id(): string { return this.props.id }
  get characterId(): string { return this.props.characterId }
  get name(): string { return this.props.name }
  get subtitle(): string | null { return this.props.subtitle }
  get profileImageAssetId(): string | null { return this.props.profileImageAssetId ?? null }
  get description(): string { return this.props.description }
  get instructions(): string | null { return this.props.instructions }
  get greeting(): string { return this.props.greeting }
  get versionNumber(): number { return this.props.versionNumber }
  get createdAt(): Date { return this.props.createdAt }
  get cards(): CharacterCard[] { return this.props.cards }
  get personality(): string | null { return this.props.personality ?? null }
  get scenario(): string | null { return this.props.scenario ?? null }
  get mesExample(): string | null { return this.props.mesExample ?? null }
  get alternateGreetings(): string[] { return this.props.alternateGreetings ?? [] }
  get creatorNotes(): string | null { return this.props.creatorNotes ?? null }
  get tags(): string[] { return this.props.tags ?? [] }
  get creator(): string | null { return this.props.creator ?? null }
  get cardCharacterVersion(): string | null { return this.props.cardCharacterVersion ?? null }
  get gender(): string | null { return this.props.gender ?? null }
  get pronouns(): string | null { return this.props.pronouns ?? null }
  get tagline(): string | null { return this.props.tagline ?? null }
  get systemPrompt(): string | null { return this.props.systemPrompt ?? null }
  get postHistoryInstructions(): string | null { return this.props.postHistoryInstructions ?? null }
  get extensions(): unknown { return this.props.extensions ?? null }
  get unknownFields(): unknown { return this.props.unknownFields ?? null }
  get unknownRootFields(): unknown { return this.props.unknownRootFields ?? null }
}
