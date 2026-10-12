import type { MemoryDTO } from "@workspace/shared/types/memory"

export interface MemoryGroup {
  actor: string
  memories: MemoryDTO[]
}

export interface GroupMemoriesOptions {
  /** Actor that heads the list (the conversation's character). */
  characterName?: string
  /** Effective priority resolver, decay included. */
  priorityOf: (memory: MemoryDTO) => number
}

/**
 * Groups memories by actor: the conversation's character first, then the
 * actors with more memories (ties broken alphabetically). Inside a group the
 * most relevant memories come first.
 */
export const groupMemoriesByActor = (
  memories: MemoryDTO[],
  { characterName, priorityOf }: GroupMemoriesOptions,
): MemoryGroup[] => {
  const byActor = new Map<string, MemoryDTO[]>()
  for (const memory of memories) {
    const bucket = byActor.get(memory.actor)
    if (bucket) {
      bucket.push(memory)
    } else {
      byActor.set(memory.actor, [memory])
    }
  }

  return [...byActor.entries()]
    .map(([actor, items]) => ({
      actor,
      memories: items.sort((a, b) => priorityOf(b) - priorityOf(a)),
    }))
    .sort((a, b) => {
      if (characterName) {
        if (a.actor === characterName) return -1
        if (b.actor === characterName) return 1
      }
      if (b.memories.length !== a.memories.length) {
        return b.memories.length - a.memories.length
      }
      return a.actor.localeCompare(b.actor)
    })
}
