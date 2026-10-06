import { useState } from "react"

import type {
  CharacterSummary,
  CharacterVersionDTO,
} from "@workspace/shared/types/character"
import type { ConversationSummary } from "@workspace/shared/types/conversation"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@workspace/ui/components/context-menu"
import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import {
  ClockFading,
  DownloadIcon,
  MessageSquarePlusIcon,
  MessageSquareTextIcon,
  PencilIcon,
  Settings2Icon,
  Trash2Icon,
} from "lucide-react"
import { ExportDialog } from "./export-dialog"
import { ApplySettingsDialog } from "./apply-settings-dialog"
import { useTranslation } from "@/lib/hooks/use-translation"

interface CharacterContextMenuProps {
  character: CharacterSummary
  conversations: ConversationSummary[]
  getVersions: (characterId: string) => Promise<CharacterVersionDTO[]>
  onOpenConversation: (conversationId: string) => void
  onCreateConversation: (characterId: string, versionId: string) => void
  onEdit: (characterId: string) => void
  onDelete: (characterId: string) => void
  children: React.ReactNode
}

export function CharacterContextMenu({
  character,
  conversations,
  getVersions,
  onOpenConversation,
  onCreateConversation,
  onEdit,
  onDelete,
  children,
}: CharacterContextMenuProps) {
  const { t } = useTranslation()
  const [versions, setVersions] = useState<CharacterVersionDTO[] | null>(null)
  const [versionsLoading, setVersionsLoading] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [applySettingsOpen, setApplySettingsOpen] = useState(false)

  const handleVersionsOpenChange = (open: boolean) => {
    if (open && versions === null && !versionsLoading) {
      setVersionsLoading(true)
      getVersions(character.id)
        .then(setVersions)
        .finally(() => setVersionsLoading(false))
    }
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger render={<div className="contents" />}>
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent className="min-w-52">
        <ContextMenuGroup>
          <ContextMenuLabel>{character.name}</ContextMenuLabel>
        </ContextMenuGroup>
        <ContextMenuSeparator />
        <ContextMenuItem
          disabled={conversations.length === 0}
          onClick={() => {
            const latest = conversations[0]
            if (latest) {
              onOpenConversation(latest.id)
            }
          }}
        >
          <ClockFading className="size-4" />
          {t("characters.mostRecentConversation")}
        </ContextMenuItem>
        <ContextMenuSub onOpenChange={handleVersionsOpenChange}>
          <ContextMenuSubTrigger>
            <MessageSquarePlusIcon className="size-4" />
            {t("characters.newConversation")}
          </ContextMenuSubTrigger>
          <ContextMenuSubContent>
            {versionsLoading && versions === null ? (
              <ContextMenuItem disabled>
                {t("characters.loadingVersions")}
              </ContextMenuItem>
            ) : (
              (versions ?? []).map((v) => (
                <ContextMenuItem
                  key={v.id}
                  onClick={() => onCreateConversation(character.id, v.id)}
                >
                  v{v.versionNumber} ·{" "}
                  {new Date(v.createdAt).toLocaleDateString()}
                </ContextMenuItem>
              ))
            )}
          </ContextMenuSubContent>
        </ContextMenuSub>
        <ContextMenuSub>
          <ContextMenuSubTrigger disabled={conversations.length === 0}>
            <MessageSquareTextIcon className="size-4" />
            {t("characters.conversations")}
          </ContextMenuSubTrigger>
          <ContextMenuSubContent>
            {conversations.length === 0 ? (
              <ContextMenuItem disabled>
                {t("characters.noConversations")}
              </ContextMenuItem>
            ) : (
              conversations.map((conv) => (
                <ContextMenuItem
                  key={conv.id}
                  onClick={() => onOpenConversation(conv.id)}
                >
                  <span className="max-w-48 truncate">
                    {conv.title ?? t("common.untitled")}
                  </span>
                  <span className="text-muted-foreground text-xs">
                    {new Date(conv.lastActivityAt).toLocaleDateString()}
                  </span>
                </ContextMenuItem>
              ))
            )}
          </ContextMenuSubContent>
        </ContextMenuSub>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={() => onEdit(character.id)}>
          <PencilIcon className="size-4" />
          {t("characters.edit")}
        </ContextMenuItem>
        <ContextMenuItem onClick={() => setExportOpen(true)}>
          <DownloadIcon className="size-4" />
          {t("characters.export")}
        </ContextMenuItem>
        <ContextMenuItem onClick={() => setApplySettingsOpen(true)}>
          <Settings2Icon className="size-4" />
          {t("characters.applySettings")}
        </ContextMenuItem>
        <ContextMenuItem
          variant="destructive"
          onClick={() => setDeleteOpen(true)}
        >
          <Trash2Icon className="size-4" />
          {t("characters.delete")}
        </ContextMenuItem>
      </ContextMenuContent>

      <ExportDialog
        character={character}
        conversationCount={conversations.length}
        open={exportOpen}
        onOpenChange={setExportOpen}
      />

      <ApplySettingsDialog
        character={character}
        conversationCount={conversations.length}
        open={applySettingsOpen}
        onOpenChange={setApplySettingsOpen}
      />

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogTitle>{t("characters.deleteTitle")}</DialogTitle>
          <DialogDescription>
            {t("characters.deleteDescription", { name: character.name })}
          </DialogDescription>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setDeleteOpen(false)
                onDelete(character.id)
              }}
            >
              {t("common.delete")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </ContextMenu>
  )
}
