import { EyeIcon } from "lucide-react"

import { SectionPanel } from "@/components/shared/card-first/section-panel"
import { useTranslation } from "@/lib/hooks/use-translation"

import type { LorebookPageState } from "./use-lorebook-page"

export function LorebookVersionsSection({
  state,
}: {
  state: LorebookPageState
}) {
  const { t } = useTranslation()
  const { versions, selectedVersionId, lorebook, handleVersionChange } = state

  return (
    <SectionPanel
      id="lorebook-versions"
      kicker={`04 · ${t("lorebooks.versions")}`}
      title={t("lorebooks.versions")}
      description={t("lorebooks.versionsHint")}
    >
      {versions.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {t("lorebooks.versionsEmpty")}
        </p>
      ) : (
        <ul className="rm-version-list">
          {[...versions].reverse().map((version) => {
            const isCurrent = version.id === lorebook?.currentVersionId
            const isSelected = version.id === selectedVersionId
            return (
              <li
                key={version.id}
                className={
                  isCurrent ? "rm-version rm-version--current" : "rm-version"
                }
              >
                <span className="rm-chip rm-chip--violet">
                  v{version.versionNumber}
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="text-sm font-semibold">
                      {version.name || t("common.untitled")}
                    </span>
                    {isCurrent ? (
                      <span className="rm-chip">{t("lorebooks.currentVersion")}</span>
                    ) : null}
                    {isSelected && !isCurrent ? (
                      <span className="rm-chip rm-chip--dashed">
                        {t("lorebooks.viewingVersion")}
                      </span>
                    ) : null}
                  </div>
                  <p className="note">
                    {version.createdAt?.slice(0, 10) ?? ""} ·{" "}
                    {t("lorebooks.entryCount", { count: version.entries.length })}
                  </p>
                </div>
                <button
                  type="button"
                  className="rm-btn rm-btn--quiet rm-btn--sm rm-version-actions"
                  onClick={() => void handleVersionChange(version.id)}
                >
                  <EyeIcon className="size-4" />
                  {t("lorebooks.viewVersion")}
                </button>
              </li>
            )
          })}
        </ul>
      )}
      <p className="mt-3 text-xs text-muted-foreground">
        {t("lorebooks.versionsDeferred")}
      </p>
    </SectionPanel>
  )
}
