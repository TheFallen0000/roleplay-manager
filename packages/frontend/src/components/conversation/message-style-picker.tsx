import type {
  ConversationDetail,
  MessageStyle,
} from "@workspace/shared/types/conversation"

import { useTranslation } from "@/lib/hooks/use-translation"
import { useAppearanceUpdate } from "./use-appearance-update"

const STYLE_OPTIONS: {
  value: MessageStyle
  labelKey:
    | "settings.messageStyleBubble"
    | "settings.messageStyleDocument"
    | "settings.messageStyleNovel"
  hintKey:
    | "settings.messageStyleBubbleHint"
    | "settings.messageStyleDocumentHint"
    | "settings.messageStyleNovelHint"
}[] = [
  {
    value: "bubble",
    labelKey: "settings.messageStyleBubble",
    hintKey: "settings.messageStyleBubbleHint",
  },
  {
    value: "document",
    labelKey: "settings.messageStyleDocument",
    hintKey: "settings.messageStyleDocumentHint",
  },
  {
    value: "novel",
    labelKey: "settings.messageStyleNovel",
    hintKey: "settings.messageStyleNovelHint",
  },
]

export function MessageStylePicker({
  conversationId,
  value,
  onSettingsChanged,
}: {
  conversationId: string
  value: MessageStyle
  onSettingsChanged: (updated: ConversationDetail) => void
}) {
  const { t } = useTranslation()
  const { saving, updateAppearance } = useAppearanceUpdate(
    conversationId,
    onSettingsChanged,
  )

  return (
    <div
      role="radiogroup"
      aria-label={t("settings.messageStyle")}
      className="grid gap-2 sm:grid-cols-3"
    >
      {STYLE_OPTIONS.map((option) => {
        const active = value === option.value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={saving}
            onClick={() => {
              if (!active) updateAppearance({ messageStyle: option.value })
            }}
            className="grid gap-1 rounded-xl border border-border bg-card p-3 text-left transition-colors hover:border-primary/40 disabled:opacity-60 aria-checked:border-primary/50 aria-checked:bg-primary-soft"
          >
            <span className="text-sm font-semibold">{t(option.labelKey)}</span>
            <span className="text-xs text-muted-foreground">
              {t(option.hintKey)}
            </span>
          </button>
        )
      })}
    </div>
  )
}
