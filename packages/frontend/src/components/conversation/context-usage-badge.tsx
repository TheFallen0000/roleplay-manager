import type { PromptContextMetadataDTO } from "@workspace/shared/types/context"
import { Badge } from "@workspace/ui/components/badge"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip"
import { cn } from "@workspace/ui/lib/utils"

import { formatTokenCount } from "@/lib/format-token-count"
import { useTranslation } from "@/lib/hooks/use-translation"

interface ContextUsageBadgeProps {
  metadata: PromptContextMetadataDTO
  /** Tokens of the unsent draft, added to the live estimate. */
  draftTokens: number
}

export function ContextUsageBadge({
  metadata,
  draftTokens,
}: ContextUsageBadgeProps) {
  const { t, locale } = useTranslation()
  const window = metadata.contextWindow
  const used = metadata.inputTokens + draftTokens + metadata.outputReserve
  const percent = window ? Math.round((used / window) * 100) : null
  const threshold = metadata.compactionThreshold ?? 80
  const format = (value: number) => formatTokenCount(value, locale)

  const label = percent === null ? `~${format(used)}` : `${percent}%`
  const ariaLabel =
    percent === null || window === null
      ? t("chat.contextUsageBadgeAriaUnknown", { used: format(used) })
      : t("chat.contextUsageBadgeAria", {
          used: format(used),
          window: format(window),
          percent,
        })

  const variant =
    percent === null
      ? "outline"
      : percent >= 100
        ? "destructive"
        : percent >= threshold
          ? "outline"
          : "secondary"

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Badge
            variant={variant}
            tabIndex={0}
            aria-label={ariaLabel}
            className={cn(
              "cursor-default tabular-nums",
              percent !== null &&
                percent >= threshold &&
                percent < 100 &&
                "border-amber-500/60 text-amber-700 dark:text-amber-400",
            )}
          >
            {label}
          </Badge>
        }
      />
      <TooltipContent side="bottom" className="max-w-xs">
        <div className="flex flex-col gap-1 text-left">
          {percent === null || window === null ? (
            <>
              <span className="font-medium">
                {t("chat.contextUsageUnknown")}
              </span>
              <span>
                {t("chat.contextUsageUsed", { used: format(used) })}
              </span>
              <span className="text-background/70">
                {t("chat.contextUsageNoWindow")}
              </span>
            </>
          ) : (
            <span className="font-medium">
              {t("chat.contextUsageBreakdown", {
                used: format(used),
                window: format(window),
                percent,
              })}
            </span>
          )}
          {metadata.outputReserve > 0 ? (
            <span className="text-background/70">
              {t("chat.contextUsageReserve", {
                count: format(metadata.outputReserve),
              })}
            </span>
          ) : null}
          {draftTokens > 0 ? (
            <span className="text-background/70">
              {t("chat.contextUsageDraft", { count: format(draftTokens) })}
            </span>
          ) : null}
          {percent !== null && percent >= threshold ? (
            <span className="text-background/70">
              {t("chat.contextUsageWarning")}
            </span>
          ) : null}
          <span className="text-background/60">
            {t("chat.contextUsageEstimated")}
          </span>
        </div>
      </TooltipContent>
    </Tooltip>
  )
}
