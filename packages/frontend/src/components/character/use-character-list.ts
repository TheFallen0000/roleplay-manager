import { useCallback, useEffect, useMemo, useState } from "react"

import type {
  CharacterSummary,
  CharacterVersionDTO,
} from "@workspace/shared/types/character"
import type { ConversationSummary } from "@workspace/shared/types/conversation"

import { listCharacters, listCharacterVersions } from "@/lib/api/characters"
import { listConversations } from "@/lib/api/conversations"

export interface UseCharacterListResult {
  characters: CharacterSummary[]
  conversationsByCharacter: Map<string, ConversationSummary[]>
  latestConversationByCharacter: Map<string, ConversationSummary>
  lastActivityByCharacter: Map<string, string>
  loading: boolean
  error: Error | null
  refresh: () => Promise<void>
  loadVersions: (characterId: string) => Promise<CharacterVersionDTO[]>
}

function sortByMostRecent(a: ConversationSummary, b: ConversationSummary): number {
  return (
    new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime()
  )
}

export function useCharacterList(): UseCharacterListResult {
  const [characters, setCharacters] = useState<CharacterSummary[]>([])
  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [versionsCache, setVersionsCache] = useState<
    Map<string, CharacterVersionDTO[]>
  >(() => new Map())

  const fetchAll = useCallback(async () => {
    const [chars, convs] = await Promise.all([
      listCharacters(),
      listConversations(),
    ])
    setCharacters(chars)
    setConversations(convs)
  }, [])

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      await fetchAll()
    } catch (fetchError) {
      setError(fetchError as Error)
    } finally {
      setLoading(false)
    }
  }, [fetchAll])

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        await fetchAll()
      } catch (fetchError) {
        if (active) {
          setError(fetchError as Error)
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    })()
    return () => {
      active = false
    }
  }, [fetchAll])

  const conversationsByCharacter = useMemo(() => {
    const map = new Map<string, ConversationSummary[]>()
    for (const conv of conversations) {
      const list = map.get(conv.characterId) ?? []
      list.push(conv)
      map.set(conv.characterId, list)
    }
    for (const list of map.values()) {
      list.sort(sortByMostRecent)
    }
    return map
  }, [conversations])

  const latestConversationByCharacter = useMemo(() => {
    const map = new Map<string, ConversationSummary>()
    for (const [characterId, list] of conversationsByCharacter) {
      const latest = list[0]
      if (latest) {
        map.set(characterId, latest)
      }
    }
    return map
  }, [conversationsByCharacter])

  const lastActivityByCharacter = useMemo(() => {
    const map = new Map<string, string>()
    for (const [characterId, latest] of latestConversationByCharacter) {
      map.set(characterId, latest.lastActivityAt)
    }
    return map
  }, [latestConversationByCharacter])

  const loadVersions = useCallback(
    async (characterId: string): Promise<CharacterVersionDTO[]> => {
      const cached = versionsCache.get(characterId)
      if (cached) {
        return cached
      }
      const versions = await listCharacterVersions(characterId)
      setVersionsCache((prev) => {
        const next = new Map(prev)
        next.set(characterId, versions)
        return next
      })
      return versions
    },
    [versionsCache],
  )

  return {
    characters,
    conversationsByCharacter,
    latestConversationByCharacter,
    lastActivityByCharacter,
    loading,
    error,
    refresh,
    loadVersions,
  }
}
