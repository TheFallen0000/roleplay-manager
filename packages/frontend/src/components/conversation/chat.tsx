import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react"
import type { ConversationDetail } from "@workspace/shared/types/conversation"
import type { PromptContextDTO } from "@workspace/shared/types/context"
import {
  MessageScrollerProvider,
  MessageScroller,
  MessageScrollerViewport,
  MessageScrollerContent,
  MessageScrollerItem,
  useMessageScroller,
} from "@workspace/ui/components/message-scroller"
import { Button } from "@workspace/ui/components/button"
import { Minimize2 } from "lucide-react"

import { useChatStore } from "../../lib/stores/chat.store"
import {
  editMessage,
  deleteMessage,
  rewindConversation,
  cycleAlternative,
  branchConversation,
} from "../../lib/api/conversations"
import { useChatStreaming } from "./use-chat-streaming"
import { getCharacterAssetUrl } from "../../lib/api/client"
import { getPromptContext } from "../../lib/api/context"
import { createAssetSrcSet } from "@/lib/asset-srcset"
import { cn } from "@workspace/ui/lib/utils"
import { MessageBubble } from "./message"
import { MessageInput } from "./message-input"
import { ContextPreviewDialog } from "./context-preview-dialog"
import { ChatConfirmDialogs } from "./chat-confirm-dialogs"
import { ChatHeader } from "./chat-header"
import { useMemoryStore } from "@/lib/stores/memory.store"
import { useSummaryStore } from "@/lib/stores/summary.store"
import { useTranslation } from "@/lib/hooks/use-translation"
import { I18nProvider } from "@/lib/hooks/i18n-provider"
import type { Locale } from "@workspace/shared/i18n"
import { MascotPose } from "../layout/brand"
import { useFullscreenFocus } from "./use-fullscreen-focus"

/**
 * The scroller's raw end includes the primitive's trailing spacer, so parking
 * it there would leave the last message well above the composer (PM.33).
 * Align the last message's end with the viewport once it changes.
 */
function AnchorChatToEnd({ lastMessageId }: { lastMessageId: string | null }) {
  const { scrollToEnd } = useMessageScroller()

  useEffect(() => {
    if (!lastMessageId) return
    const frame = requestAnimationFrame(() => {
      scrollToEnd({ align: "end", behavior: "instant" })
    })
    return () => cancelAnimationFrame(frame)
  }, [lastMessageId, scrollToEnd])

  return null
}

export function Chat({
  conversation,
  locale,
}: {
  conversation: ConversationDetail
  locale: Locale
}) {
  return (
    <I18nProvider initialLocale={locale}>
      <ChatContent conversation={conversation} />
    </I18nProvider>
  )
}

function ChatContent({ conversation }: { conversation: ConversationDetail }) {
  const { t } = useTranslation()
  const [conv, setConv] = useState(conversation)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [confirmRewind, setConfirmRewind] = useState<string | null>(null)
  const [inputKey, setInputKey] = useState(0)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewContext, setPreviewContext] = useState<PromptContextDTO | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewContent, setPreviewContent] = useState<string | undefined>()
  const { fullscreen, enter: enterFullscreen, exit: exitFullscreen } =
    useFullscreenFocus()

  const {
    messages,
    isStreaming,
    streamingContent,
    error,
    editingMessageId,
    editingContent,
    regeneratingMessageId,
    setMessages,
    replaceMessage,
    removeMessage,
    startEditing,
    setEditingContent,
    cancelEditing,
    setError,
  } = useChatStore()

  const loadMemories = useMemoryStore((s) => s.loadMemories)
  const loadProposals = useMemoryStore((s) => s.loadProposals)
  const proposals = useMemoryStore((s) => s.proposals)
  const summaries = useSummaryStore((s) => s.summaries)
  const loadSummaries = useSummaryStore((s) => s.loadSummaries)
  const pendingCount = useMemo(
    () => proposals.filter(p => p.status === "pending").length,
    [proposals],
  )

  const affectedSummariesCount = useMemo(() => {
    if (!confirmRewind) return 0
    const targetMsg = messages.find((m) => m.id === confirmRewind)
    if (!targetMsg) return 0
    const deletedIds = new Set<string>()
    for (const m of messages) {
      if (m.position > targetMsg.position) {
        deletedIds.add(m.id)
      }
    }
    if (targetMsg.role === "user") {
      deletedIds.add(targetMsg.id)
    }
    return summaries.filter(
      (s) => deletedIds.has(s.firstMessageId) || deletedIds.has(s.lastMessageId),
    ).length
  }, [confirmRewind, messages, summaries])

  const initialized = useRef(false)

  useEffect(() => {
    if (!initialized.current) {
      setMessages(conv.messages)
      loadMemories(conv.id)
      loadProposals(conv.id)
      loadSummaries(conv.id)
      initialized.current = true
    }
  }, [conv, setMessages, loadMemories, loadProposals, loadSummaries])

  const { handleSend, handleContinue, handleRegenerate } = useChatStreaming(conv.id, {
    onDone: () => {
      loadMemories(conv.id)
      loadProposals(conv.id)
      loadSummaries(conv.id)
    },
    onTitleGenerated: (title) => {
      setConv((prev) => ({ ...prev, title }))
    },
    onSummaryGenerated: () => {
      loadSummaries(conv.id)
    },
  })

  const handleEdit = useCallback(
    async (messageId: string, content: string) => {
      try {
        const updated = await editMessage(conv.id, messageId, content)
        replaceMessage(messageId, updated)
        cancelEditing()
      } catch (err) {
        setError((err as Error).message)
      }
    },
    [conv.id, replaceMessage, cancelEditing, setError],
  )

  const handleDelete = useCallback(async () => {
    if (!confirmDelete) return
    try {
      await deleteMessage(conv.id, confirmDelete)
      removeMessage(confirmDelete)
      setConfirmDelete(null)
    } catch (err) {
      setError((err as Error).message)
    }
  }, [conv.id, confirmDelete, removeMessage, setError])

  const handleRewind = useCallback(async () => {
    if (!confirmRewind) return
    try {
      const targetMsg = messages.find(m => m.id === confirmRewind)
      const result = await rewindConversation(conv.id, confirmRewind)
      setMessages(result.messages)

      if (targetMsg?.role === "user") {
        localStorage.setItem(`chat:draft:${conv.id}`, JSON.stringify(targetMsg.content))
        setInputKey(k => k + 1)
      }

      loadSummaries(conv.id)
      setConfirmRewind(null)
    } catch (err) {
      setError((err as Error).message)
    }
  }, [conv.id, confirmRewind, messages, setMessages, setError, loadSummaries])

  const handleCyclePrev = useCallback(
    async (messageId: string) => {
      try {
        const updated = await cycleAlternative(conv.id, messageId, "prev")
        replaceMessage(messageId, updated)
      } catch (err) {
        setError((err as Error).message)
      }
    },
    [conv.id, replaceMessage, setError],
  )

  const handleCycleNext = useCallback(
    async (messageId: string) => {
      try {
        const updated = await cycleAlternative(conv.id, messageId, "next")
        replaceMessage(messageId, updated)
      } catch (err) {
        setError((err as Error).message)
      }
    },
    [conv.id, replaceMessage, setError],
  )

  const handleBranch = useCallback(
    async (messageId: string) => {
      try {
        const branch = await branchConversation(conv.id, messageId)
        location.href = `/conversations/${branch.id}`
      } catch (err) {
        setError((err as Error).message)
      }
    },
    [conv.id, setError],
  )

  const handlePreview = useCallback(
    async (content?: string) => {
      setPreviewContent(content)
      setPreviewLoading(true)
      setPreviewOpen(true)
      try {
        const ctx = await getPromptContext(conv.id, content)
        setPreviewContext(ctx)
      } catch (err) {
        setError((err as Error).message)
        setPreviewOpen(false)
      } finally {
        setPreviewLoading(false)
      }
    },
    [conv.id, setError],
  )

  const handleSendFromPreview = useCallback(() => {
    setPreviewOpen(false)
    if (previewContent !== undefined) {
      handleSend(previewContent)
    } else {
      handleContinue()
    }
  }, [previewContent, handleSend, handleContinue])

  return (
    <div
      data-fullscreen={fullscreen ? "true" : "false"}
      className={cn(
        "flex h-full flex-col",
        fullscreen && "fixed inset-0 z-50 bg-background",
      )}
    >
      {fullscreen ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={exitFullscreen}
          aria-label={t("chat.fullscreenExit")}
          className="absolute top-3 right-3 z-20 bg-background/60 opacity-70 backdrop-blur-sm transition-opacity hover:opacity-100 focus-visible:opacity-100"
        >
          <Minimize2 className="size-4" />
        </Button>
      ) : null}
      <ChatHeader
        conversation={conv}
        pendingCount={pendingCount}
        hidden={fullscreen}
        onEnterFullscreen={enterFullscreen}
        onConversationUpdated={setConv}
        onError={setError}
      />

      <MessageScrollerProvider autoScroll={isStreaming}>
        <AnchorChatToEnd
          lastMessageId={
            messages.length > 0 ? messages[messages.length - 1].id : null
          }
        />
        <MessageScroller
          className="flex-1 p-2"
          data-message-style={conv.messageStyle}
          style={
            {
              ...(conv.characterDialogueColor
                ? { "--rm-dialogue-char": conv.characterDialogueColor }
                : {}),
              ...(conv.userDialogueColor
                ? { "--rm-dialogue-user": conv.userDialogueColor }
                : {}),
            } as CSSProperties
          }
        >
          {conv.backgroundImageAssetId ? (
            <div aria-hidden className="pointer-events-none absolute inset-0">
              <img
                src={getCharacterAssetUrl(
                  conv.characterId,
                  conv.backgroundImageAssetId,
                  "medium",
                )}
                srcSet={
                  conv.backgroundImageDimensions
                    ? createAssetSrcSet(
                        conv.characterId,
                        conv.backgroundImageAssetId,
                        conv.backgroundImageDimensions.width,
                        "background",
                      )
                    : undefined
                }
                sizes="100vw"
                alt=""
                decoding="async"
                className={cn(
                  "size-full",
                  conv.backgroundFit === "contain"
                    ? "object-contain"
                    : "object-cover",
                )}
              />
              {conv.backgroundScrim > 0 ? (
                <div
                  className="absolute inset-0 bg-background"
                  style={{ opacity: conv.backgroundScrim / 100 }}
                />
              ) : null}
            </div>
          ) : null}
          <MessageScrollerViewport className="relative z-10">
            <MessageScrollerContent>
              {messages.length === 0 && !streamingContent ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-3 p-12 text-center">
                  <MascotPose pose="sparkle" className="h-28 w-28" />
                  <p className="text-sm text-muted-foreground">
                    {t("chat.noMessages")}
                  </p>
                </div>
              ) : (
                <>
                  {messages.map((msg, i) => {
                    if (msg.id === regeneratingMessageId) {
                      return (
                        <MessageScrollerItem className="rm-message-enter" key={msg.id} scrollAnchor={i === messages.length - 1}>
                          {streamingContent
                            ? <MessageBubble message={{ ...msg, content: streamingContent }} isStreaming messageStyle={conv.messageStyle} characterName={conv.characterName} />
                            : <MessageBubble message={{ ...msg, content: "" }} messageStyle={conv.messageStyle} characterName={conv.characterName} />}
                        </MessageScrollerItem>
                      )
                    }
                    return (
                      <MessageScrollerItem
                        className="rm-message-enter"
                        key={msg.id}
                        scrollAnchor={i === messages.length - 1 && !isStreaming}
                      >
                        <MessageBubble
                          message={msg}
                          messageStyle={conv.messageStyle}
                          characterName={conv.characterName}
                          isLastMessage={i === messages.length - 1 && !streamingContent}
                          isEditing={editingMessageId === msg.id}
                          editContent={editingMessageId === msg.id ? editingContent : undefined}
                          onEditContentChange={setEditingContent}
                          onStartEdit={(id, content) => startEditing(id, content)}
                          onCancelEdit={cancelEditing}
                          onSaveEdit={handleEdit}
                          onDelete={(id) => setConfirmDelete(id)}
                          onRegenerate={handleRegenerate}
                          onRewind={(id) => setConfirmRewind(id)}
                          onBranch={handleBranch}
                          onCyclePrev={handleCyclePrev}
                          onCycleNext={handleCycleNext}
                        />
                      </MessageScrollerItem>
                    )
                  })}
                  {isStreaming && !regeneratingMessageId && (
                    <MessageScrollerItem className="rm-message-enter" key={streamingContent ? "streaming" : "typing"} scrollAnchor>
                      {streamingContent
                        ? <MessageBubble message={{ id: "streaming", role: "assistant", content: streamingContent, position: 0, createdAt: "", alternatives: [], alternativesCursor: 0 }} isStreaming messageStyle={conv.messageStyle} characterName={conv.characterName} />
                        : <MessageBubble message={{ id: "typing", role: "assistant", content: "", position: 0, createdAt: "", alternatives: [], alternativesCursor: 0 }} messageStyle={conv.messageStyle} characterName={conv.characterName} />}
                    </MessageScrollerItem>
                  )}
                </>
              )}
              {error && (
                <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-2 text-sm text-destructive">
                  {error}
                </div>
              )}
            </MessageScrollerContent>
          </MessageScrollerViewport>
        </MessageScroller>
      </MessageScrollerProvider>

      <footer
        className={cn(
          "border-t",
          fullscreen && "border-transparent bg-background/80 backdrop-blur-md",
        )}
      >
        <MessageInput
          key={inputKey}
          onSend={handleSend}
          onContinue={handleContinue}
          onPreview={handlePreview}
          disabled={isStreaming}
          conversationId={conv.id}
        />
      </footer>

      <ChatConfirmDialogs
        confirmDelete={confirmDelete}
        confirmRewind={confirmRewind}
        affectedSummariesCount={affectedSummariesCount}
        onCloseDelete={() => setConfirmDelete(null)}
        onCloseRewind={() => setConfirmRewind(null)}
        onConfirmDelete={handleDelete}
        onConfirmRewind={handleRewind}
      />

      <ContextPreviewDialog
        open={previewOpen}
        onOpenChange={(open) => {
          if (!open) setPreviewOpen(false)
        }}
        context={previewContext}
        onSend={handleSendFromPreview}
        loading={previewLoading}
      />
    </div>
  )
}
