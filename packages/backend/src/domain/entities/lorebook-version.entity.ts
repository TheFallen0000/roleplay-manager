import { LorebookValidationError } from "../errors"

export interface LorebookVersionProps {
  id: string
  lorebookId: string
  versionNumber: number
  name?: string | null
  description?: string | null
  scanDepth?: number
  tokenBudget?: number
  recursiveScanning?: boolean
  entriesJson: string
  sourceKey: string
  createdAt?: Date
}

type NormalizedLorebookVersionProps = Required<LorebookVersionProps>

const withDefaults = (
  props: LorebookVersionProps,
): NormalizedLorebookVersionProps => ({
  id: props.id,
  lorebookId: props.lorebookId,
  versionNumber: props.versionNumber,
  name: props.name ?? null,
  description: props.description ?? null,
  scanDepth: props.scanDepth ?? 4,
  tokenBudget: props.tokenBudget ?? 400,
  recursiveScanning: props.recursiveScanning ?? false,
  entriesJson: props.entriesJson,
  sourceKey: props.sourceKey,
  createdAt: props.createdAt ?? new Date(),
})

const assertValid = (props: NormalizedLorebookVersionProps): void => {
  if (!props.id.trim()) {
    throw new LorebookValidationError("Lorebook version id is required")
  }
  if (!props.lorebookId.trim()) {
    throw new LorebookValidationError("Lorebook version lorebookId is required")
  }
  if (!Number.isInteger(props.versionNumber) || props.versionNumber < 1) {
    throw new LorebookValidationError(
      "Lorebook version number must be >= 1",
    )
  }
  if (!Number.isInteger(props.scanDepth) || props.scanDepth < 0) {
    throw new LorebookValidationError("Lorebook version scanDepth must be >= 0")
  }
  if (!Number.isInteger(props.tokenBudget) || props.tokenBudget < 0) {
    throw new LorebookValidationError(
      "Lorebook version tokenBudget must be >= 0",
    )
  }
  if (!props.entriesJson.trim()) {
    throw new LorebookValidationError(
      "Lorebook version entriesJson must not be empty",
    )
  }
  if (!props.sourceKey.trim()) {
    throw new LorebookValidationError(
      "Lorebook version sourceKey must not be empty",
    )
  }
}

export class LorebookVersion {
  private constructor(
    private readonly props: NormalizedLorebookVersionProps,
  ) {}

  static create(props: LorebookVersionProps): LorebookVersion {
    const normalized = withDefaults(props)
    assertValid(normalized)
    return new LorebookVersion(normalized)
  }

  static reconstruct(props: LorebookVersionProps): LorebookVersion {
    return new LorebookVersion(withDefaults(props))
  }

  get id(): string { return this.props.id }
  get lorebookId(): string { return this.props.lorebookId }
  get versionNumber(): number { return this.props.versionNumber }
  get name(): string | null { return this.props.name }
  get description(): string | null { return this.props.description }
  get scanDepth(): number { return this.props.scanDepth }
  get tokenBudget(): number { return this.props.tokenBudget }
  get recursiveScanning(): boolean { return this.props.recursiveScanning }
  get entriesJson(): string { return this.props.entriesJson }
  get sourceKey(): string { return this.props.sourceKey }
  get createdAt(): Date { return this.props.createdAt }
}
