import { useCallback, useEffect, useMemo, useState } from "react"

import type {
  CharacterDetail,
  CharacterVersionDTO,
  CreateCharacterInput,
  UpdateCharacterInput,
} from "@workspace/shared/types/character"
import type {
  LorebookSummaryDTO,
  LorebookVersionDTO,
  LorebookVersionSummary,
} from "@workspace/shared/types/lorebook"
import { ApiClientError } from "@/lib/api/client"
import {
  createCharacter,
  getCharacter,
  updateCharacter,
} from "@/lib/api/characters"
import { uploadCharacterAsset } from "@/lib/api/client"
import {
  getLorebook,
  listLorebooks,
  listLorebookVersions,
} from "@/lib/api/lorebooks"
import { useTranslation } from "@/lib/hooks/use-translation"

import {
  buildCardSnapshot,
  buildSnapshot,
  hasChanges,
} from "./character-form-utils"
import {
  cardFieldsFromVersion,
  cardFieldsToInput,
} from "./card-field-values"
import type {
  CharacterCardFieldKey,
  CharacterCardFieldValues,
} from "./character-card-fields"

export interface CardEntry {
  id: string
  title: string
  content: string
  active: boolean
}

interface SaveOverrides {
  lorebookVersionId?: string | null
}

const emptyCard = (): CardEntry => ({
  id: crypto.randomUUID(),
  title: "",
  content: "",
  active: true,
})

const toCardEntries = (version?: CharacterVersionDTO): CardEntry[] =>
  version?.cards.map((card) => ({
    id: card.id,
    title: card.title,
    content: card.content,
    active: card.active,
  })) ?? []

const toSnapshot = (
  detail: CharacterDetail | null,
  cardFields: CharacterCardFieldValues,
) =>
  detail
    ? buildSnapshot(
        detail.name,
        detail.currentVersion.subtitle,
        detail.currentVersion.profileImageAssetId,
        detail.currentVersion.description,
        detail.currentVersion.instructions,
        detail.currentVersion.greeting,
        detail.currentVersion.cards.map((card) => ({
          title: card.title,
          content: card.content,
          active: card.active,
        })),
        buildCardSnapshot(cardFields),
      )
    : buildSnapshot("", null, null, "", null, "", [], buildCardSnapshot(cardFields))

export function useCharacterPage(characterId?: string) {
  const { t } = useTranslation()
  const isEditing = characterId !== undefined

  const [character, setCharacter] = useState<CharacterDetail | null>(null)
  const [loading, setLoading] = useState(isEditing)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const [name, setName] = useState("")
  const [subtitle, setSubtitle] = useState("")
  const [profileImageAssetId, setProfileImageAssetId] = useState<string | null>(null)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [description, setDescription] = useState("")
  const [instructions, setInstructions] = useState("")
  const [greeting, setGreeting] = useState("")
  const [cards, setCards] = useState<CardEntry[]>([])
  const [cardFields, setCardFields] = useState<CharacterCardFieldValues>(() =>
    cardFieldsFromVersion(undefined),
  )

  const [lorebooks, setLorebooks] = useState<LorebookSummaryDTO[]>([])
  const [lorebookVersionId, setLorebookVersionId] = useState<string | null>(null)
  const [lorebookSummary, setLorebookSummary] =
    useState<LorebookVersionSummary | null>(null)
  const [lorebookVersions, setLorebookVersions] = useState<
    LorebookVersionDTO[]
  >([])
  const [lastLorebookVersionId, setLastLorebookVersionId] = useState<string | null>(
    null,
  )
  const [lastSnapshot, setLastSnapshot] = useState(() =>
    toSnapshot(null, cardFieldsFromVersion(undefined)),
  )

  const hydrate = useCallback((detail: CharacterDetail) => {
    const version = detail.currentVersion
    const nextCardFields = cardFieldsFromVersion(version)
    setName(detail.name)
    setSubtitle(version.subtitle ?? "")
    setProfileImageAssetId(version.profileImageAssetId ?? null)
    setDescription(version.description)
    setInstructions(version.instructions ?? "")
    setGreeting(version.greeting)
    setCards(toCardEntries(version))
    setCardFields(nextCardFields)
    setLorebookVersionId(version.lorebookVersion?.versionId ?? null)
    setLorebookSummary(version.lorebookVersion ?? null)
    setLastLorebookVersionId(version.lorebookVersion?.versionId ?? null)
    setLastSnapshot(toSnapshot(detail, nextCardFields))
  }, [])

  useEffect(() => {
    let active = true
    listLorebooks()
      .then((books) => {
        if (active) setLorebooks(books)
      })
      .catch(() => {
        // The selector is optional; a directory error must not block the page.
      })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!characterId) return
    let active = true
    getCharacter(characterId)
      .then((detail) => {
        if (!active) return
        setCharacter(detail)
        hydrate(detail)
      })
      .catch((error: unknown) => {
        if (!active) return
        setLoadError(
          error instanceof ApiClientError
            ? error.message
            : t("characters.notFoundDescription"),
        )
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [characterId, hydrate, t])

  const setCardField = <K extends CharacterCardFieldKey>(
    field: K,
    value: CharacterCardFieldValues[K],
  ) => {
    setCardFields((previous) => ({ ...previous, [field]: value }))
  }

  const addCard = () => setCards((previous) => [...previous, emptyCard()])
  const removeCard = (index: number) =>
    setCards((previous) => previous.filter((_, itemIndex) => itemIndex !== index))
  const updateCard = (
    index: number,
    field: keyof CardEntry,
    value: string | boolean,
  ) =>
    setCards((previous) =>
      previous.map((card, itemIndex) =>
        itemIndex === index ? { ...card, [field]: value } : card,
      ),
    )

  const handleImageSelected = useCallback(
    async (file: File) => {
      setPendingFile(file)
      if (characterId) {
        try {
          const result = await uploadCharacterAsset(characterId, file)
          setProfileImageAssetId(result.assetId)
          setPendingFile(null)
        } catch {
          setPendingFile(null)
        }
      }
    },
    [characterId],
  )

  const handleImageClear = useCallback(() => {
    setPendingFile(null)
    setProfileImageAssetId(null)
  }, [])

  const changeLorebook = useCallback(
    async (bookId: string, versionId?: string) => {
      try {
        const [book, versions] = await Promise.all([
          getLorebook(bookId),
          listLorebookVersions(bookId),
        ])
        setLorebookVersions(versions)

        const selected =
          (versionId
            ? versions.find((version) => version.id === versionId)
            : undefined) ??
          versions.find(
            (version) => version.versionNumber === book.currentVersionNumber,
          ) ??
          versions[versions.length - 1]
        if (!selected) return

        const isCurrent =
          selected.id === book.currentVersionId ||
          selected.versionNumber === book.currentVersionNumber

        setLorebookVersionId(selected.id)
        setLorebookSummary({
          lorebookId: book.id,
          versionId: selected.id,
          versionNumber: selected.versionNumber,
          name: selected.name ?? book.name,
          entryCount: selected.entries.length,
          sourceKey: selected.sourceKey,
          originId: book.originId,
          status: isCurrent ? "current" : "outdated",
        })
      } catch (error: unknown) {
        setSaveError(
          error instanceof ApiClientError
            ? error.message
            : t("characters.saveUnexpectedError"),
        )
      }
    },
    [t],
  )

  const save = useCallback(
    async (overrides: SaveOverrides = {}) => {
      if (saving) return
      const nextLorebookVersionId =
        overrides.lorebookVersionId !== undefined
          ? overrides.lorebookVersionId
          : lorebookVersionId
      setSaving(true)
      setSaveError(null)
      try {
        if (!isEditing) {
          const input: CreateCharacterInput = {
            name: name.trim(),
            subtitle: subtitle.trim() || null,
            profileImageAssetId,
            description: description.trim(),
            instructions: instructions.trim() || null,
            greeting: greeting.trim(),
            cards: cards
              .filter((card) => card.title.trim() && card.content.trim())
              .map((card) => ({
                title: card.title,
                content: card.content,
                active: card.active,
              })),
            ...cardFieldsToInput(cardFields),
            ...(nextLorebookVersionId
              ? { lorebookVersionId: nextLorebookVersionId }
              : {}),
          }
          const result = await createCharacter(input)
          location.href = `/characters/${result.id}`
          return
        }

        if (!character) return
        const input: UpdateCharacterInput = {
          name: name.trim(),
          subtitle: subtitle.trim() || null,
          profileImageAssetId,
          description: description.trim(),
          instructions: instructions.trim() || null,
          greeting: greeting.trim(),
          cards: cards.map((card, index) => ({
            title: card.title,
            content: card.content,
            position: index,
            active: card.active,
          })),
          ...cardFieldsToInput(cardFields),
          lorebookVersionId: nextLorebookVersionId,
        }
        const result = await updateCharacter(character.id, input)
        setCharacter(result)
        hydrate(result)
      } catch (error: unknown) {
        setSaveError(
          error instanceof ApiClientError
            ? error.message
            : t("characters.saveUnexpectedError"),
        )
      } finally {
        setSaving(false)
      }
    },
    [
      cards,
      cardFields,
      character,
      description,
      greeting,
      hydrate,
      instructions,
      isEditing,
      lorebookVersionId,
      name,
      profileImageAssetId,
      saving,
      subtitle,
      t,
    ],
  )

  const removeLorebook = useCallback(async () => {
    setLorebookVersionId(null)
    setLorebookSummary(null)
    setLorebookVersions([])
    await save({ lorebookVersionId: null })
  }, [save])

  const currentSnapshot = useMemo(
    () =>
      buildSnapshot(
        name,
        subtitle,
        profileImageAssetId,
        description,
        instructions,
        greeting,
        cards.map((card) => ({
          title: card.title,
          content: card.content,
          active: card.active,
        })),
        buildCardSnapshot(cardFields),
      ),
    [
      cardFields,
      cards,
      description,
      greeting,
      instructions,
      name,
      profileImageAssetId,
      subtitle,
    ],
  )
  const dirty =
    !isEditing ||
    hasChanges(currentSnapshot, lastSnapshot) ||
    lorebookVersionId !== lastLorebookVersionId

  const versions = character?.versions ?? []

  return {
    isEditing,
    character,
    loading,
    loadError,
    saving,
    saveError,
    name,
    setName,
    subtitle,
    setSubtitle,
    profileImageAssetId,
    pendingFile,
    handleImageSelected,
    handleImageClear,
    description,
    setDescription,
    instructions,
    setInstructions,
    greeting,
    setGreeting,
    cards,
    addCard,
    removeCard,
    updateCard,
    cardFields,
    setCardField,
    lorebooks,
    lorebookVersionId,
    lorebookSummary,
    lorebookVersions,
    changeLorebook,
    removeLorebook,
    versions,
    dirty,
    save,
  }
}

export type CharacterPageState = ReturnType<typeof useCharacterPage>
