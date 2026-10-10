import type {
  ConversationDetail,
  ConversationSettingsUpdate,
} from "@workspace/shared/types/conversation"

import { DIALOGUE_COLORS } from "@/lib/dialogue-colors"
import { useTranslation } from "@/lib/hooks/use-translation"
import { useAppearanceUpdate } from "./use-appearance-update"

export function DialogueColorPicker({
  conversationId,
  field,
  label,
  value,
  onSettingsChanged,
}: {
  conversationId: string
  field: "characterDialogueColor" | "userDialogueColor"
  label: string
  value: string | null
  onSettingsChanged: (updated: ConversationDetail) => void
}) {
  const { t } = useTranslation()
  const { saving, updateAppearance } = useAppearanceUpdate(
    conversationId,
    onSettingsChanged,
  )

  const pick = (color: string | null) => {
    if (color === value) return
    updateAppearance({ [field]: color } as ConversationSettingsUpdate)
  }

  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm">{label}</span>
      <div className="flex items-center gap-1.5" role="radiogroup" aria-label={label}>
        <button
          type="button"
          role="radio"
          aria-checked={value === null}
          disabled={saving}
          onClick={() => pick(null)}
          className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 aria-checked:border-primary/60 aria-checked:bg-primary-soft aria-checked:text-primary"
        >
          {t("settings.dialogueColorDefault")}
        </button>
        {DIALOGUE_COLORS.map((color) => (
          <button
            key={color.value}
            type="button"
            role="radio"
            aria-checked={value === color.value}
            aria-label={t(color.labelKey)}
            disabled={saving}
            onClick={() => pick(color.value)}
            style={{ backgroundColor: color.value }}
            className="size-5 rounded-full ring-1 ring-foreground/20 transition-transform hover:scale-110 aria-checked:ring-2 aria-checked:ring-primary"
          />
        ))}
      </div>
    </div>
  )
}
