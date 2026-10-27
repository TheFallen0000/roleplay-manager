import {
  effectivePriority,
  isDeletionCandidate,
  isPromptEligible,
  turnsSince,
} from "@workspace/shared/lib/memory-decay"
import type { ConversationDetail } from "@workspace/shared/types/conversation"
import type { MemoryDTO } from "@workspace/shared/types/memory"

export interface MemoryDecayDisplayInfo {
  turns: number
  effectivePriority: number
  isPromptEligible: boolean
  isDeletionCandidate: boolean
  hasDecayed: boolean
}

export function memoryDecayInfo(
  memory: MemoryDTO,
  conversation: Pick<
    ConversationDetail,
    "memoryDecayThreshold" | "memoryDecayAgeThreshold" | "memoryDecaySpeed"
  >,
  messages: readonly { role: string; createdAt: string | Date }[],
  turnsOverride?: number,
): MemoryDecayDisplayInfo {
  const turns = turnsOverride ?? turnsSince(memory.updatedAt, messages)
  const priority = effectivePriority(
    memory.priority,
    turns,
    conversation.memoryDecaySpeed,
  )
  return {
    turns,
    effectivePriority: priority,
    isPromptEligible: isPromptEligible(
      memory.priority,
      turns,
      conversation.memoryDecayThreshold,
      conversation.memoryDecaySpeed,
    ),
    isDeletionCandidate: isDeletionCandidate(
      memory.priority,
      turns,
      conversation.memoryDecayThreshold,
      conversation.memoryDecayAgeThreshold,
      conversation.memoryDecaySpeed,
    ),
    hasDecayed: priority !== memory.priority,
  }
}
