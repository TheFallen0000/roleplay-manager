import type {
  ToolCall,
  ToolCallDelta,
  ToolDefinition,
} from "../domain/value-objects/prompt-context"
import type { RawProposal } from "./memory-proposal-extractor"

export const PROPOSE_MEMORY_CHANGES_TOOL_NAME = "propose_memory_changes"

export function buildProposeMemoryChangesTool(): ToolDefinition {
  return {
    type: "function",
    function: {
      name: PROPOSE_MEMORY_CHANGES_TOOL_NAME,
      description:
        "Propose changes to the dynamic memory. Call this when the turn establishes or changes a durable fact. Each call represents a single proposal; the user decides whether to apply it.",
      parameters: {
        type: "object",
        properties: {
          operation: {
            type: "string",
            enum: ["CREATE", "UPDATE", "DELETE"],
            description: "The operation to perform on the memory.",
          },
          targetMemoryId: {
            type: "string",
            description:
              "Required for UPDATE and DELETE. The exact id shown in the dynamic memory list.",
          },
          actor: {
            type: "string",
            description:
              "The character, entity or place this memory is about. Required for CREATE; for UPDATE, omit to keep the current value.",
          },
          title: {
            type: "string",
            description:
              "Short title (3-8 words). Required for CREATE; for UPDATE, omit to keep the current value.",
          },
          description: {
            type: "string",
            description:
              "One or two sentences. Required for CREATE; for UPDATE, omit to keep the current value.",
          },
          priority: {
            type: "number",
            description:
              "Integer between 1 and 10. Higher means more important and lasts longer. Optional: 5 on CREATE, current value on UPDATE.",
          },
        },
        required: ["operation"],
      },
    },
  }
}

export function accumulateToolCallDeltas(
  deltas: ToolCallDelta[],
): ToolCall[] {
  const byIndex = new Map<number, { call: ToolCall; order: number }>()
  let order = 0

  for (const delta of deltas) {
    const existing = byIndex.get(delta.index)
    if (!existing) {
      byIndex.set(delta.index, {
        call: {
          id: delta.id ?? "",
          functionName: delta.functionName ?? "",
          arguments: delta.argumentsDelta ?? "",
        },
        order: order++,
      })
      continue
    }

    if (delta.id && !existing.call.id) existing.call.id = delta.id
    if (delta.functionName && !existing.call.functionName) {
      existing.call.functionName = delta.functionName
    }
    if (delta.argumentsDelta) {
      existing.call.arguments =
        (existing.call.arguments ?? "") + delta.argumentsDelta
    }
  }

  return Array.from(byIndex.values())
    .sort((a, b) => a.order - b.order)
    .map((entry) => entry.call)
}

export function toolCallsToRawProposals(calls: ToolCall[]): RawProposal[] {
  const validOps = new Set(["CREATE", "UPDATE", "DELETE"])
  const out: RawProposal[] = []

  for (const call of calls) {
    if (call.functionName !== PROPOSE_MEMORY_CHANGES_TOOL_NAME) continue

    let parsed: unknown
    try {
      parsed = JSON.parse(call.arguments)
    } catch {
      continue
    }

    if (typeof parsed !== "object" || parsed === null) continue

    const obj = parsed as Record<string, unknown>
    const operation = obj.operation
    if (typeof operation !== "string" || !validOps.has(operation)) continue

    const actor = String(obj.actor ?? "").trim()
    const title = String(obj.title ?? "").trim()
    // CREATE needs actor and title; UPDATE and DELETE can be hydrated from the
    // target memory, so they only require targetMemoryId.
    if (operation === "CREATE" && (!actor || !title)) continue

    const description = String(obj.description ?? "").trim()
    const targetMemoryId =
      typeof obj.targetMemoryId === "string" ? obj.targetMemoryId.trim() : undefined
    const priority =
      typeof obj.priority === "number"
        ? obj.priority
        : typeof obj.priority === "string" && obj.priority.trim() !== ""
          ? Number(obj.priority)
          : undefined

    out.push({
      operation: operation as "CREATE" | "UPDATE" | "DELETE",
      targetMemoryId,
      actor,
      title,
      description,
      priority,
    })
  }

  return out
}
