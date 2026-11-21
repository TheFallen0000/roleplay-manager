import { Fragment, useEffect, useState } from "react"
import { UserRoundPlusIcon } from "lucide-react"

import type {
  LorebookUsageDTO,
  LorebookUsageVersion,
} from "@workspace/shared/types/lorebook"

import { SectionPanel } from "@/components/shared/card-first/section-panel"
import { getLorebookUsage } from "@/lib/api/lorebooks"
import { useTranslation } from "@/lib/hooks/use-translation"

import { LorebookLinkDialog } from "./lorebook-link-dialog"

interface LorebookLinkSectionProps {
  lorebookId: string
  versionId: string
}

export function LorebookLinkSection({
  lorebookId,
  versionId,
}: LorebookLinkSectionProps) {
  const { t } = useTranslation()
  const [usage, setUsage] = useState<LorebookUsageDTO | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [dialogOpen, setDialogOpen] = useState(false)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)
    getLorebookUsage(lorebookId, versionId)
      .then((next) => {
        if (active) setUsage(next)
      })
      .catch(() => {
        if (active) setError(t("lorebooks.loadFailed"))
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [lorebookId, reloadKey, t, versionId])

  const characters = usage?.characters ?? []

  const versionLabel = (version: LorebookUsageVersion) =>
    `v${version.characterVersionNumber} · ${
      version.isCurrentCharacterVersion
        ? t("lorebooks.usageCurrent")
        : t("lorebooks.usageHistorical")
    }`

  return (
    <SectionPanel
      id="lorebook-link"
      kicker={`05 · ${t("lorebooks.link")}`}
      title={t("lorebooks.link")}
      description={t("lorebooks.linkHint")}
      actions={
        <button
          type="button"
          className="rm-btn rm-btn--ghost rm-btn--sm"
          onClick={() => setDialogOpen(true)}
        >
          <UserRoundPlusIcon className="size-4" />
          {t("lorebooks.linkToCharacter")}
        </button>
      }
    >
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : loading || !usage ? (
        <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
      ) : characters.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {t("lorebooks.usageUnused")}
        </p>
      ) : (
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-x-4 gap-y-3">
          <h3 className="text-sm font-semibold">{t("lorebooks.inUseBy")}</h3>
          <h3 className="text-sm font-semibold">{t("lorebooks.history")}</h3>
          {characters.map((character) => (
            <Fragment key={character.characterId}>
              <div>
                <p className="text-sm font-medium">{character.characterName}</p>
                <ul className="ml-4 list-disc text-sm text-muted-foreground">
                  {character.inUse.map((version) => (
                    <li key={version.characterVersionId}>
                      {versionLabel(version)}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <ul className="list-disc pl-4 text-sm text-muted-foreground">
                  {character.history.map((version) => (
                    <li key={version.characterVersionId}>
                      {versionLabel(version)}
                    </li>
                  ))}
                </ul>
              </div>
            </Fragment>
          ))}
        </div>
      )}

      <LorebookLinkDialog
        open={dialogOpen}
        lorebookId={lorebookId}
        versionId={versionId}
        onOpenChange={setDialogOpen}
        onLinked={() => setReloadKey((key) => key + 1)}
      />
    </SectionPanel>
  )
}
