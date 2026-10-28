import type { PromptContextMetadataDTO } from "@workspace/shared/types/context"
import { Badge } from "@workspace/ui/components/badge"
import { cn } from "@workspace/ui/lib/utils"

import { formatTokenCount } from "@/lib/format-token-count"
import { useTranslation } from "@/lib/hooks/use-translation"

export function ContextTokenBreakdown({
  metadata,
}: {
  metadata: PromptContextMetadataDTO
}) {
  const { t, locale } = useTranslation()
  const window = metadata.contextWindow
  const percent = window
    ? Math.round((metadata.totalTokens / window) * 100)
    : null
  const format = (value: number) => formatTokenCount(value, locale)

  const rows = [
    { label: t("chat.previewTokensSystem"), value: metadata.systemTokens },
    { label: t("chat.previewTokensMessages"), value: metadata.messageTokens },
    { label: t("chat.previewTokensOutput"), value: metadata.outputReserve },
    { label: t("chat.previewTokensTotal"), value: metadata.totalTokens },
  ]

  return (
    <div className="rounded-md border bg-muted/30 p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-muted-foreground">
          {t("chat.previewTokensTitle")}
        </span>
        <Badge
          variant={
            percent === null
              ? "outline"
              : percent >= 100
                ? "destructive"
                : percent >= 80
                  ? "outline"
                  : "secondary"
          }
          className={cn(
            "tabular-nums",
            percent !== null &&
              percent >= 80 &&
              percent < 100 &&
              "border-amber-500/60 text-amber-700 dark:text-amber-400",
          )}
        >
          {percent === null ? "—" : `${percent}%`}
        </Badge>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
        {rows.map((row) => (
          <div key={row.label} className="flex flex-col">
            <span className="text-muted-foreground">{row.label}</span>
            <span className="font-medium tabular-nums">{format(row.value)}</span>
          </div>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">
        {window && percent !== null
          ? t("chat.previewTokensOfWindow", {
              used: format(metadata.totalTokens),
              window: format(window),
              percent,
            })
          : t("chat.previewTokensNoWindow", {
              used: format(metadata.totalTokens),
            })}
      </p>
      <p className="text-[11px] text-muted-foreground/70">
        {t("chat.previewTokensEstimated")}
      </p>
    </div>
  )
}
