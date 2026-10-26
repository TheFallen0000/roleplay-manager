import { useState } from "react"
import type { ConversationDetail } from "@workspace/shared/types/conversation"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@workspace/ui/components/context-menu"
import { cn } from "@workspace/ui/lib/utils"
import { Pencil, RefreshCw, SettingsIcon } from "lucide-react"

import { getCharacterAssetUrl } from "@/lib/api/client"
import { setConversationTitle } from "@/lib/api/conversations"
import { useTranslation } from "@/lib/hooks/use-translation"
import { SettingsPanel } from "./settings-panel"

interface ChatHeaderProps {
  conversation: ConversationDetail
  /** Pending memory proposals, shown as a badge next to the title. */
  pendingCount: number
  /** Hidden while the fullscreen focus mode is active. */
  hidden: boolean
  onEnterFullscreen: () => void
  onConversationUpdated: (next: ConversationDetail) => void
  onError: (message: string) => void
}

export function ChatHeader({
  conversation,
  pendingCount,
  hidden,
  onEnterFullscreen,
  onConversationUpdated,
  onError,
}: ChatHeaderProps) {
  const { t } = useTranslation()
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleInput, setTitleInput] = useState("")

  const handleRegenerateTitle = async () => {
    try {
      const result = await setConversationTitle(conversation.id)
      onConversationUpdated({ ...conversation, title: result.title })
    } catch (err) {
      onError((err as Error).message)
    }
  }

  const handleManualTitle = async () => {
    if (!titleInput.trim()) return
    try {
      const result = await setConversationTitle(
        conversation.id,
        titleInput.trim(),
      )
      onConversationUpdated({ ...conversation, title: result.title })
      setEditingTitle(false)
    } catch (err) {
      onError((err as Error).message)
    }
  }

  return (
    <header
      className={cn(
        "flex items-center gap-3 border-b px-4 py-3",
        hidden && "hidden",
      )}
    >
      <a
        href={`/characters/${conversation.characterId}`}
        className="block size-8 overflow-hidden rounded-full bg-muted transition-shadow hover:ring-2 hover:ring-primary/50"
        aria-label={t("chat.goToCharacter", { name: conversation.characterName })}
      >
        {conversation.profileImageAssetId ? (
          <img
            src={getCharacterAssetUrl(
              conversation.characterId,
              conversation.profileImageAssetId,
              "thumbnail",
            )}
            width={32}
            height={32}
            decoding="async"
            alt={`${conversation.characterName} avatar`}
            className="size-full object-cover"
          />
        ) : null}
      </a>
      <div className="flex flex-col">
        {editingTitle ? (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              void handleManualTitle()
            }}
            className="flex items-center gap-1"
          >
            <Input
              value={titleInput}
              onChange={(e) => setTitleInput(e.target.value)}
              className="h-7 text-sm"
              autoFocus
              onBlur={() => setEditingTitle(false)}
            />
          </form>
        ) : (
          <ContextMenu>
            <ContextMenuTrigger>
              <h2 className="flex items-center gap-2 text-sm font-semibold">
                {conversation.title ?? conversation.characterName}
                {pendingCount > 0 && (
                  <Badge variant="destructive">{pendingCount}</Badge>
                )}
              </h2>
            </ContextMenuTrigger>
            <ContextMenuContent>
              <ContextMenuItem
                onClick={() => {
                  setTitleInput(conversation.title ?? "")
                  setEditingTitle(true)
                }}
              >
                <Pencil className="size-4" />
                {t("chat.titleEditManually")}
              </ContextMenuItem>
              <ContextMenuItem onClick={() => void handleRegenerateTitle()}>
                <RefreshCw className="size-4" />
                {t("chat.titleRegenerate")}
              </ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>
        )}
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          {conversation.characterName}
        </p>
      </div>
      <div className="ml-auto">
        <SettingsPanel
          conversationId={conversation.id}
          current={conversation}
          onSettingsChanged={onConversationUpdated}
          onTitleGenerated={(title, titleSource) =>
            onConversationUpdated({ ...conversation, title, titleSource })
          }
          onEnterFullscreen={onEnterFullscreen}
        >
          <Button
            variant="ghost"
            size="icon"
            data-icon="inline-start"
            aria-label={t("chat.settings")}
          >
            <SettingsIcon className="size-4" />
          </Button>
        </SettingsPanel>
      </div>
    </header>
  )
}
