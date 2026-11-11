import { LorebookValidationError } from "../errors"

export type LorebookEntryPosition = "before_char" | "after_char"
export type LorebookSelectiveLogic = 0 | 1 | 2 | 3

export interface LorebookEntryProps {
  id: string
  lorebookId: string
  name?: string | null
  sourceId?: string | null
  keys: string[]
  secondaryKeys?: string[]
  comment?: string | null
  content: string
  constant?: boolean
  selective?: boolean
  selectiveLogic?: LorebookSelectiveLogic
  insertionOrder?: number
  position?: LorebookEntryPosition
  rawPosition?: string | null
  priority?: number
  enabled?: boolean
  caseSensitive?: boolean
  wholeWords?: boolean
  order?: number
  extensions?: unknown
  unknownFields?: unknown
  createdAt?: Date
  updatedAt?: Date
}

const withDefaults = (
  props: LorebookEntryProps,
): Required<LorebookEntryProps> => {
  const createdAt = props.createdAt ?? new Date()
  return {
    id: props.id,
    lorebookId: props.lorebookId,
    name: props.name ?? null,
    sourceId: props.sourceId ?? null,
    keys: props.keys,
    secondaryKeys: props.secondaryKeys ?? [],
    comment: props.comment ?? null,
    content: props.content,
    constant: props.constant ?? false,
    selective: props.selective ?? false,
    selectiveLogic: props.selectiveLogic ?? 0,
    insertionOrder: props.insertionOrder ?? 100,
    position: props.position ?? "after_char",
    rawPosition: props.rawPosition ?? null,
    priority: props.priority ?? 0,
    enabled: props.enabled ?? true,
    caseSensitive: props.caseSensitive ?? false,
    wholeWords: props.wholeWords ?? false,
    order: props.order ?? 0,
    extensions: props.extensions ?? null,
    unknownFields: props.unknownFields ?? null,
    createdAt,
    updatedAt: props.updatedAt ?? createdAt,
  }
}

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === "string")

const assertValid = (props: Required<LorebookEntryProps>): void => {
  if (!props.lorebookId.trim()) {
    throw new LorebookValidationError("Lorebook entry lorebookId is required")
  }
  if (typeof props.content !== "string") {
    throw new LorebookValidationError("Lorebook entry content must be a string")
  }
  if (!isStringArray(props.keys)) {
    throw new LorebookValidationError("Lorebook entry keys must be a string array")
  }
  if (!isStringArray(props.secondaryKeys)) {
    throw new LorebookValidationError(
      "Lorebook entry secondaryKeys must be a string array",
    )
  }
  if (props.position !== "before_char" && props.position !== "after_char") {
    throw new LorebookValidationError(
      "Lorebook entry position must be before_char or after_char",
    )
  }
  if (![0, 1, 2, 3].includes(props.selectiveLogic)) {
    throw new LorebookValidationError(
      "Lorebook entry selectiveLogic must be between 0 and 3",
    )
  }
  if (!Number.isInteger(props.insertionOrder)) {
    throw new LorebookValidationError(
      "Lorebook entry insertionOrder must be an integer",
    )
  }
  if (!Number.isInteger(props.order)) {
    throw new LorebookValidationError("Lorebook entry order must be an integer")
  }
  if (!Number.isInteger(props.priority)) {
    throw new LorebookValidationError(
      "Lorebook entry priority must be an integer",
    )
  }
}

export class LorebookEntry {
  private constructor(private readonly props: Required<LorebookEntryProps>) {}

  static create(props: LorebookEntryProps): LorebookEntry {
    const normalized = withDefaults(props)
    assertValid(normalized)
    return new LorebookEntry(normalized)
  }

  static reconstruct(props: LorebookEntryProps): LorebookEntry {
    return new LorebookEntry(withDefaults(props))
  }

  get id(): string { return this.props.id }
  get lorebookId(): string { return this.props.lorebookId }
  get name(): string | null { return this.props.name }
  get sourceId(): string | null { return this.props.sourceId }
  get keys(): string[] { return this.props.keys }
  get secondaryKeys(): string[] { return this.props.secondaryKeys }
  get comment(): string | null { return this.props.comment }
  get content(): string { return this.props.content }
  get constant(): boolean { return this.props.constant }
  get selective(): boolean { return this.props.selective }
  get selectiveLogic(): LorebookSelectiveLogic { return this.props.selectiveLogic }
  get insertionOrder(): number { return this.props.insertionOrder }
  get position(): LorebookEntryPosition { return this.props.position }
  get rawPosition(): string | null { return this.props.rawPosition }
  get priority(): number { return this.props.priority }
  get enabled(): boolean { return this.props.enabled }
  get caseSensitive(): boolean { return this.props.caseSensitive }
  get wholeWords(): boolean { return this.props.wholeWords }
  get order(): number { return this.props.order }
  get extensions(): unknown { return this.props.extensions }
  get unknownFields(): unknown { return this.props.unknownFields }
  get createdAt(): Date { return this.props.createdAt }
  get updatedAt(): Date { return this.props.updatedAt }

  withChanges(
    overrides: Partial<
      Pick<
        LorebookEntryProps,
        | "name"
        | "sourceId"
        | "keys"
        | "secondaryKeys"
        | "comment"
        | "content"
        | "constant"
        | "selective"
        | "selectiveLogic"
        | "insertionOrder"
        | "position"
        | "rawPosition"
        | "priority"
        | "enabled"
        | "caseSensitive"
        | "wholeWords"
        | "order"
        | "extensions"
        | "unknownFields"
      >
    >,
  ): LorebookEntry {
    const next = withDefaults({ ...this.props, ...overrides, updatedAt: new Date() })
    assertValid(next)
    return new LorebookEntry(next)
  }
}
