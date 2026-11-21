import { useState } from "react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"

import { useTranslation } from "@/lib/hooks/use-translation"

export interface AlternateGreetingPickerProps {
  open: boolean
  greeting: string
  alternateGreetings: string[]
  onOpenChange: (open: boolean) => void
  onConfirm: (greetingIndex: number) => void
}

interface GreetingOption {
  index: number
  label: string
  text: string
}

export function AlternateGreetingPicker({
  open,
  greeting,
  alternateGreetings,
  onOpenChange,
  onConfirm,
}: AlternateGreetingPickerProps) {
  const { t, tRaw } = useTranslation()
  const [selectedIndex, setSelectedIndex] = useState(0)

  const handleOpenChange = (next: boolean) => {
    if (!next) setSelectedIndex(0)
    onOpenChange(next)
  }

  if (alternateGreetings.length === 0) return null

  const title = tRaw(
    "characters.greetingPickerTitle",
    t("characters.newConversation"),
  )
  const firstMesLabel = tRaw(
    "characters.greetingPickerFirstMes",
    t("characters.fieldGreeting"),
  )
  const alternateLabel = tRaw(
    "characters.greetingPickerAlternate",
    t("characters.alternateGreetingsLabel"),
  )
  const confirmLabel = tRaw(
    "characters.greetingPickerConfirm",
    t("characters.startConversation"),
  )

  const options: GreetingOption[] = [
    { index: 0, label: firstMesLabel, text: greeting },
    ...alternateGreetings.map((text, position) => ({
      index: position + 1,
      label: alternateLabel,
      text,
    })),
  ]

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{alternateLabel}</DialogDescription>
        </DialogHeader>

        <div
          role="radiogroup"
          aria-label={title}
          className="flex max-h-[60vh] flex-col gap-2 overflow-y-auto pr-1"
        >
          {options.map((option) => {
            const active = selectedIndex === option.index
            return (
              <button
                key={option.index}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setSelectedIndex(option.index)}
                className="grid gap-1 rounded-xl border border-border bg-card p-3 text-left transition-colors hover:border-primary/40 aria-checked:border-primary/50 aria-checked:bg-primary-soft"
              >
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {option.label}
                </span>
                <span className="line-clamp-2 text-sm whitespace-pre-wrap">
                  {option.text}
                </span>
              </button>
            )
          })}
        </div>

        <DialogFooter>
          <button
            type="button"
            className="rm-btn rm-btn--ghost"
            onClick={() => handleOpenChange(false)}
          >
            {t("common.cancel")}
          </button>
          <button
            type="button"
            className="rm-btn"
            onClick={() => {
              onConfirm(selectedIndex)
              handleOpenChange(false)
            }}
          >
            {confirmLabel}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
