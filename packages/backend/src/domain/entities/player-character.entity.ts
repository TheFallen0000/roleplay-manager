export interface PlayerCharacterProps {
  id: string
  name: string
  description: string
  createdAt: Date
  updatedAt: Date
}

export class PlayerCharacter {
  private constructor(private readonly props: PlayerCharacterProps) {}

  static create(props: PlayerCharacterProps): PlayerCharacter {
    if (!props.name.trim()) throw new Error("Player character name is required")
    if (!props.description.trim()) {
      throw new Error("Player character description is required")
    }
    return new PlayerCharacter(props)
  }

  static reconstruct(props: PlayerCharacterProps): PlayerCharacter {
    return new PlayerCharacter(props)
  }

  get id(): string { return this.props.id }
  get name(): string { return this.props.name }
  get description(): string { return this.props.description }
  get createdAt(): Date { return this.props.createdAt }
  get updatedAt(): Date { return this.props.updatedAt }

  withChanges(changes: { name?: string; description?: string }): PlayerCharacter {
    const name = changes.name ?? this.props.name
    const description = changes.description ?? this.props.description
    if (!name.trim()) throw new Error("Player character name is required")
    if (!description.trim()) {
      throw new Error("Player character description is required")
    }
    return new PlayerCharacter({
      ...this.props,
      name,
      description,
      updatedAt: new Date(),
    })
  }
}
