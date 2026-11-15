import { BookOpenIcon } from "lucide-react"

import type { LorebookSummaryDTO } from "@workspace/shared/types/lorebook"

import { useTranslation } from "@/lib/hooks/use-translation"

export function LorebookCard({ lorebook }: { lorebook: LorebookSummaryDTO }) {
  const { t } = useTranslation()
  const usage = lorebook.usageCount ?? 0

  return (
    <a href={`/lorebooks/${lorebook.id}`} className="rm-book-card">
      <span className="spine" aria-hidden="true" />
      <div className="rm-book-card-body">
        <div className="top">
          <h2>{lorebook.name ?? t("common.untitled")}</h2>
          <span className="rm-chip rm-chip--violet">
            v{lorebook.currentVersionNumber ?? 1}
          </span>
        </div>
        <p className="desc">
          {lorebook.description || t("lorebooks.cardFallbackDescription")}
        </p>
        <div className="meta">
          <span>{t("lorebooks.entryCount", { count: lorebook.entryCount })}</span>
          <span>
            {usage > 0
              ? t("lorebooks.usageCount", { count: usage })
              : t("lorebooks.usageUnused")}
          </span>
          <span>{lorebook.updatedAt?.slice(0, 10) ?? ""}</span>
        </div>
        <span className="linked">
          <BookOpenIcon className="size-3.5" />
          {usage > 0
            ? t("lorebooks.inUse")
            : t("lorebooks.notLinked")}
        </span>
      </div>
    </a>
  )
}
