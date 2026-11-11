import type { Locale } from "@workspace/shared/i18n"
import { Button } from "@workspace/ui/components/button"

import { I18nProvider } from "@/lib/hooks/i18n-provider"
import { useTranslation } from "@/lib/hooks/use-translation"

import { LorebookEntriesSection } from "./lorebook-entries-section"
import { LorebookIdentitySection } from "./lorebook-identity-section"
import { LorebookSectionNav } from "./lorebook-section-nav"
import { LorebookSettingsSection } from "./lorebook-settings-section"
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
  const { isEditing, lorebook, versions, selectedVersionId, readOnly } = state
  const { loading, saving, error, handleVersionChange, save } = state

  if (loading) {
    return (
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
        <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-2 rounded-2xl border border-dashed p-6">
        <h1 className="font-heading text-xl font-bold">
          {t("lorebooks.notFound")}
        </h1>
        <p role="alert" className="text-sm text-muted-foreground">
          {error}
        </p>
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="font-heading text-2xl font-black tracking-tight">
          {isEditing && lorebook
            ? lorebook.name ?? t("common.untitled")
            : t("lorebooks.newTitle")}
        </h1>
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          {isEditing ? (
            <label className="flex items-center gap-2">
              <span>{t("lorebooks.versionLabel")}</span>
              <select
                value={selectedVersionId}
                onChange={(event) => {
                  if (event.target.value) {
                    void handleVersionChange(event.target.value)
                  }
                }}
                className="h-8 rounded-md border bg-transparent px-2 text-sm"
              >
                {versions.map((version) => (
                  <option key={version.id} value={version.id}>
                    {t("lorebooks.versionNumber", {
                      number: version.versionNumber,
                    })}
                    {version.name ? ` · ${version.name}` : ""}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <p>{t("lorebooks.createHint")}</p>
          )}
        </div>
        {readOnly ? (
          <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-300">
            {t("lorebooks.readOnly")}
          </p>
        ) : null}
      </header>

      <LorebookSectionNav />

      <div className="flex flex-col gap-8">
        <LorebookIdentitySection state={state} />
        <LorebookSettingsSection state={state} />
        <LorebookEntriesSection state={state} />
      </div>

      <div className="sticky bottom-0 z-10 -mx-4 flex justify-end border-t bg-background/90 px-4 py-3 backdrop-blur-sm sm:mx-0 sm:rounded-lg sm:border">
        <Button
          onClick={() => void save()}
          disabled={saving || readOnly}
        >
          {saving ? t("common.loading") : t("lorebooks.save")}
        </Button>
      </div>
    </div>
  )
}
