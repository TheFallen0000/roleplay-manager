import { useMemo, useState } from "react"
import { ChevronDownIcon, FileJsonIcon, PlusIcon, UploadIcon } from "lucide-react"

import type { CharacterSummary } from "@workspace/shared/types/character"
import type { CharacterExport } from "@workspace/shared/types/export"
import { Spinner } from "@workspace/ui/components/spinner"
import { toast } from "@workspace/ui/components/sonner"

import { createConversation } from "@/lib/api/conversations"
import { deleteCharacter, importCharacter } from "@/lib/api/characters"
import { ApiClientError } from "@/lib/api/client"
import { parseCharacterExport } from "@/lib/parse-character-export"
import { I18nProvider } from "@/lib/hooks/i18n-provider"
import type { Locale } from "@workspace/shared/i18n"
import { useTranslation } from "@/lib/hooks/use-translation"
import { translateApiError } from "@/lib/translate-api-error"
import {
  DEFAULT_CHARACTER_SORT,
  sortCharacters,
  type CharacterSortKey,
} from "@/lib/sort-characters"
import { MascotPose } from "../layout/brand"
import { CreateDialog } from "../shared/create-dialog"
import { LoadErrorState } from "../shared/states/load-error-state"
import { CharacterCard } from "./character-card"
import { CharacterDropOverlay } from "./character-drop-overlay"
import { CharacterListToolbar } from "./character-list-toolbar"
import {
  ImportCharacterDialog,
  type ImportCharacterResult,
} from "./import-character-dialog"
import { SillyTavernImportDialog } from "./sillytavern-import-dialog"
import { useCharacterList } from "./use-character-list"

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
}

export function CharacterList({ locale }: { locale: Locale }) {
  return (
    <I18nProvider initialLocale={locale}>
      <CharacterListContent />
    </I18nProvider>
  )
}

function CharacterListContent() {
  const {
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
  } = useCharacterList()

  const { t, tRaw, locale } = useTranslation()

  const [importOpen, setImportOpen] = useState(false)
  const [cardImportOpen, setCardImportOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [sort, setSort] = useState<CharacterSortKey>(DEFAULT_CHARACTER_SORT)

  const visibleCharacters = useMemo(() => {
    const term = normalizeText(search)
    const filtered = term
      ? characters.filter((character) => {
          const haystack = [
            character.name,
            character.subtitle ?? "",
            character.creator ?? "",
            ...(character.tags ?? []),
            character.lorebook?.name ?? "",
          ]
            .map(normalizeText)
            .join(" ")
          return haystack.includes(term)
        })
      : characters
    return sortCharacters(filtered, lastActivityByCharacter, sort)
  }, [characters, lastActivityByCharacter, search, sort])

  const openConversation = (conversationId: string) => {
    location.href = `/conversations/${conversationId}`
  }

  const handleImageClick = async (character: CharacterSummary) => {
    const latest = latestConversationByCharacter.get(character.id)
    if (latest) {
      openConversation(latest.id)
      return
    }
    try {
      const conv = await createConversation({ characterId: character.id })
      if (conv.defaultProviderStatus === "unavailable") {
        toast.warning(t("characters.providerUnavailable"))
      }
      openConversation(conv.conversation.id)
    } catch (error) {
      toast.error(
        translateApiError(
          error,
          tRaw,
          t("characters.conversationCreateFailed"),
        ),
      )
    }
  }

  const handleCreateConversation = async (
    characterId: string,
    versionId: string,
  ) => {
    try {
      const conv = await createConversation({ characterId, versionId })
      if (conv.defaultProviderStatus === "unavailable") {
        toast.warning(t("characters.providerUnavailable"))
      }
      openConversation(conv.conversation.id)
    } catch (error) {
      const message = translateApiError(
        error,
        tRaw,
        t("characters.conversationCreateFailed"),
      )
      toast.error(message)
      if (error instanceof ApiClientError && error.status === 409) {
        const latest = latestConversationByCharacter.get(characterId)
        if (latest) {
          openConversation(latest.id)
        }
      }
    }
  }

  const handleEdit = (characterId: string) => {
    location.href = `/characters/${characterId}`
  }

  const handleDelete = async (characterId: string) => {
    try {
      await deleteCharacter(characterId)
      toast.success(t("characters.deleted"))
      await refresh()
    } catch {
      toast.error(t("characters.deleteFailed"))
    }
  }

  const handleImportPayload = async (
    payload: CharacterExport,
  ): Promise<ImportCharacterResult> => {
    try {
      const imported = await importCharacter(payload)
      toast.success(t("characters.imported", { name: imported.name }))
      await refresh()
      return { ok: true }
    } catch (error) {
      return {
        ok: false,
        error: translateApiError(error, tRaw, t("characters.importFailed")),
      }
    }
  }

  const handleImportFile = async (file: File) => {
    const parsed = parseCharacterExport(await file.text(), locale)
    if (!parsed.ok) {
      toast.error(parsed.error)
      return
    }
    const result = await handleImportPayload(parsed.payload)
    if (!result.ok) {
      toast.error(result.error ?? t("characters.importFailed"))
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Spinner aria-label={t("common.loading")} />
      </div>
    )
  }

  if (error) {
    return (
      <LoadErrorState
        message={translateApiError(error, tRaw, t("characters.loadFailed"))}
        onRetry={() => void refresh()}
      />
    )
  }

  return (
    <>
      <CharacterDropOverlay onFile={handleImportFile}>
        <div className="rm-content">
          <header className="rm-page-head">
            <div>
              <h1>{t("characters.title")}</h1>
              <p className="lede">{t("characters.lede")}</p>
            </div>
            <div className="rm-page-actions">
              <button
                type="button"
                className="rm-btn rm-btn--ghost"
                onClick={() => setImportOpen(true)}
              >
                <UploadIcon className="size-4" />
                {t("characters.import")}
              </button>
              <button
                type="button"
                className="rm-btn rm-btn--ghost"
                onClick={() => setCardImportOpen(true)}
              >
                <FileJsonIcon className="size-4" />
                {t("characters.sillytavern.importTitle")}
              </button>
              <button
                type="button"
                className="rm-btn"
                onClick={() => setCreateOpen(true)}
              >
                <PlusIcon className="size-4" />
                {t("characters.create")}
              </button>
            </div>
          </header>

          {characters.length === 0 ? (
            <div className="rm-empty">
              <MascotPose pose="hello" className="h-32 w-32" />
              <h2>{t("characters.emptyTitle")}</h2>
              <p>{t("characters.emptyDescription")}</p>
              <a className="rm-btn" href="/characters/new">
                <PlusIcon className="size-4" />
                {t("characters.create")}
              </a>
            </div>
          ) : (
            <>
              <CharacterListToolbar
                search={search}
                onSearchChange={setSearch}
                sort={sort}
                onSortChange={setSort}
                resultCount={visibleCharacters.length}
                totalCount={characters.length}
              />
              {visibleCharacters.length === 0 ? (
                <div className="rm-empty">
                  <MascotPose pose="thinking" className="h-20 w-20" />
                  <p>{t("characters.noResults", { term: search.trim() })}</p>
                </div>
              ) : (
                <div className="rm-character-grid">
                  {visibleCharacters.map((c) => (
                    <CharacterCard
                      key={c.id}
                      character={c}
                      conversations={conversationsByCharacter.get(c.id) ?? []}
                      lastActivityAt={lastActivityByCharacter.get(c.id) ?? null}
                      getVersions={loadVersions}
                      onImageClick={handleImageClick}
                      onOpenConversation={openConversation}
                      onCreateConversation={handleCreateConversation}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                    />
                  ))}
                  <a href="/characters/new" className="rm-add-card">
                    <PlusIcon className="size-7" />
                    {t("characters.create")}
                  </a>
                </div>
              )}
              {hasMore ? (
                <div className="flex flex-col items-center gap-2" style={{ marginTop: "1.25rem" }}>
                  <button
                    type="button"
                    className="rm-btn rm-btn--ghost"
                    onClick={() => void loadMore()}
                    disabled={loadingMore}
                  >
                    {loadingMore ? (
                      <Spinner aria-hidden />
                    ) : (
                      <ChevronDownIcon className="size-4" />
                    )}
                    {loadingMore
                      ? t("characters.loadingMore")
                      : t("characters.loadMore")}
                  </button>
                  {loadMoreError ? (
                    <p role="alert" className="text-sm text-destructive">
                      {translateApiError(
                        loadMoreError,
                        tRaw,
                        t("characters.loadMoreFailed"),
                      )}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </>
          )}
        </div>
      </CharacterDropOverlay>
      <ImportCharacterDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onImport={handleImportPayload}
      />
      <SillyTavernImportDialog
        open={cardImportOpen}
        onOpenChange={setCardImportOpen}
        onImported={() => {
          void refresh()
        }}
      />
      <CreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        locale={locale}
        onImportCard={() => {
          setCreateOpen(false)
          setCardImportOpen(true)
        }}
      />
    </>
  )
}
