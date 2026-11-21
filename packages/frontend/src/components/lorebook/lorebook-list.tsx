import { useEffect, useState } from "react"
import { BookOpenIcon, PlusIcon, UploadIcon } from "lucide-react"

import type { Locale } from "@workspace/shared/i18n"
import type { LorebookSummaryDTO } from "@workspace/shared/types/lorebook"

import { listLorebooks, type LorebookFilter } from "@/lib/api/lorebooks"
import { I18nProvider } from "@/lib/hooks/i18n-provider"
import { useTranslation } from "@/lib/hooks/use-translation"

import { LorebookCard } from "./lorebook-card"
import { LorebookImportDialog } from "./lorebook-import-dialog"

interface LorebookListProps {
  locale: Locale
}

export function LorebookList({ locale }: LorebookListProps) {
  return (
    <I18nProvider initialLocale={locale}>
      <LorebookListContent />
    </I18nProvider>
  )
}

const FILTER_LABEL_KEYS = {
  all: "lorebooks.filterAll",
  "in-use": "lorebooks.filterLinked",
  unused: "lorebooks.filterUnlinked",
} as const

function LorebookListContent() {
  const { t } = useTranslation()
  const [lorebooks, setLorebooks] = useState<LorebookSummaryDTO[]>([])
  const [filter, setFilter] = useState<LorebookFilter>("all")
  const [reloadKey, setReloadKey] = useState(0)
  const [importOpen, setImportOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)
    listLorebooks({ filter })
      .then((books) => {
        if (active) setLorebooks(books)
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
  }, [filter, reloadKey, t])

  const isEmptyShelf = !loading && lorebooks.length === 0 && filter === "all"

  return (
    <div className="rm-content">
      <header className="rm-page-head">
        <div>
          <h1>{t("lorebooks.title")}</h1>
          <p className="lede">{t("lorebooks.subtitle")}</p>
        </div>
        <div className="rm-page-actions">
          <button
            type="button"
            className="rm-btn rm-btn--ghost"
            onClick={() => setImportOpen(true)}
          >
            <UploadIcon className="size-4" />
            {t("lorebooks.import")}
          </button>
          <a className="rm-btn" href="/lorebooks/new">
            <PlusIcon className="size-4" />
            {t("lorebooks.create")}
          </a>
        </div>
      </header>

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
      ) : isEmptyShelf ? (
        <div className="rm-empty">
          <BookOpenIcon className="size-10 text-primary" />
          <h2>{t("lorebooks.emptyTitle")}</h2>
          <p>{t("lorebooks.emptyDescription")}</p>
          <a className="rm-btn" href="/lorebooks/new">
            <PlusIcon className="size-4" />
            {t("lorebooks.create")}
          </a>
        </div>
      ) : (
        <>
          <div className="rm-toolbar">
            <div
              className="rm-filter"
              role="group"
              aria-label={t("lorebooks.filterLabel")}
            >
              {(
                ["all", "in-use", "unused"] as const
              ).map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={filter === value}
                  onClick={() => setFilter(value)}
                >
                  {t(FILTER_LABEL_KEYS[value])}
                </button>
              ))}
            </div>
          </div>

          {lorebooks.length === 0 ? (
            <div className="rm-empty">
              <p>{t("lorebooks.filterEmpty")}</p>
            </div>
          ) : (
            <div className="rm-book-grid">
              {lorebooks.map((book) => (
                <LorebookCard key={book.id} lorebook={book} />
              ))}
              <a href="/lorebooks/new" className="rm-book-card rm-book-card--add">
                <div>
                  <span className="plus" aria-hidden="true">
                    +
                  </span>
                  {t("lorebooks.create")}
                </div>
              </a>
            </div>
          )}
        </>
      )}

      <LorebookImportDialog
        open={importOpen}
        format="ccv3"
        onOpenChange={setImportOpen}
        onImported={() => setReloadKey((key) => key + 1)}
      />
    </div>
  )
}
