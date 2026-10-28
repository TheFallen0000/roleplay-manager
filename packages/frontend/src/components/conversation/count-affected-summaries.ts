import type { MessageDTO } from "@workspace/shared/types/message"
import type { SummaryDTO } from "@workspace/shared/types/summary"

/**
 * Summaries whose range overlaps the messages a rewind would delete. The
 * confirmation dialog uses it to warn before losing summaries.
 */
export const countAffectedSummaries = (
  messages: readonly MessageDTO[],
  targetId: string,
  summaries: readonly SummaryDTO[],
): number => {
  const target = messages.find((message) => message.id === targetId)
  if (!target) return 0

  const deletedIds = new Set<string>()
  for (const message of messages) {
    if (message.position > target.position) deletedIds.add(message.id)
  }
  if (target.role === "user") deletedIds.add(target.id)

  return summaries.filter(
    (summary) =>
      deletedIds.has(summary.firstMessageId) ||
      deletedIds.has(summary.lastMessageId),
  ).length
}
