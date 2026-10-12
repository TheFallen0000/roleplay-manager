import { useTranslation } from "@/lib/hooks/use-translation"
import type { TutorialEntry } from "@/lib/tutorials/catalog"

export interface TutorialCardProps {
  entry: TutorialEntry
  onOpen: () => void
}

export function TutorialCard({ entry, onOpen }: TutorialCardProps) {
  const { t } = useTranslation()
  const Icon = entry.icon

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex h-full flex-col gap-3 rounded-xl border bg-card p-4 text-left transition-[border-color,box-shadow,transform] duration-150 ease-out hover:-translate-y-px hover:border-primary/40 hover:shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      <span className="flex items-center gap-3">
        <span
          aria-hidden
          className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary"
        >
          <Icon className="size-5" />
        </span>
        <span className="font-medium">{entry.content.title}</span>
      </span>
      <span className="flex-1 text-sm text-muted-foreground">
        {entry.content.description}
      </span>
      <span className="text-xs text-muted-foreground tabular-nums">
        {t("tutorials.steps", { count: entry.content.steps.length })}
      </span>
    </button>
  )
}
