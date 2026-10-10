import type {
  BackgroundFit,
  MemoryDecayMode,
  MessageStyle,
  TitleSource,
} from "@workspace/shared/types/conversation"

export type MemoryProposalMode = "auto" | "manual"

export interface ConversationProps {
  id: string
  versionId: string
  title: string | null
  titleSource: TitleSource | null
  model: string | null
  provider: string | null
  providerInstanceId: string | null
  recentMessageCount: number
  summaryFrequency: number
  temperature: number
  maxTokens: number
  topP: number
  frequencyPenalty: number
  presencePenalty: number
  stopSequences: string[]
  memoryProposalMode: MemoryProposalMode
  customProfileImageAssetId?: string | null
  backgroundImageAssetId?: string | null
  backgroundFit?: BackgroundFit
  backgroundScrim?: number
  messageStyle?: MessageStyle
  characterDialogueColor?: string | null
  userDialogueColor?: string | null
  playerCharacterId?: string | null
  memoryDecayMode?: MemoryDecayMode
  memoryDecayThreshold?: number
  memoryDecayAgeThreshold?: number
  memoryDecaySpeed?: number
  createdAt: Date
  updatedAt: Date
}

export const DEFAULT_MEMORY_DECAY = {
  mode: "silent" as MemoryDecayMode,
  threshold: 3,
  ageThreshold: 30,
  speed: 10,
}

export class Conversation {
  private constructor(private readonly props: ConversationProps) {}

  static create(props: ConversationProps): Conversation {
    return new Conversation({
      ...props,
      customProfileImageAssetId: props.customProfileImageAssetId ?? null,
      backgroundImageAssetId: props.backgroundImageAssetId ?? null,
      backgroundFit: props.backgroundFit ?? "cover",
      backgroundScrim: props.backgroundScrim ?? 0,
      messageStyle: props.messageStyle ?? "bubble",
      characterDialogueColor: props.characterDialogueColor ?? null,
      userDialogueColor: props.userDialogueColor ?? null,
      playerCharacterId: props.playerCharacterId ?? null,
      memoryDecayMode: props.memoryDecayMode ?? DEFAULT_MEMORY_DECAY.mode,
      memoryDecayThreshold: props.memoryDecayThreshold ?? DEFAULT_MEMORY_DECAY.threshold,
      memoryDecayAgeThreshold: props.memoryDecayAgeThreshold ?? DEFAULT_MEMORY_DECAY.ageThreshold,
      memoryDecaySpeed: props.memoryDecaySpeed ?? DEFAULT_MEMORY_DECAY.speed,
    })
  }

  get id(): string { return this.props.id }
  get versionId(): string { return this.props.versionId }
  get title(): string | null { return this.props.title }
  get titleSource(): TitleSource | null { return this.props.titleSource }
  get model(): string | null { return this.props.model }
  get provider(): string | null { return this.props.provider }
  get providerInstanceId(): string | null { return this.props.providerInstanceId }
  get recentMessageCount(): number { return this.props.recentMessageCount }
  get summaryFrequency(): number { return this.props.summaryFrequency }
  get temperature(): number { return this.props.temperature }
  get maxTokens(): number { return this.props.maxTokens }
  get topP(): number { return this.props.topP }
  get frequencyPenalty(): number { return this.props.frequencyPenalty }
  get presencePenalty(): number { return this.props.presencePenalty }
  get stopSequences(): string[] { return this.props.stopSequences }
  get memoryProposalMode(): MemoryProposalMode { return this.props.memoryProposalMode }
  get customProfileImageAssetId(): string | null { return this.props.customProfileImageAssetId ?? null }
  get backgroundImageAssetId(): string | null { return this.props.backgroundImageAssetId ?? null }
  get backgroundFit(): BackgroundFit { return this.props.backgroundFit as BackgroundFit }
  get backgroundScrim(): number { return this.props.backgroundScrim as number }
  get messageStyle(): MessageStyle { return this.props.messageStyle as MessageStyle }
  get characterDialogueColor(): string | null { return this.props.characterDialogueColor ?? null }
  get userDialogueColor(): string | null { return this.props.userDialogueColor ?? null }
  get playerCharacterId(): string | null { return this.props.playerCharacterId ?? null }
  get memoryDecayMode(): MemoryDecayMode { return this.props.memoryDecayMode as MemoryDecayMode }
  get memoryDecayThreshold(): number { return this.props.memoryDecayThreshold as number }
  get memoryDecayAgeThreshold(): number { return this.props.memoryDecayAgeThreshold as number }
  get memoryDecaySpeed(): number { return this.props.memoryDecaySpeed as number }
  get createdAt(): Date { return this.props.createdAt }
  get updatedAt(): Date { return this.props.updatedAt }

  withMemoryProposalMode(mode: MemoryProposalMode): Conversation {
    if (this.props.memoryProposalMode === mode) return this
    return new Conversation({ ...this.props, memoryProposalMode: mode, updatedAt: new Date() })
  }

  withTitle(title: string, source: TitleSource): Conversation {
    return new Conversation({
      ...this.props,
      title,
      titleSource: source,
      updatedAt: new Date(),
    })
  }

  withCustomProfileImageAssetId(assetId: string | null): Conversation {
    if (this.props.customProfileImageAssetId === assetId) return this
    return new Conversation({
      ...this.props,
      customProfileImageAssetId: assetId,
      updatedAt: new Date(),
    })
  }

  withBackgroundImageAssetId(assetId: string | null): Conversation {
    if (this.props.backgroundImageAssetId === assetId) return this
    return new Conversation({
      ...this.props,
      backgroundImageAssetId: assetId,
      updatedAt: new Date(),
    })
  }
}
