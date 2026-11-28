import { useState } from "react"

import type { ContextManifestDTO } from "@workspace/shared/types/context"
import type { TranslationKey } from "@workspace/shared/i18n"
import type { ContextPolicyId } from "@workspace/shared/lib/context-policy"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"

import { useTranslation } from "@/lib/hooks/use-translation"
import { memorySelectionReasonKey } from "@/lib/format-memory"

const POLICY_LABEL_KEYS: Record<ContextPolicyId, TranslationKey> = {
  fast: "settings.contextPolicyFast",
  balanced: "settings.contextPolicyBalanced",
  deep: "settings.contextPolicyDeep",
}

export function ContextManifestView({
  manifest,
}: {
  manifest: ContextManifestDTO
}) {
  const { t, tRaw } = useTranslation()
  const [warningDismissed, setWarningDismissed] = useState(false)

  const budget = manifest.budget
  const policyLabel = t(POLICY_LABEL_KEYS[manifest.contextPolicy])

  const sectionCap = (sectionId: string): number | null => {
    if (sectionId === "memories") return budget.memory
    if (sectionId === "summary") return budget.summaryOutput
    return null
  }

  const sectionAtCap = manifest.sections.some((section) => {
    const cap = sectionCap(section.id)
    return cap !== null && section.tokens >= cap
  })
  const windowUnknown =
    manifest.contextWindow === null || budget.window === null
  const warning = sectionAtCap
    ? t("chat.contextBudgetCapWarning")
    : windowUnknown
      ? t("chat.contextBudgetWindowUnknown")
      : null

  return (
    <section
      aria-labelledby="context-manifest-title"
      className="rounded-md border bg-muted/30 p-3"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h4
          id="context-manifest-title"
          className="text-xs font-semibold text-muted-foreground"
        >
          {t("chat.contextManifestTitle")}
        </h4>
        <span className="text-[11px] text-muted-foreground">
          {t("chat.contextManifestInput", {
            tokens: manifest.estimatedInputTokens,
          })}
        </span>
      </div>

      <div className="mt-2 border-t pt-2">
        <h5 className="text-[11px] font-semibold text-muted-foreground">
          {t("chat.contextBudgetTitle")}
        </h5>
        <div className="mt-1 space-y-0.5 text-[11px] tabular-nums">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span>{t("chat.contextBudgetPolicy")}</span>
            <span className="font-medium">{policyLabel}</span>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span>
              {t("chat.contextBudgetCompaction", {
                threshold: budget.compactionThreshold,
                target: budget.compactionTarget,
              })}
            </span>
            <span className="flex items-center gap-1.5">
              <Badge
                variant={manifest.compaction.needed ? "outline" : "secondary"}
                className="text-[10px]"
              >
                {t("chat.contextManifestCompactionNeeded")}
              </Badge>
              {manifest.compaction.applied ? (
                <Badge variant="secondary" className="text-[10px]">
                  {t("chat.contextManifestCompactionApplied")}
                </Badge>
              ) : null}
            </span>
          </div>
          <div>
            {t("chat.contextBudgetMemoryCap", { count: budget.memory })}
          </div>
          <div>
            {t("chat.contextBudgetSummaryOutputCap", {
              count: budget.summaryOutput,
            })}
          </div>
          <div>
            {t("chat.contextBudgetSummaryMemoryCap", {
              count: budget.summaryMemory,
            })}
          </div>
        </div>
      </div>

      {warning && !warningDismissed ? (
        <div
          role="status"
          aria-live="polite"
          className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-[11px] text-amber-700 dark:text-amber-300"
        >
          <span>{warning}</span>
          <Button
            variant="ghost"
            size="xs"
            onClick={() => setWarningDismissed(true)}
          >
            {t("chat.contextBudgetDismiss")}
          </Button>
        </div>
      ) : null}

      {manifest.sections.length > 0 ? (
        <ul className="mt-2 space-y-1.5" aria-labelledby="context-manifest-title">
          {manifest.sections.map((section) => {
            const cap = sectionCap(section.id)
            return (
              <li
                key={section.id}
                className="flex items-start justify-between gap-2 text-xs"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-medium">
                      {tRaw(`chat.contextSection.${section.id}`, section.id)}
                    </span>
                    <Badge
                      variant={section.included ? "secondary" : "outline"}
                      className={cn(
                        "text-[10px]",
                        !section.included && "text-muted-foreground",
                      )}
                    >
                      {section.included
                        ? t("chat.contextManifestIncluded")
                        : t("chat.contextManifestExcluded")}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {section.reason}
                  </p>
                </div>
                <span className="shrink-0 font-medium tabular-nums">
                  {cap === null
                    ? section.tokens
                    : t("chat.contextBudgetSectionUsage", {
                        tokens: section.tokens,
                        cap,
                      })}
                </span>
              </li>
            )
          })}
        </ul>
      ) : null}

      {manifest.memories.selection.length > 0 ? (
        <div className="mt-2 border-t pt-2">
          <p className="text-[11px] font-medium">
            {t("memory.selectionTitle")}
          </p>
          <ul className="mt-1 space-y-1">
            {manifest.memories.selection.map((selection) => (
              <li
                key={selection.id}
                className="flex flex-wrap items-center gap-1.5 text-[11px]"
              >
                <span className="font-mono">{selection.id}</span>
                <Badge
                  variant={selection.included ? "secondary" : "outline"}
                  className={cn(
                    "text-[10px]",
                    !selection.included && "text-muted-foreground",
                  )}
                >
                  {selection.included
                    ? t("chat.contextManifestIncluded")
                    : t("chat.contextManifestExcluded")}
                </Badge>
                <span className="tabular-nums text-muted-foreground">
                  {selection.score}
                </span>
                <span className="text-muted-foreground">
                  {t(memorySelectionReasonKey(selection.reason))}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  )
}
