import {
  isMemoryType,
  type MemoryType,
} from "@workspace/shared/types/memory"

export type ProposalOperation = "CREATE" | "UPDATE" | "DELETE"
export type ProposalStatus = "pending" | "applied" | "discarded"
export type ProcessedBy = "user" | "system"

export interface MemoryChangeProposalProps {
  id: string
  conversationId: string
  operation: ProposalOperation
  targetMemoryId: string | null
  actor: string
  title: string
  description: string
  priority: number
  type?: MemoryType
  status: ProposalStatus
  createdAt: Date
  processedAt: Date | null
  processedBy: ProcessedBy
}

const resolveType = (type: MemoryType | undefined): MemoryType => {
  if (type === undefined) return "fact"
  if (!isMemoryType(type)) throw new Error("Proposal type is invalid")
  return type
}

export class MemoryChangeProposal {
  private constructor(
    private readonly props: MemoryChangeProposalProps & { type: MemoryType },
  ) {}

  static create(props: MemoryChangeProposalProps): MemoryChangeProposal {
    if (!["CREATE", "UPDATE", "DELETE"].includes(props.operation)) throw new Error("Invalid proposal operation")
    if (!props.actor.trim()) throw new Error("Proposal actor is required")
    if (!props.title.trim()) throw new Error("Proposal title is required")
    if (props.priority < 1 || props.priority > 10) throw new Error("Proposal priority must be between 1 and 10")
    return new MemoryChangeProposal({ ...props, type: resolveType(props.type) })
  }

  static reconstruct(props: MemoryChangeProposalProps): MemoryChangeProposal {
    return new MemoryChangeProposal({ ...props, type: resolveType(props.type) })
  }

  get id(): string { return this.props.id }
  get conversationId(): string { return this.props.conversationId }
  get operation(): ProposalOperation { return this.props.operation }
  get targetMemoryId(): string | null { return this.props.targetMemoryId }
  get actor(): string { return this.props.actor }
  get title(): string { return this.props.title }
  get description(): string { return this.props.description }
  get priority(): number { return this.props.priority }
  get type(): MemoryType { return this.props.type }
  get status(): ProposalStatus { return this.props.status }
  get createdAt(): Date { return this.props.createdAt }
  get processedAt(): Date | null { return this.props.processedAt }
  get processedBy(): ProcessedBy { return this.props.processedBy }

  markProcessed(processedBy: ProcessedBy, status: ProposalStatus): MemoryChangeProposal {
    return new MemoryChangeProposal({
      ...this.props,
      status,
      processedBy,
      processedAt: new Date(),
    })
  }
}
