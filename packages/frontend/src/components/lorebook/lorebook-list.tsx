import { useEffect, useState } from "react"
import { BookOpenIcon, PlusIcon } from "lucide-react"

import type { Locale } from "@workspace/shared/i18n"
import type { LorebookSummaryDTO } from "@workspace/shared/types/lorebook"
import { Button } from "@workspace/ui/components/button"

import { listLorebooks } from "@/lib/api/lorebooks"
import { I18nProvider } from "@/lib/hooks/i18n-provider"
import { useTranslation } from "@/lib/hooks/use-translation"

import { LorebookCard } from "./lorebook-card"

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

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="grid gap-1">
          <h1 className="font-heading text-3xl font-black tracking-tight">
            {t("lorebooks.title")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("lorebooks.subtitle")}
          </p>
        </div>
        <Button render={<a href="/lorebooks/new" />} nativeButton={false}>
          <PlusIcon />
          {t("lorebooks.create")}
        </Button>
      </header>

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
      ) : lorebooks.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed px-6 py-12 text-center">
          <BookOpenIcon className="size-10 text-muted-foreground" />
          <p className="font-heading text-lg font-semibold">
            {t("lorebooks.emptyTitle")}
          </p>
          <p className="text-sm text-muted-foreground">
            {t("lorebooks.emptyDescription")}
          </p>
          <Button render={<a href="/lorebooks/new" />} nativeButton={false}>
            <PlusIcon />
            {t("lorebooks.create")}
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {lorebooks.map((book) => (
            <LorebookCard key={book.id} lorebook={book} />
          ))}
        </div>
      )}
    </div>
  )
}
