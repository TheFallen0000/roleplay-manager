import { LorebookValidationError } from "../errors"

export interface LorebookProps {
  id: string
  /** Legacy S132 owner. Standalone containers created in S133 leave it null. */
  characterId?: string | null
  name?: string | null
  description?: string | null
  scanDepth?: number
  tokenBudget?: number
  recursiveScanning?: boolean
  extensions?: unknown
  unknownFields?: unknown
  createdAt?: Date
  updatedAt?: Date
  originId?: string | null
  currentVersionId?: string | null
  deletedAt?: Date | null
}

type NormalizedLorebookProps = Required<LorebookProps>

const withDefaults = (props: LorebookProps): NormalizedLorebookProps => {
  const createdAt = props.createdAt ?? new Date()
  return {
    id: props.id,
    characterId: props.characterId ?? null,
    name: props.name ?? null,
    description: props.description ?? null,
    scanDepth: props.scanDepth ?? 4,
    tokenBudget: props.tokenBudget ?? 400,
    recursiveScanning: props.recursiveScanning ?? false,
    extensions: props.extensions ?? null,
    unknownFields: props.unknownFields ?? null,
    createdAt,
    updatedAt: props.updatedAt ?? createdAt,
    originId: props.originId ?? null,
    currentVersionId: props.currentVersionId ?? null,
    deletedAt: props.deletedAt ?? null,
  }
}

const assertValid = (props: NormalizedLorebookProps): void => {
  if (props.characterId !== null && !props.characterId.trim()) {
    throw new LorebookValidationError(
      "Lorebook characterId must be a non-empty string or null",
    )
  }
  if (!Number.isInteger(props.scanDepth) || props.scanDepth < 0) {
    throw new LorebookValidationError("Lorebook scanDepth must be >= 0")
  }
  if (!Number.isInteger(props.tokenBudget) || props.tokenBudget < 0) {
    throw new LorebookValidationError("Lorebook tokenBudget must be >= 0")
  }
}

export class Lorebook {
  private constructor(private readonly props: NormalizedLorebookProps) {}

  static create(props: LorebookProps): Lorebook {
    const normalized = withDefaults(props)
    assertValid(normalized)
    return new Lorebook(normalized)
  }

  static reconstruct(props: LorebookProps): Lorebook {
    return new Lorebook(withDefaults(props))
  }

  get id(): string { return this.props.id }
  get characterId(): string | null { return this.props.characterId }
  get name(): string | null { return this.props.name }
  get description(): string | null { return this.props.description }
  get scanDepth(): number { return this.props.scanDepth }
  get tokenBudget(): number { return this.props.tokenBudget }
  get recursiveScanning(): boolean { return this.props.recursiveScanning }
  get extensions(): unknown { return this.props.extensions }
  get unknownFields(): unknown { return this.props.unknownFields }
  get createdAt(): Date { return this.props.createdAt }
  get updatedAt(): Date { return this.props.updatedAt }
  get originId(): string | null { return this.props.originId }
  get currentVersionId(): string | null { return this.props.currentVersionId }
  get deletedAt(): Date | null { return this.props.deletedAt }

  withSettings(
    overrides: Partial<
      Pick<
        LorebookProps,
        | "name"
        | "description"
        | "scanDepth"
        | "tokenBudget"
        | "recursiveScanning"
        | "extensions"
        | "unknownFields"
      >
    >,
  ): Lorebook {
    const next = withDefaults({ ...this.props, ...overrides, updatedAt: new Date() })
    assertValid(next)
    return new Lorebook(next)
  }

  withOriginId(originId: string | null): Lorebook {
    return new Lorebook({ ...this.props, originId, updatedAt: new Date() })
  }

  withCurrentVersionId(currentVersionId: string | null): Lorebook {
    return new Lorebook({
      ...this.props,
      currentVersionId,
      updatedAt: new Date(),
    })
  }

  withDeletedAt(deletedAt: Date | null): Lorebook {
    return new Lorebook({ ...this.props, deletedAt, updatedAt: new Date() })
  }
}
