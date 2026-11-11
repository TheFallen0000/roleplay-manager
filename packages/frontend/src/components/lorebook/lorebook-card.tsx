import { BookOpenIcon } from "lucide-react"

import type { LorebookSummaryDTO } from "@workspace/shared/types/lorebook"

import { useTranslation } from "@/lib/hooks/use-translation"

export function LorebookCard({ lorebook }: { lorebook: LorebookSummaryDTO }) {
  const { t } = useTranslation()
  const usage = lorebook.usageCount ?? 0

  return (
    <a
      href={`/lorebooks/${lorebook.id}`}
      className="flex flex-col gap-3 rounded-2xl border bg-card p-4 transition-colors hover:border-primary/40"
    >
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <BookOpenIcon className="size-5" />
        </span>
        <div className="min-w-0">
          <h2 className="truncate font-heading text-base font-semibold">
            {lorebook.name ?? t("common.untitled")}
          </h2>
          <p className="text-xs text-muted-foreground">
            {lorebook.currentVersionNumber
              ? t("lorebooks.versionNumber", {
                  number: lorebook.currentVersionNumber,
                })
              : t("lorebooks.currentVersion")}
          </p>
        </div>
      </div>

      <dl className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <dt className="sr-only">{t("lorebooks.entries")}</dt>
          <dd>{t("lorebooks.entryCount", { count: lorebook.entryCount })}</dd>
        </div>
        <div className="flex items-center gap-1">
          <dt className="sr-only">{t("lorebooks.title")}</dt>
          <dd>
            {usage > 0
              ? t("lorebooks.usageCount", { count: usage })
              : t("lorebooks.usageUnused")}
          </dd>
        </div>
      </dl>
    </a>
  )
}
