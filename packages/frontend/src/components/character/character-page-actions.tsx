import { useState } from "react"
import {
  DownloadIcon,
  FileDownIcon,
  FileJsonIcon,
  MessageSquarePlusIcon,
  Trash2Icon,
} from "lucide-react"
import { toast } from "@workspace/ui/components/sonner"

import type { CharacterSummary } from "@workspace/shared/types/character"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"

import { createConversation } from "@/lib/api/conversations"
import { deleteCharacter } from "@/lib/api/characters"
import { translateApiError } from "@/lib/translate-api-error"
import { useTranslation } from "@/lib/hooks/use-translation"

import { CardInspectorDialog } from "./card-inspector-dialog"
import { ExportDialog } from "./export-dialog"
import { SillyTavernExportDialog } from "./sillytavern-export-dialog"
import type { CharacterPageState } from "./use-character-page"

export function CharacterPageActions({ state }: { state: CharacterPageState }) {
  const { t, tRaw } = useTranslation()
  const { character } = state
  const [exportOpen, setExportOpen] = useState(false)
  const [cardExportOpen, setCardExportOpen] = useState(false)
  const [inspectorOpen, setInspectorOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [starting, setStarting] = useState(false)

  if (!character) return null
  const summary: CharacterSummary = {
    id: character.id,
    name: character.name,
    subtitle: character.currentVersion.subtitle,
    profileImageAssetId: character.currentVersion.profileImageAssetId,
    profileImageDimensions: null,
    profileImageMimeType: null,
    versionNumber: character.currentVersion.versionNumber,
    tags: character.currentVersion.tags,
    creator: character.currentVersion.creator,
    lorebook: character.currentVersion.lorebookVersion,
    createdAt: character.createdAt,
    updatedAt: character.updatedAt,
  }

  const startConversation = async () => {
    setStarting(true)
    try {
      const result = await createConversation({
        characterId: character.id,
        versionId: character.currentVersion.id,
      })
      if (result.defaultProviderStatus === "unavailable") {
        toast.warning(t("characters.providerUnavailable"))
      }
      window.location.assign(`/conversations/${result.conversation.id}`)
    } catch (error) {
      toast.error(
        translateApiError(
          error,
          tRaw,
          t("characters.conversationCreateFailed"),
        ),
      )
    } finally {
      setStarting(false)
    }
  }

  const remove = async () => {
    try {
      await deleteCharacter(character.id)
      toast.success(t("characters.deleted"))
      window.location.assign("/")
    } catch (error) {
      toast.error(translateApiError(error, tRaw, t("characters.deleteFailed")))
    }
  }

  return (
    <>
      <button
        type="button"
        className="rm-btn"
        onClick={() => void startConversation()}
        disabled={starting}
      >
        <MessageSquarePlusIcon className="size-4" />
        {t("characters.newConversation")}
      </button>

      <DropdownMenu>
        <DropdownMenuTrigger render={<button type="button" className="rm-btn rm-btn--ghost" />}>
          <DownloadIcon className="size-4" />
          {t("characters.exportAction")}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-48">
          <DropdownMenuItem onClick={() => setExportOpen(true)}>
            <DownloadIcon className="size-4" />
            {t("characters.export")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setCardExportOpen(true)}>
            <FileDownIcon className="size-4" />
            {t("characters.sillytavern.exportTitle")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <button
        type="button"
        className="rm-btn rm-btn--ghost"
        onClick={() => setInspectorOpen(true)}
      >
        <FileJsonIcon className="size-4" />
        {t("characters.cardInspect")}
      </button>

      <button
        type="button"
        className="rm-btn rm-btn--danger"
        onClick={() => setDeleteOpen(true)}
      >
        <Trash2Icon className="size-4" />
        {t("characters.delete")}
      </button>

      <ExportDialog
        character={summary}
        conversationCount={0}
        open={exportOpen}
        onOpenChange={setExportOpen}
      />
      <SillyTavernExportDialog
        character={summary}
        open={cardExportOpen}
        onOpenChange={setCardExportOpen}
      />
      <CardInspectorDialog
        characterId={character.id}
        open={inspectorOpen}
        onOpenChange={setInspectorOpen}
      />

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogTitle>{t("characters.deleteTitle")}</DialogTitle>
          <DialogDescription>
            {t("characters.deleteDescription", { name: character.name })}
          </DialogDescription>
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              className="rm-btn rm-btn--ghost"
              onClick={() => setDeleteOpen(false)}
            >
              {t("common.cancel")}
            </button>
            <button
              type="button"
              className="rm-btn rm-btn--danger"
              onClick={() => void remove()}
            >
              {t("common.delete")}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
