import type { ConversationDetail } from "@workspace/shared/types/conversation"
import type { MessageDTO } from "@workspace/shared/types/message"
import { MessageScrollerItem } from "@workspace/ui/components/message-scroller"

import { useChatStore } from "../../lib/stores/chat.store"
import { MessageBubble } from "./message"

/**
 * The streaming bubble subscribes to its own slice of the store: a token only
 * re-renders this component instead of the whole chat and every message.
 */
export function StreamingBubble({
  messageStyle,
  characterName,
  scrollAnchor,
}: {
  messageStyle: ConversationDetail["messageStyle"]
  characterName: string
  scrollAnchor?: boolean
}) {
  const isStreaming = useChatStore((s) => s.isStreaming)
  const streamingContent = useChatStore((s) => s.streamingContent)
  const regeneratingMessageId = useChatStore((s) => s.regeneratingMessageId)

  if (!isStreaming || regeneratingMessageId) return null

  return (
    <MessageScrollerItem
      className="rm-message-enter"
      key={streamingContent ? "streaming" : "typing"}
      scrollAnchor={scrollAnchor}
    >
      {streamingContent ? (
        <MessageBubble
          message={{
            id: "streaming",
            role: "assistant",
            content: streamingContent,
            position: 0,
            createdAt: "",
            alternatives: [],
            alternativesCursor: 0,
          }}
          isStreaming
          messageStyle={messageStyle}
          characterName={characterName}
        />
      ) : (
        <MessageBubble
          message={{
            id: "typing",
            role: "assistant",
            content: "",
            position: 0,
            createdAt: "",
            alternatives: [],
            alternativesCursor: 0,
          }}
          messageStyle={messageStyle}
          characterName={characterName}
        />
      )}
    </MessageScrollerItem>
  )
}

/** Regeneration writes into the existing bubble, so only that bubble updates. */
export function RegeneratingBubble({
  message,
  messageStyle,
  characterName,
  scrollAnchor,
}: {
  message: MessageDTO
  messageStyle: ConversationDetail["messageStyle"]
  characterName: string
  scrollAnchor?: boolean
}) {
  const streamingContent = useChatStore((s) => s.streamingContent)

  return (
    <MessageScrollerItem
      className="rm-message-enter"
      scrollAnchor={scrollAnchor}
    >
      {streamingContent ? (
        <MessageBubble
          message={{ ...message, content: streamingContent }}
          isStreaming
          messageStyle={messageStyle}
          characterName={characterName}
        />
      ) : (
        <MessageBubble
          message={{ ...message, content: "" }}
          messageStyle={messageStyle}
          characterName={characterName}
        />
      )}
    </MessageScrollerItem>
  )
}
