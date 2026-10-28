export interface MemoryProps {
  id: string
  conversationId: string
  actor: string
  title: string
  description: string
  priority: number
  createdBy: "user" | "assistant"
  updatedBy: "user" | "assistant" | "system"
  createdAt: Date
  updatedAt: Date
}

export class Memory {
  private constructor(private readonly props: MemoryProps) {}

  static create(props: MemoryProps): Memory {
    if (!props.actor.trim()) throw new Error("Memory actor is required")
    if (!props.title.trim()) throw new Error("Memory title is required")
    if (props.priority < 1 || props.priority > 10) throw new Error("Memory priority must be between 1 and 10")
    return new Memory(props)
  }

  static reconstruct(props: MemoryProps): Memory {
    return new Memory(props)
  }

  get id(): string { return this.props.id }
  get conversationId(): string { return this.props.conversationId }
  get actor(): string { return this.props.actor }
  get title(): string { return this.props.title }
  get description(): string { return this.props.description }
  get priority(): number { return this.props.priority }
  get createdBy(): "user" | "assistant" { return this.props.createdBy }
  get updatedBy(): "user" | "assistant" | "system" { return this.props.updatedBy }
  get createdAt(): Date { return this.props.createdAt }
  get updatedAt(): Date { return this.props.updatedAt }

  matches(
    overrides: Pick<MemoryProps, "actor" | "title" | "description" | "priority">,
  ): boolean {
    return (
      this.props.actor === overrides.actor &&
      this.props.title === overrides.title &&
      this.props.description === overrides.description &&
      this.props.priority === overrides.priority
    )
  }

  update(
    overrides: Partial<Pick<MemoryProps, "actor" | "title" | "description" | "priority">>,
    updatedBy: "user" | "assistant" | "system",
  ): Memory {
    const actor = overrides.actor ?? this.props.actor
    const title = overrides.title ?? this.props.title
    if (!actor.trim()) throw new Error("Memory actor is required")
    if (!title.trim()) throw new Error("Memory title is required")
    const priority = overrides.priority ?? this.props.priority
    if (priority < 1 || priority > 10) throw new Error("Memory priority must be between 1 and 10")
    return new Memory({
      ...this.props,
      actor,
      title,
      description: overrides.description ?? this.props.description,
      priority,
      updatedBy,
      updatedAt: new Date(),
    })
  }
}
