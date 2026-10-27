import type { Conversation } from "../domain/entities/conversation.entity"
import type { Memory } from "../domain/entities/memory.entity"
import { MemoryDecayPolicy } from "../domain/value-objects/memory-decay-policy"

export function filterMemoriesForPrompt(
  conversation: Conversation,
  memories: Memory[],
  messages: readonly { role: string; createdAt: Date }[],
): Memory[] {
  const policy = MemoryDecayPolicy.fromConversation(conversation)
  return memories.filter((memory) =>
    policy.isPromptEligible(memory.priority, policy.turnsSince(memory.updatedAt, messages)),
  )
}
