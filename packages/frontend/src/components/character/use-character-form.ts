import { useCallback, useEffect, useMemo, useState } from "react"
import { toast } from "@workspace/ui/components/sonner"
import type {
  CharacterDetail,
  CharacterVersionDTO,
  UpdateCharacterInput,
  CreateCharacterInput,
} from "@workspace/shared/types/character"
import { ApiClientError } from "@/lib/api/client"
import {
  createCharacter,
  updateCharacter,
  updateCharacterProfileImage,
} from "@/lib/api/characters"
import { uploadCharacterAsset } from "@/lib/api/client"
import { createConversation } from "@/lib/api/conversations"
import { getLorebook, importLorebook } from "@/lib/api/lorebook"
import { useTranslation } from "@/lib/hooks/use-translation"
import {
  buildCardSnapshot,
  buildLorebookSnapshot,
  buildSnapshot,
  hasChanges,
} from "./character-form-utils"
import type {
  CharacterCardFieldKey,
  CharacterCardFieldValues,
} from "./character-card-fields"
import type { LorebookEditorValue } from "./lorebook-editor"
import {
  cardFieldsFromVersion,
  cardFieldsToInput,
  emptyLorebook,
  lorebookToEditorValue,
  serializeLorebook,
} from "./character-form-fields"

export interface CardEntry {
  id: string
  title: string
  content: string
  active: boolean
}

interface UseCharacterFormOptions {
  onCreated?: (character: CharacterDetail) => void
}

function emptyCard(): CardEntry {
  return { id: crypto.randomUUID(), title: "", content: "", active: true }
}

export function useCharacterForm(
  character?: CharacterDetail,
  options: UseCharacterFormOptions = {},
) {
  const { t } = useTranslation()
  const isEditing = !!character
  const version: CharacterVersionDTO | undefined = character?.currentVersion

  const [name, setName] = useState(character?.name ?? "")
  const [subtitle, setSubtitle] = useState(version?.subtitle ?? "")
  const [profileImageAssetId, setProfileImageAssetId] = useState<string | null>(version?.profileImageAssetId ?? null)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [description, setDescription] = useState(version?.description ?? "")
  const [instructions, setInstructions] = useState(version?.instructions ?? "")
  const [greeting, setGreeting] = useState(version?.greeting ?? "")
  const [cardFields, setCardFields] = useState<CharacterCardFieldValues>(
    () => cardFieldsFromVersion(version),
  )
  const [lorebook, setLorebook] = useState<LorebookEditorValue>(emptyLorebook)
  const [cards, setCards] = useState<CardEntry[]>(
    () =>
      version?.cards.map((c) => ({
        id: c.id,
        title: c.title,
        content: c.content,
        active: c.active,
      })) ?? [],
  )
  const [versionNumber, setVersionNumber] = useState(version?.versionNumber ?? 1)
  const [selectedVersionId, setSelectedVersionId] = useState(character?.currentVersion.id ?? "")
  const [activeTab, setActiveTab] = useState("character")
  const [saving, setSaving] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [attemptedSubmit, setAttemptedSubmit] = useState(false)

  const validationErrors = useMemo(() => {
    const errors: Record<string, string | null> = {}
    errors.name = !name.trim() ? t("characters.validationName") : null
    errors.profileImage =
      !profileImageAssetId && !pendingFile
        ? t("characters.validationImage")
        : null
    errors.description = !description.trim()
      ? t("characters.validationDescription")
      : null
    errors.greeting = !greeting.trim() ? t("characters.validationGreeting") : null
    cards.forEach((c, i) => {
      if (!c.title.trim() || !c.content.trim()) {
        errors[`card-${i}`] = t("characters.validationCard")
      }
    })
    return errors
  }, [name, profileImageAssetId, pendingFile, description, greeting, cards, t])

  const hasValidationErrors = Object.values(validationErrors).some(Boolean)

  const showError = (field: string): string | null => {
    if (!touched[field] && !attemptedSubmit) return null
    return validationErrors[field] ?? null
  }

  const markTouched = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }))
  }

  const [lastSnapshot, setLastSnapshot] = useState(() =>
    buildSnapshot(
      character?.name ?? "",
      version?.subtitle,
      version?.profileImageAssetId ?? null,
      version?.description ?? "",
      version?.instructions,
      version?.greeting ?? "",
      (version?.cards ?? []).map(c => ({ title: c.title, content: c.content, active: c.active })),
      buildCardSnapshot(cardFieldsFromVersion(version)),
      buildLorebookSnapshot(emptyLorebook()),
    ),
  )

  useEffect(() => {
    if (!character) return
    let active = true
    getLorebook(character.id)
      .then((book) => {
        if (!active) return
        const next = lorebookToEditorValue(book)
        setLorebook(next)
        setLastSnapshot((prev) => ({
          ...prev,
          lorebook: buildLorebookSnapshot(next),
        }))
      })
      .catch(() => {
        // A character without a lorebook answers 404: keep the empty state.
      })
    return () => {
      active = false
    }
  }, [character])

  const setCardField = <K extends CharacterCardFieldKey>(
    field: K,
    value: CharacterCardFieldValues[K],
  ) => {
    setCardFields((prev) => ({ ...prev, [field]: value }))
  }

  const handleVersionChange = useCallback((versionId: string) => {
    setSelectedVersionId(versionId)
    setTouched({})
    setAttemptedSubmit(false)
    const v = character?.versions.find((item) => item.id === versionId)
    if (!v) return
    const nextCardFields = cardFieldsFromVersion(v)
    setName(v.name)
    setSubtitle(v.subtitle ?? "")
    setProfileImageAssetId(v.profileImageAssetId ?? null)
    setPendingFile(null)
    setDescription(v.description)
    setInstructions(v.instructions ?? "")
    setGreeting(v.greeting)
    setCardFields(nextCardFields)
    setCards(v.cards.map((c) => ({
      id: c.id,
      title: c.title,
      content: c.content,
      active: c.active,
    })))
    setVersionNumber(v.versionNumber)
    setLastSnapshot((prev) => buildSnapshot(
      v.name,
      v.subtitle,
      v.profileImageAssetId ?? null,
      v.description,
      v.instructions,
      v.greeting,
      v.cards.map((c) => ({ title: c.title, content: c.content, active: c.active })),
      buildCardSnapshot(nextCardFields),
      prev.lorebook,
    ))
  }, [character])

  const addCard = () => setCards((prev) => [...prev, emptyCard()])

  const removeCard = (idx: number) =>
    setCards((prev) => prev.filter((_, i) => i !== idx))

  const reorderCards = (fromIndex: number, toIndex: number) => {
    setCards((prev) => {
      if (fromIndex < 0 || fromIndex >= prev.length) return prev
      if (toIndex < 0 || toIndex >= prev.length) return prev
      if (fromIndex === toIndex) return prev
      const next = [...prev]
      const [moved] = next.splice(fromIndex, 1)
      next.splice(toIndex, 0, moved)
      return next
    })
  }

  const updateCard = (idx: number, field: keyof CardEntry, value: string | boolean) =>
    setCards((prev) =>
      prev.map((c, i) => (i === idx ? { ...c, [field]: value } : c)),
    )

  const currentSnapshot = buildSnapshot(
    name, subtitle, profileImageAssetId, description, instructions, greeting,
    cards.map(c => ({ title: c.title, content: c.content, active: c.active })),
    buildCardSnapshot(cardFields),
    buildLorebookSnapshot(lorebook),
  )
  const dirty = isEditing && hasChanges(currentSnapshot, lastSnapshot)
  const canSubmit = !saving && !hasValidationErrors && (!isEditing || dirty)

  const handleImageSelected = useCallback(async (file: File) => {
    setPendingFile(file)
    if (character?.id) {
      try {
        const result = await uploadCharacterAsset(character.id, file)
        setProfileImageAssetId(result.assetId)
        setPendingFile(null)
        toast.success(t("characters.imageUploaded"))
      } catch {
        setPendingFile(null)
        toast.error(t("characters.imageUploadFailed"))
      }
    }
  }, [character, t])

  const handleImageClear = useCallback(() => {
    setPendingFile(null)
    setProfileImageAssetId(null)
  }, [])

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault()
    setAttemptedSubmit(true)

    if (hasValidationErrors) return

    if (isEditing && !dirty) {
      toast.warning(t("characters.noChanges"))
      return
    }

    setSaving(true)
    try {
      if (isEditing && character) {
        const previousLorebook = lastSnapshot.lorebook
        const nextLorebookSnapshot = buildLorebookSnapshot(lorebook)
        const input: UpdateCharacterInput = {
          name: name.trim() !== character.name ? name.trim() : undefined,
          subtitle: subtitle.trim() || null,
          profileImageAssetId: profileImageAssetId !== (version?.profileImageAssetId ?? null) ? profileImageAssetId : undefined,
          description: description.trim() !== version?.description ? description.trim() : undefined,
          instructions: instructions.trim() || null,
          greeting: greeting.trim() !== version?.greeting ? greeting.trim() : undefined,
          cards: cards.map((c, i) => ({
            title: c.title,
            content: c.content,
            position: i,
            active: c.active,
          })),
          ...cardFieldsToInput(cardFields),
        }
        const result = await updateCharacter(character.id, input)
        const nextCardFields = cardFieldsFromVersion(result.currentVersion)
        setName(result.name)
        setSubtitle(result.currentVersion.subtitle ?? "")
        setProfileImageAssetId(result.currentVersion.profileImageAssetId ?? null)
        setDescription(result.currentVersion.description)
        setInstructions(result.currentVersion.instructions ?? "")
        setGreeting(result.currentVersion.greeting)
        setCardFields(nextCardFields)
        setCards(result.currentVersion.cards.map(c => ({
          id: c.id,
          title: c.title,
          content: c.content,
          active: c.active,
        })))
        setVersionNumber(result.currentVersion.versionNumber)
        setSelectedVersionId(result.currentVersion.id)
        setLastSnapshot(buildSnapshot(
          result.name,
          result.currentVersion.subtitle,
          result.currentVersion.profileImageAssetId ?? null,
          result.currentVersion.description,
          result.currentVersion.instructions,
          result.currentVersion.greeting,
          result.currentVersion.cards.map(c => ({ title: c.title, content: c.content, active: c.active })),
          buildCardSnapshot(nextCardFields),
          nextLorebookSnapshot,
        ))

        if (lorebook.entries.length > 0 && nextLorebookSnapshot !== previousLorebook) {
          try {
            const imported = await importLorebook(character.id, {
              format: "ccv3",
              payload: serializeLorebook(lorebook),
              replace: true,
            })
            const next = lorebookToEditorValue(imported)
            setLorebook(next)
            setLastSnapshot((prev) => ({
              ...prev,
              lorebook: buildLorebookSnapshot(next),
            }))
          } catch {
            toast.warning(t("characters.lorebookImportFailed"))
          }
        }
        toast.success(t("characters.updated"))
      } else {
        const input: CreateCharacterInput = {
          name: name.trim(),
          subtitle: subtitle.trim() || null,
          profileImageAssetId: null,
          description: description.trim(),
          instructions: instructions.trim() || null,
          greeting: greeting.trim(),
          cards: cards
            .filter((c) => c.title.trim() && c.content.trim())
            .map((c) => ({ title: c.title, content: c.content, active: c.active })),
          ...cardFieldsToInput(cardFields),
          ...(lorebook.entries.length > 0
            ? {
                lorebook: {
                  format: "ccv3" as const,
                  payload: serializeLorebook(lorebook),
                },
              }
            : {}),
        }
        const result = await createCharacter(input)
        options.onCreated?.(result)
        if (pendingFile) {
          const upload = await uploadCharacterAsset(result.id, pendingFile)
          await updateCharacterProfileImage(result.id, upload.assetId)
        }
        const conv = await createConversation({ characterId: result.id })
        if (conv.defaultProviderStatus !== "available") {
          toast.warning(
            conv.defaultProviderStatus === "unconfigured"
              ? t("characters.noDefaultProvider")
              : t("characters.defaultProviderUnavailable"),
            { description: conv.defaultProviderMessage },
          )
        }
        location.href = `/conversations/${conv.conversation.id}`
        return
      }
    } catch (e) {
      if (e instanceof ApiClientError) {
        toast.error(`${t("common.error")}: ${e.message}`)
      } else {
        toast.error(t("characters.saveUnexpectedError"))
      }
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!character) return
    setSaving(true)
    try {
      const { deleteCharacter: del } = await import("@/lib/api/characters")
      await del(character.id)
      toast.success(t("characters.deleted"))
      location.href = "/"
    } catch (e) {
      if (e instanceof ApiClientError) {
        toast.error(`${t("common.error")}: ${e.message}`)
      } else {
        toast.error(t("characters.deleteUnexpectedError"))
      }
    } finally {
      setSaving(false)
      setShowDeleteDialog(false)
    }
  }

  const handleStartConversation = async () => {
    if (!character) return
    try {
      const conv = await createConversation({
        characterId: character.id,
        versionId: selectedVersionId !== character.currentVersion.id ? selectedVersionId : undefined,
      })
      if (conv.defaultProviderStatus !== "available") {
        toast.warning(
          conv.defaultProviderStatus === "unconfigured"
            ? t("characters.noDefaultProvider")
            : t("characters.defaultProviderUnavailable"),
          { description: conv.defaultProviderMessage },
        )
      }
      location.href = `/conversations/${conv.conversation.id}`
    } catch {
      toast.error(t("characters.conversationCreateFailed"))
    }
  }

  return {
    isEditing,
    version,
    name, setName,
    subtitle, setSubtitle,
    profileImageAssetId,
    pendingFile,
    handleImageSelected,
    handleImageClear,
    description, setDescription,
    instructions, setInstructions,
    greeting, setGreeting,
    cards,
    cardFields,
    setCardField,
    lorebook,
    setLorebook,
    versionNumber,
    activeTab, setActiveTab,
    saving,
    showDeleteDialog, setShowDeleteDialog,
    selectedVersionId, handleVersionChange,
    dirty,
    addCard,
    removeCard,
    reorderCards,
    updateCard,
    showError,
    markTouched,
    canSubmit,
    handleSubmit,
    handleDelete,
    handleStartConversation,
  }
}
