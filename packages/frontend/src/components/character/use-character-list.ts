import { useCallback, useEffect, useMemo, useState } from "react"

import type {
  CharacterSummary,
  CharacterVersionDTO,
} from "@workspace/shared/types/character"
import type { ConversationSummary } from "@workspace/shared/types/conversation"

import {
  listCharactersPage,
  listCharacterVersions,
} from "@/lib/api/characters"
import { listConversations } from "@/lib/api/conversations"

const PAGE_SIZE = 60
const CONVERSATION_LIMIT = 500

export interface UseCharacterListResult {
  characters: CharacterSummary[]
  conversationsByCharacter: Map<string, ConversationSummary[]>
  latestConversationByCharacter: Map<string, ConversationSummary>
  lastActivityByCharacter: Map<string, string>
  hasMore: boolean
  loading: boolean
  loadingMore: boolean
  error: Error | null
  loadMoreError: Error | null
  refresh: () => Promise<void>
  loadMore: () => Promise<void>
  loadVersions: (characterId: string) => Promise<CharacterVersionDTO[]>
}

function sortByMostRecent(a: ConversationSummary, b: ConversationSummary): number {
  return (
    new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime()
  )
}

const mergeById = <T extends { id: string }>(current: T[], next: T[]): T[] => {
  const byId = new Map(current.map((item) => [item.id, item]))
  for (const item of next) byId.set(item.id, item)
  return [...byId.values()]
}

export function useCharacterList(): UseCharacterListResult {
  const [characters, setCharacters] = useState<CharacterSummary[]>([])
  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [hasMore, setHasMore] = useState(false)
  const [nextOffset, setNextOffset] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [loadMoreError, setLoadMoreError] = useState<Error | null>(null)
  const [versionsCache, setVersionsCache] = useState<
    Map<string, CharacterVersionDTO[]>
  >(() => new Map())

  const fetchPage = useCallback(async (offset: number, replace: boolean) => {
    const page = await listCharactersPage({ limit: PAGE_SIZE, offset })
    setCharacters((current) =>
      replace ? page.characters : mergeById(current, page.characters),
    )
    setHasMore(page.hasMore)
    setNextOffset(page.nextOffset)

    const characterIds = page.characters.map((character) => character.id)
    const nextConversations =
      characterIds.length > 0
        ? await listConversations({
            characterIds,
            limit: CONVERSATION_LIMIT,
          })
        : []
    setConversations((current) =>
      replace
        ? nextConversations
        : mergeById(current, nextConversations),
    )
  }, [])

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    setLoadMoreError(null)
    try {
      await fetchPage(0, true)
    } catch (fetchError) {
      setError(fetchError as Error)
    } finally {
      setLoading(false)
    }
  }, [fetchPage])

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        await fetchPage(0, true)
      } catch (fetchError) {
        if (active) setError(fetchError as Error)
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [fetchPage])

  const loadMore = useCallback(async () => {
    if (!hasMore || loadingMore || nextOffset === null) return
    setLoadingMore(true)
    setLoadMoreError(null)
    try {
      await fetchPage(nextOffset, false)
    } catch (fetchError) {
      setLoadMoreError(fetchError as Error)
    } finally {
      setLoadingMore(false)
    }
  }, [fetchPage, hasMore, loadingMore, nextOffset])

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
    hasMore,
    loading,
    loadingMore,
    error,
    loadMoreError,
    refresh,
    loadMore,
    loadVersions,
  }
}
