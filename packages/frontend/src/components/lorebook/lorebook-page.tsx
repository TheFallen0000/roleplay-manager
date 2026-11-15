import { useState } from "react"
import { BookOpenIcon, DownloadIcon, SaveIcon } from "lucide-react"
import { toast } from "@workspace/ui/components/sonner"

import type { Locale } from "@workspace/shared/i18n"

import { SectionNav } from "@/components/shared/card-first/section-nav"
import { SectionPanel } from "@/components/shared/card-first/section-panel"
import { exportLorebook } from "@/lib/api/lorebooks"
import { I18nProvider } from "@/lib/hooks/i18n-provider"
import { useTranslation } from "@/lib/hooks/use-translation"

import { LorebookEntriesSection } from "./lorebook-entries-section"
import { LorebookIdentitySection } from "./lorebook-identity-section"
import { LorebookSettingsSection } from "./lorebook-settings-section"
import { LorebookVersionsSection } from "./lorebook-versions-section"
import { useLorebookPage } from "./use-lorebook-page"

interface LorebookPageProps {
  locale: Locale
  lorebookId?: string
}

export function LorebookPage({ locale, lorebookId }: LorebookPageProps) {
  return (
    <I18nProvider initialLocale={locale}>
      <LorebookPageContent lorebookId={lorebookId} />
    </I18nProvider>
  )
}

function LorebookPageContent({ lorebookId }: { lorebookId?: string }) {
  const { t } = useTranslation()
  const state = useLorebookPage(lorebookId)
  const {
    isEditing,
    lorebook,
    versions,
    selectedVersionId,
    readOnly,
    loading,
    saving,
    error,
    saveError,
    handleVersionChange,
    save,
  } = state
  const [exporting, setExporting] = useState(false)

  if (loading) {
    return (
      <div className="rm-content">
        <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rm-content">
        <div className="rm-empty">
          <h1>{t("lorebooks.notFound")}</h1>
          <p role="alert">{error}</p>
        </div>
      </div>
    )
  }

  const selectedVersion =
    versions.find((version) => version.id === selectedVersionId) ??
    versions[versions.length - 1]
  const currentVersionNumber =
    lorebook?.currentVersionNumber ?? selectedVersion?.versionNumber ?? 1
  const entryCount = selectedVersion?.entries.length ?? state.entries.length
  const updatedAt = selectedVersion?.createdAt ?? ""

  const handleExport = async () => {
    if (!lorebook) return
    setExporting(true)
    try {
      const payload = await exportLorebook(lorebook.id, "ccv3")
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: "application/json",
      })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `${(lorebook.name ?? "lorebook").replace(/[^\w-]+/g, "-").toLowerCase()}.json`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
      toast.success(t("characters.lorebookExportDone"))
    } catch {
      toast.error(t("characters.lorebookExportFailed"))
    } finally {
      setExporting(false)
    }
  }

  const sections = [
    { id: "lorebook-identity", label: t("lorebooks.identity"), number: "01" },
    { id: "lorebook-settings", label: t("lorebooks.settings"), number: "02" },
    { id: "lorebook-entries", label: t("lorebooks.entries"), number: "03" },
    { id: "lorebook-versions", label: t("lorebooks.versions"), number: "04" },
    { id: "lorebook-link", label: t("lorebooks.link"), number: "05" },
  ]

  return (
    <div className="rm-content">
      <div className="rm-breadcrumb">
        <a href="/">{t("nav.groupLibrary")}</a>
        <span className="sep">/</span>
        <a href="/lorebooks">{t("nav.lorebooks")}</a>
        <span className="sep">/</span>
        <span>{isEditing && lorebook ? lorebook.name : t("lorebooks.newTitle")}</span>
      </div>

      <header className="rm-cover">
        <div className="rm-cover-inner">
          <div className="rm-cover-avatar" aria-hidden="true">
            <BookOpenIcon className="size-8" />
          </div>
          <div className="rm-cover-identity">
            <h1>{isEditing && lorebook ? lorebook.name ?? t("common.untitled") : t("lorebooks.newTitle")}</h1>
            <p className="sub">
              {lorebook?.description || t("lorebooks.cardFallbackDescription")}
            </p>
            <div className="rm-meta-row">
              <span className="rm-chip rm-chip--violet">
                {isEditing ? `v${currentVersionNumber}` : t("lorebooks.draftVersion")}
                {readOnly ? ` · ${t("lorebooks.readOnly")}` : ""}
              </span>
              {isEditing ? (
                <span>
                  <strong>{t("lorebooks.entries")}</strong> {entryCount}
                </span>
              ) : null}
              <span>
                <strong>Scan</strong> {state.scanDepth}
              </span>
              <span>
                <strong>{t("lorebooks.tokenBudget")}</strong> {state.tokenBudget}
              </span>
              {isEditing && updatedAt ? (
                <span>
                  <strong>{t("characters.updatedLabel")}</strong>{" "}
                  {updatedAt.slice(0, 10)}
                </span>
              ) : null}
            </div>
          </div>
          <div className="rm-cover-actions">
            {isEditing && versions.length > 0 ? (
              <label className="rm-field">
                <span className="rm-sr-only">{t("lorebooks.versionLabel")}</span>
                <select
                  value={selectedVersionId}
                  onChange={(event) => {
                    if (event.target.value) {
                      void handleVersionChange(event.target.value)
                    }
                  }}
                  aria-label={t("lorebooks.versionLabel")}
                >
                  {[...versions].reverse().map((version) => (
                    <option key={version.id} value={version.id}>
                      v{version.versionNumber}
                      {version.id === lorebook?.currentVersionId
                        ? ` · ${t("lorebooks.currentVersion")}`
                        : ""}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <button
              type="button"
              className="rm-btn"
              onClick={() => void save()}
              disabled={saving || readOnly}
            >
              <SaveIcon className="size-4" />
              {saving ? t("common.loading") : t("lorebooks.save")}
            </button>
            <button
              type="button"
              className="rm-btn rm-btn--ghost"
              onClick={() => void handleExport()}
              disabled={!lorebook || readOnly || exporting}
              title={readOnly ? t("lorebooks.exportReadOnly") : undefined}
            >
              <DownloadIcon className="size-4" />
              {exporting ? t("common.loading") : t("characters.lorebookExport")}
            </button>
          </div>
        </div>
      </header>

      {saveError ? (
        <p role="alert" className="mb-4 text-sm text-destructive">
          {saveError}
        </p>
      ) : null}

      <div className="rm-page-grid rm-page-grid--rail">
        <SectionNav
          ariaLabel={t("lorebooks.sectionNavLabel")}
          caption={t("lorebooks.sectionNavCaption")}
          sections={sections}
        />

        <div>
          <LorebookIdentitySection state={state} />
          <LorebookSettingsSection state={state} />
          <LorebookEntriesSection state={state} />
          <LorebookVersionsSection state={state} />
          <SectionPanel
            id="lorebook-link"
            kicker={`05 · ${t("lorebooks.link")}`}
            title={t("lorebooks.link")}
            description={t("lorebooks.linkHint")}
          >
            <div className="rm-empty">
              <h2>{t("lorebooks.linkDeferredTitle")}</h2>
              <p>{t("lorebooks.linkDeferred")}</p>
              <span className="rm-chip rm-chip--dashed">S134</span>
            </div>
          </SectionPanel>

          <div className="rm-save-bar">
            <div className="rm-save-status">
              <span className="dot" />
              <span>
                {readOnly
                  ? t("lorebooks.readOnly")
                  : isEditing
                    ? t("lorebooks.saveHint")
                    : t("lorebooks.createSaveHint")}
              </span>
            </div>
            <div className="rm-save-actions">
              <button
                type="button"
                className="rm-btn"
                onClick={() => void save()}
                disabled={saving || readOnly}
              >
                {saving ? t("common.loading") : t("lorebooks.save")}
              </button>
            </div>
          </div>
        </div>

        <aside className="rm-rail" aria-label={t("lorebooks.summary")}>
          <div className="rm-rail-card">
            <h3>{t("lorebooks.summary")}</h3>
            <div className="rm-kv">
              <span className="k">{t("lorebooks.versionLabel")}</span>
              <span className="v">
                {isEditing ? `v${currentVersionNumber}` : "—"}
              </span>
            </div>
            <div className="rm-kv">
              <span className="k">{t("lorebooks.entries")}</span>
              <span className="v">{isEditing ? entryCount : "—"}</span>
            </div>
            <div className="rm-kv">
              <span className="k">Scan</span>
              <span className="v">{state.scanDepth}</span>
            </div>
            <div className="rm-kv">
              <span className="k">{t("lorebooks.tokenBudget")}</span>
              <span className="v">{state.tokenBudget}</span>
            </div>
            <div className="rm-kv">
              <span className="k">{t("lorebooks.origin")}</span>
              <span className="v rm-mono">
                {lorebook?.originId ? lorebook.originId.slice(0, 8) : "—"}
              </span>
            </div>
          </div>
          <div className="rm-rail-card">
            <h3>{t("lorebooks.link")}</h3>
            <p>{t("lorebooks.linkDeferred")}</p>
            <span className="rm-chip rm-chip--dashed" style={{ marginTop: "0.55rem" }}>
              S134
            </span>
          </div>
        </aside>
      </div>
    </div>
  )
}
