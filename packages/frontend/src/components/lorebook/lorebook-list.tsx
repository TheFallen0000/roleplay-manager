import { useEffect, useMemo, useState } from "react"
import { BookOpenIcon, PlusIcon } from "lucide-react"

import type { Locale } from "@workspace/shared/i18n"
import type { LorebookSummaryDTO } from "@workspace/shared/types/lorebook"

import { listLorebooks } from "@/lib/api/lorebooks"
import { I18nProvider } from "@/lib/hooks/i18n-provider"
import { useTranslation } from "@/lib/hooks/use-translation"

import { LorebookCard } from "./lorebook-card"

type LorebookFilter = "all" | "linked" | "unlinked"

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

function LorebookListContent() {
  const { t } = useTranslation()
  const [lorebooks, setLorebooks] = useState<LorebookSummaryDTO[]>([])
  const [filter, setFilter] = useState<LorebookFilter>("all")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    listLorebooks()
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
  }, [t])

  const counts = useMemo(
    () => ({
      all: lorebooks.length,
      linked: lorebooks.filter((book) => (book.usageCount ?? 0) > 0).length,
      unlinked: lorebooks.filter((book) => (book.usageCount ?? 0) === 0).length,
    }),
    [lorebooks],
  )

  const visible = useMemo(() => {
    if (filter === "linked") {
      return lorebooks.filter((book) => (book.usageCount ?? 0) > 0)
    }
    if (filter === "unlinked") {
      return lorebooks.filter((book) => (book.usageCount ?? 0) === 0)
    }
    return lorebooks
  }, [filter, lorebooks])

  return (
    <div className="rm-content">
      <header className="rm-page-head">
        <div>
          <h1>{t("lorebooks.title")}</h1>
          <p className="lede">{t("lorebooks.subtitle")}</p>
        </div>
        <div className="rm-page-actions">
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
      ) : lorebooks.length === 0 ? (
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
            <div className="rm-filter" role="group" aria-label={t("lorebooks.filterLabel")}>
              {(
                [
                  ["all", "lorebooks.filterAll", counts.all],
                  ["linked", "lorebooks.filterLinked", counts.linked],
                  ["unlinked", "lorebooks.filterUnlinked", counts.unlinked],
                ] as const
              ).map(([value, labelKey, count]) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={filter === value}
                  onClick={() => setFilter(value)}
                >
                  {t(labelKey)} <span className="rm-mono">{count}</span>
                </button>
              ))}
            </div>
          </div>

          {visible.length === 0 ? (
            <div className="rm-empty">
              <p>{t("lorebooks.filterEmpty")}</p>
            </div>
          ) : (
            <div className="rm-book-grid">
              {visible.map((book) => (
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
    </div>
  )
}
