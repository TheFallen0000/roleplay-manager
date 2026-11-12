import { useCallback, useEffect, useState } from "react"

import type {
  CreateLorebookEntryInput,
  LorebookDTO,
  LorebookVersionDTO,
  UpdateLorebookInput,
} from "@workspace/shared/types/lorebook"
import { ApiClientError } from "@/lib/api/client"
import {
  createLorebook,
  getLorebook,
  getLorebookVersion,
  listLorebookVersions,
  updateLorebook,
} from "@/lib/api/lorebooks"
import { useTranslation } from "@/lib/hooks/use-translation"

import { lorebookToEditorValue } from "./character-form-fields"
import type { LorebookEditorEntry } from "./lorebook-editor"

const toEntryInput = (
  entry: LorebookEditorEntry,
): CreateLorebookEntryInput => ({
  keys: entry.keys,
  secondaryKeys: entry.secondaryKeys,
  content: entry.content,
  comment: entry.comment,
  constant: entry.constant,
  selective: entry.selective,
  selectiveLogic: entry.selectiveLogic,
  insertionOrder: entry.insertionOrder,
  position: entry.position,
  priority: entry.priority,
  enabled: entry.enabled,
  caseSensitive: entry.caseSensitive,
  wholeWords: entry.wholeWords,
})

const toEntriesInput = (
  entries: LorebookEditorEntry[],
): CreateLorebookEntryInput[] => entries.map(toEntryInput)

export function useLorebookPage(lorebookId?: string) {
  const { t } = useTranslation()
  const isEditing = lorebookId !== undefined

  const [lorebook, setLorebook] = useState<LorebookDTO | null>(null)
  const [versions, setVersions] = useState<LorebookVersionDTO[]>([])
  const [selectedVersionId, setSelectedVersionId] = useState("")
  const [readOnly, setReadOnly] = useState(false)
  const [loading, setLoading] = useState(isEditing)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [scanDepth, setScanDepth] = useState(4)
  const [tokenBudget, setTokenBudget] = useState(400)
  const [recursiveScanning, setRecursiveScanning] = useState(false)
  const [entries, setEntries] = useState<LorebookEditorEntry[]>([])

  const hydrateFromBook = useCallback((book: LorebookDTO) => {
    const value = lorebookToEditorValue(book)
    setName(value.name)
    setDescription(value.description ?? "")
    setScanDepth(value.scanDepth ?? 4)
    setTokenBudget(value.tokenBudget ?? 400)
    setRecursiveScanning(value.recursiveScanning ?? false)
    setEntries(value.entries)
  }, [])

  const hydrateFromVersion = useCallback((version: LorebookVersionDTO) => {
    const value = lorebookToEditorValue({
      id: version.lorebookId,
      name: version.name,
      description: version.description,
      scanDepth: version.scanDepth,
      tokenBudget: version.tokenBudget,
      recursiveScanning: version.recursiveScanning,
      extensions: null,
      unknownFields: null,
      entries: version.entries,
    })
    setName(value.name)
    setDescription(value.description ?? "")
    setScanDepth(value.scanDepth ?? 4)
    setTokenBudget(value.tokenBudget ?? 400)
    setRecursiveScanning(value.recursiveScanning ?? false)
    setEntries(value.entries)
  }, [])

  useEffect(() => {
    if (!lorebookId) return

    let active = true
    Promise.all([getLorebook(lorebookId), listLorebookVersions(lorebookId)])
      .then(([book, bookVersions]) => {
        if (!active) return
        setLorebook(book)
        setVersions(bookVersions)
        const currentId =
          book.currentVersionId ?? bookVersions[bookVersions.length - 1]?.id ?? ""
        setSelectedVersionId(currentId)
        setReadOnly(false)
        hydrateFromBook(book)
      })
      .catch((caught: unknown) => {
        if (!active) return
        setError(
          caught instanceof ApiClientError
            ? caught.message
            : t("lorebooks.loadFailed"),
        )
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [hydrateFromBook, lorebookId, t])

  const handleVersionChange = useCallback(
    async (versionId: string) => {
      if (!lorebook) return
      setSelectedVersionId(versionId)
      const currentId = lorebook.currentVersionId
      if (versionId === currentId) {
        setReadOnly(false)
        hydrateFromBook(lorebook)
        return
      }

      try {
        const version = await getLorebookVersion(lorebook.id, versionId)
        if (!version) return
        setReadOnly(true)
        hydrateFromVersion(version)
      } catch (caught: unknown) {
        setSaveError(
          caught instanceof ApiClientError
            ? caught.message
            : t("lorebooks.loadFailed"),
        )
      }
    },
    [hydrateFromBook, hydrateFromVersion, lorebook, t],
  )

  const save = useCallback(async () => {
    if (saving || readOnly) return
    setSaving(true)
    setSaveError(null)
    try {
      if (!lorebookId) {
        const created = await createLorebook({
          name: name.trim(),
          description: description.trim() || null,
          scanDepth,
          tokenBudget,
          recursiveScanning,
          entries: toEntriesInput(entries),
        })
        setLorebook(created)
        location.href = `/lorebooks/${created.id}`
        return
      }

      const input: UpdateLorebookInput = {
        name: name.trim() || null,
        description: description.trim() || null,
        scanDepth,
        tokenBudget,
        recursiveScanning,
        entries: toEntriesInput(entries),
      }
      const result = await updateLorebook(lorebookId, input)
      setLorebook(result.lorebook)
      setSelectedVersionId(result.lorebook.currentVersionId ?? selectedVersionId)
      setReadOnly(false)
      hydrateFromBook(result.lorebook)
      setVersions(await listLorebookVersions(lorebookId))
    } catch (caught: unknown) {
      setSaveError(
        caught instanceof ApiClientError
          ? caught.message
          : t("lorebooks.saveFailed"),
      )
    } finally {
      setSaving(false)
    }
  }, [
    description,
    entries,
    hydrateFromBook,
    lorebookId,
    name,
    readOnly,
    recursiveScanning,
    saving,
    scanDepth,
    selectedVersionId,
    t,
    tokenBudget,
  ])

  return {
    isEditing,
    lorebook,
    versions,
    selectedVersionId,
    readOnly,
    loading,
    saving,
    error,
    saveError,
    name,
    setName,
    description,
    setDescription,
    scanDepth,
    setScanDepth,
    tokenBudget,
    setTokenBudget,
    recursiveScanning,
    setRecursiveScanning,
    entries,
    setEntries,
    handleVersionChange,
    save,
  }
}

export type LorebookPageState = ReturnType<typeof useLorebookPage>
