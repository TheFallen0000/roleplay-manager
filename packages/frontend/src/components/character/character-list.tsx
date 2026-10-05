import { useMemo, useState } from "react"
import { PlusIcon, SearchXIcon, UploadIcon, UsersIcon } from "lucide-react"

import type { CharacterSummary } from "@workspace/shared/types/character"
import type { CharacterExport } from "@workspace/shared/types/export"
import { Button } from "@workspace/ui/components/button"
import { Spinner } from "@workspace/ui/components/spinner"
import { toast } from "@workspace/ui/components/sonner"
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
  EmptyMedia,
} from "@workspace/ui/components/empty"

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
import { CharacterCard } from "./character-card"
import { CharacterDropOverlay } from "./character-drop-overlay"
import { CharacterListToolbar } from "./character-list-toolbar"
import {
  ImportCharacterDialog,
  type ImportCharacterResult,
} from "./import-character-dialog"
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
    loading,
    refresh,
    loadVersions,
  } = useCharacterList()

  const { t, tRaw } = useTranslation()

  const [importOpen, setImportOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [sort, setSort] = useState<CharacterSortKey>(DEFAULT_CHARACTER_SORT)

  const visibleCharacters = useMemo(() => {
    const term = normalizeText(search)
    const filtered = term
      ? characters.filter(
          (character) =>
            normalizeText(character.name).includes(term) ||
            normalizeText(character.subtitle ?? "").includes(term),
        )
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
    const parsed = parseCharacterExport(await file.text())
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
        <Spinner />
      </div>
    )
  }

  return (
    <>
      <CharacterDropOverlay onFile={handleImportFile}>
        <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{t("characters.title")}</h1>
          <p className="text-muted-foreground text-sm">
            {t("characters.count", { count: characters.length })}
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button variant="outline" onClick={() => setImportOpen(true)}>
            <UploadIcon />
            {t("characters.import")}
          </Button>
          <Button render={<a href="/characters/new" />} nativeButton={false}>
            <PlusIcon />
            {t("characters.create")}
          </Button>
        </div>
      </header>

      {characters.length === 0 ? (
        <Empty>
          <EmptyMedia variant="icon">
            <UsersIcon />
          </EmptyMedia>
          <EmptyHeader>
            <EmptyTitle>{t("characters.emptyTitle")}</EmptyTitle>
            <EmptyDescription>
              {t("characters.emptyDescription")}
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button render={<a href="/characters/new" />} nativeButton={false}>
              <PlusIcon />
              {t("characters.create")}
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <>
          <CharacterListToolbar
            search={search}
            onSearchChange={setSearch}
            sort={sort}
            onSortChange={setSort}
            resultCount={visibleCharacters.length}
          />
          {visibleCharacters.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed p-12 text-center">
              <SearchXIcon className="text-muted-foreground size-8" />
              <p className="text-muted-foreground text-sm">
                {t("characters.noResults", { term: search.trim() })}
              </p>
            </div>
          ) : (
            <div className="columns-1 gap-4 sm:columns-2 lg:columns-3">
              {visibleCharacters.map((c) => (
                <div key={c.id} className="mb-4 break-inside-avoid">
                  <CharacterCard
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
                </div>
              ))}
            </div>
          )}
        </>
      )}
        </div>
      </CharacterDropOverlay>
      <ImportCharacterDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onImport={handleImportPayload}
      />
    </>
  )
}
