import { Button } from "@workspace/ui/components/button"

import type { ModelCapabilitiesResult } from "@workspace/shared/types/model-capabilities"

import { formatTokenCount } from "@/lib/format-token-count"
import { useTranslation } from "@/lib/hooks/use-translation"

export interface ModelCapabilitiesSuggestionProps {
  capabilities: ModelCapabilitiesResult | null
  loading: boolean
  typedContextWindow: number | null
  onApply: (workingWindow: number | null) => void
}

const humanize = (value: string): string =>
  value.replace(/-/g, " ").replace(/^./, (char) => char.toUpperCase())

export function ModelCapabilitiesSuggestion({
  capabilities,
  loading,
  typedContextWindow,
  onApply,
}: ModelCapabilitiesSuggestionProps) {
  const { t, locale } = useTranslation()

  if (loading) {
    return (
      <p className="text-xs text-muted-foreground">
        {t("settings.capabilitiesLoading")}
      </p>
    )
  }

  if (!capabilities) {
    return (
      <p className="text-xs text-muted-foreground">
        {t("settings.capabilitiesUnavailable")}
      </p>
    )
  }

  const { model, capabilities: resolved, workingWindow } = capabilities
  const resolvedWindow =
    resolved.contextWindow === null
      ? null
      : formatTokenCount(resolved.contextWindow, locale)
  const maxOutput =
    resolved.maxOutputTokens === null
      ? null
      : formatTokenCount(resolved.maxOutputTokens, locale)
  const safeWindow =
    workingWindow.workingWindow === null
      ? null
      : formatTokenCount(workingWindow.workingWindow, locale)
  const applicableWindow = workingWindow.workingWindow
  const canApply =
    workingWindow.status !== "unknown" &&
    workingWindow.status !== "infeasible" &&
    applicableWindow !== null &&
    applicableWindow > 0
  const typedDiffers =
    canApply &&
    typedContextWindow !== null &&
    typedContextWindow !== applicableWindow

  return (
    <div className="flex flex-col gap-1.5 rounded-md border p-2 text-xs">
      <p className="font-medium">{t("settings.capabilitiesTitle")}</p>
      <p>{model}</p>
      <p>
        {resolvedWindow === null
          ? t("settings.capabilitiesWindowUnknown")
          : t("settings.capabilitiesResolvedWindow", {
              window: resolvedWindow,
            })}
      </p>
      {maxOutput === null ? null : (
        <p>{t("settings.capabilitiesMaxOutput", { count: maxOutput })}</p>
      )}
      {resolved.contextWindowSource === null ? null : (
        <p>
          {t("settings.capabilitiesSource", {
            source: humanize(resolved.contextWindowSource),
          })}
        </p>
      )}
      {resolved.confidence === null ? null : (
        <p>
          {t("settings.capabilitiesConfidence", {
            confidence: humanize(resolved.confidence),
          })}
        </p>
      )}
      {workingWindow.status === "unknown" || safeWindow === null ? (
        <p className="text-muted-foreground">
          {t("settings.capabilitiesWorkingWindowUnknown")}
        </p>
      ) : (
        <p>{t("settings.capabilitiesWorkingWindow", { window: safeWindow })}</p>
      )}
      {workingWindow.status === "degraded" ? (
        <p className="text-amber-600 dark:text-amber-400">
          {t("settings.capabilitiesWorkingWindowDegraded")}
        </p>
      ) : null}
      {workingWindow.status === "infeasible" ? (
        <p className="text-amber-600 dark:text-amber-400">
          {t("settings.capabilitiesWorkingWindowInfeasible")}
        </p>
      ) : null}
      {typedDiffers && typedContextWindow !== null ? (
        <p className="text-muted-foreground">
          {t("settings.capabilitiesTypedOverride", {
            window: formatTokenCount(typedContextWindow, locale),
          })}
        </p>
      ) : null}
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={!canApply}
        onClick={() => {
          if (!canApply || applicableWindow === null) return
          onApply(applicableWindow)
        }}
      >
        {t("settings.capabilitiesApply")}
      </Button>
    </div>
  )
}
