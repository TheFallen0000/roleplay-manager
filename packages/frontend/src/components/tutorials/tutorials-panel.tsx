import { useState } from "react"
import { SearchIcon } from "lucide-react"

import type { Locale } from "@workspace/shared/i18n"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@workspace/ui/components/empty"
import { Input } from "@workspace/ui/components/input"

import { I18nProvider } from "@/lib/hooks/i18n-provider"
import { useTranslation } from "@/lib/hooks/use-translation"
import {
  TUTORIAL_CATEGORIES,
  filterTutorials,
  listTutorials,
} from "@/lib/tutorials/catalog"
import type { TutorialId } from "@/lib/tutorials/types"
import { TutorialCard } from "./tutorial-card"
import { TutorialDialog } from "./tutorial-dialog"

export interface TutorialsPanelProps {
  locale: Locale
  initialTutorial?: TutorialId | null
}

/** Keeps `?t=` in the address bar so a single tutorial can be linked. */
function replaceTutorialParam(id: TutorialId | null) {
  try {
    const url = new URL(window.location.href)
    if (id) {
      url.searchParams.set("t", id)
    } else {
      url.searchParams.delete("t")
    }
    window.history.replaceState(null, "", url)
  } catch {
    // history unavailable (tests); the dialog keeps working.
  }
}

export function TutorialsPanel({
  locale,
  initialTutorial = null,
}: TutorialsPanelProps) {
  return (
    <I18nProvider initialLocale={locale}>
      <TutorialsContent initialTutorial={initialTutorial} />
    </I18nProvider>
  )
}

function TutorialsContent({
  initialTutorial,
}: {
  initialTutorial: TutorialId | null
}) {
  const { locale, t } = useTranslation()
  const [query, setQuery] = useState("")
  const [openId, setOpenId] = useState<TutorialId | null>(initialTutorial)

  const entries = listTutorials(locale)
  const visible = filterTutorials(entries, query)
  const openEntry =
    openId === null
      ? null
      : (entries.find((entry) => entry.id === openId) ?? null)

  const openTutorial = (id: TutorialId) => {
    setOpenId(id)
    replaceTutorialParam(id)
  }

  const closeTutorial = () => {
    setOpenId(null)
    replaceTutorialParam(null)
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">{t("tutorials.heading")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("tutorials.description")}
        </p>
      </header>

      <div className="relative">
        <SearchIcon
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t("tutorials.searchPlaceholder")}
          aria-label={t("tutorials.searchPlaceholder")}
          className="pl-9"
        />
      </div>

      {visible.length === 0 ? (
        <Empty className="p-6">
          <EmptyHeader>
            <EmptyTitle>{t("tutorials.noResultsTitle")}</EmptyTitle>
            <EmptyDescription>{t("tutorials.noResults")}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        TUTORIAL_CATEGORIES.map((category) => {
          const items = visible.filter((entry) => entry.category === category.id)
          if (items.length === 0) return null
          const CategoryIcon = category.icon
          return (
            <section key={category.id} className="flex flex-col gap-3">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <CategoryIcon aria-hidden className="size-4" />
                {t(category.labelKey)}
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {items.map((entry) => (
                  <TutorialCard
                    key={entry.id}
                    entry={entry}
                    onOpen={() => openTutorial(entry.id)}
                  />
                ))}
              </div>
            </section>
          )
        })
      )}

      <TutorialDialog entry={openEntry} onClose={closeTutorial} />
    </div>
  )
}
