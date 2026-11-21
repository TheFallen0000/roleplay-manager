import type { TranslationKey } from "@workspace/shared/i18n"
import {
  effectivePriority,
  isDeletionCandidate,
  isPromptEligible,
  turnsSince,
} from "@workspace/shared/lib/memory-decay"
import type { ConversationDetail } from "@workspace/shared/types/conversation"
import type { MemorySelectionReason } from "@workspace/shared/types/context"
import type { MemoryDTO, MemoryType } from "@workspace/shared/types/memory"

const MEMORY_TYPE_LABEL_KEYS: Record<MemoryType, TranslationKey> = {
  fact: "memory.typeFact",
  episode: "memory.typeEpisode",
  thread: "memory.typeThread",
}

const MEMORY_SELECTION_REASON_KEYS: Record<
  MemorySelectionReason,
  TranslationKey
> = {
  actor: "memory.selectionReason.actor",
  keyword: "memory.selectionReason.keyword",
  priority: "memory.selectionReason.priority",
  thread: "memory.selectionReason.thread",
  budget: "memory.selectionReason.budget",
  decay: "memory.selectionReason.decay",
  "not-relevant": "memory.selectionReason.notRelevant",
}

export const memoryTypeLabelKey = (type: MemoryType): TranslationKey =>
  MEMORY_TYPE_LABEL_KEYS[type]

export const memorySelectionReasonKey = (
  reason: MemorySelectionReason,
): TranslationKey => MEMORY_SELECTION_REASON_KEYS[reason]

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
