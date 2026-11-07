import { LorebookValidationError } from "../errors"

export interface LorebookProps {
  id: string
  characterId: string
  name?: string | null
  description?: string | null
  scanDepth?: number
  tokenBudget?: number
  recursiveScanning?: boolean
  extensions?: unknown
  unknownFields?: unknown
  createdAt?: Date
  updatedAt?: Date
}

const withDefaults = (props: LorebookProps): Required<LorebookProps> => {
  const createdAt = props.createdAt ?? new Date()
  return {
    id: props.id,
    characterId: props.characterId,
    name: props.name ?? null,
    description: props.description ?? null,
    scanDepth: props.scanDepth ?? 4,
    tokenBudget: props.tokenBudget ?? 400,
    recursiveScanning: props.recursiveScanning ?? false,
    extensions: props.extensions ?? null,
    unknownFields: props.unknownFields ?? null,
    createdAt,
    updatedAt: props.updatedAt ?? createdAt,
  }
}

const assertValid = (props: Required<LorebookProps>): void => {
  if (!props.characterId.trim()) {
    throw new LorebookValidationError("Lorebook characterId is required")
  }
  if (!Number.isInteger(props.scanDepth) || props.scanDepth < 0) {
    throw new LorebookValidationError("Lorebook scanDepth must be >= 0")
  }
  if (!Number.isInteger(props.tokenBudget) || props.tokenBudget < 0) {
    throw new LorebookValidationError("Lorebook tokenBudget must be >= 0")
  }
}

export class Lorebook {
  private constructor(private readonly props: Required<LorebookProps>) {}

  static create(props: LorebookProps): Lorebook {
    const normalized = withDefaults(props)
    assertValid(normalized)
    return new Lorebook(normalized)
  }

  static reconstruct(props: LorebookProps): Lorebook {
    return new Lorebook(withDefaults(props))
  }

  get id(): string { return this.props.id }
  get characterId(): string { return this.props.characterId }
  get name(): string | null { return this.props.name }
  get description(): string | null { return this.props.description }
  get scanDepth(): number { return this.props.scanDepth }
  get tokenBudget(): number { return this.props.tokenBudget }
  get recursiveScanning(): boolean { return this.props.recursiveScanning }
  get extensions(): unknown { return this.props.extensions }
  get unknownFields(): unknown { return this.props.unknownFields }
  get createdAt(): Date { return this.props.createdAt }
  get updatedAt(): Date { return this.props.updatedAt }

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
}
