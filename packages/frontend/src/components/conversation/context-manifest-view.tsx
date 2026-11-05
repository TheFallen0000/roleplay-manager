import type { ContextManifestDTO } from "@workspace/shared/types/context"
import { Badge } from "@workspace/ui/components/badge"
import { cn } from "@workspace/ui/lib/utils"

import { useTranslation } from "@/lib/hooks/use-translation"

export function ContextManifestView({
  manifest,
}: {
  manifest: ContextManifestDTO
}) {
  const { t, tRaw } = useTranslation()

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

      <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
        <span className="font-medium">
          {t("chat.contextManifestCompaction")}
        </span>
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
      </div>

      {manifest.sections.length > 0 ? (
        <ul className="mt-2 space-y-1.5" aria-labelledby="context-manifest-title">
          {manifest.sections.map((section) => (
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
                {section.tokens}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}
