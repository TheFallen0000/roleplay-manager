import { useState } from "react"
import { BookOpenIcon, PencilIcon, UnlinkIcon } from "lucide-react"

import type { TranslationKey } from "@workspace/shared/i18n"
import { Button } from "@workspace/ui/components/button"

import { useTranslation } from "@/lib/hooks/use-translation"

import type { CharacterPageState } from "../use-character-page"

const STATUS_KEYS: Record<
  "current" | "outdated" | "deleted",
  TranslationKey
> = {
  current: "characters.lorebookStatusCurrent",
  outdated: "characters.lorebookStatusOutdated",
  deleted: "characters.lorebookStatusDeleted",
}

export function LorebookSection({ state }: { state: CharacterPageState }) {
  const { t } = useTranslation()
  const {
    lorebookSummary,
    lorebookVersions,
    lorebooks,
    changeLorebook,
    removeLorebook,
  } = state
  const [pickerOpen, setPickerOpen] = useState(false)

  const openBook = () => {
    if (!lorebookSummary) return
    location.href = `/lorebooks/${lorebookSummary.lorebookId}`
  }

  return (
    <section
      id="section-lorebook"
      aria-labelledby="section-lorebook-heading"
      className="flex scroll-mt-24 flex-col gap-4"
    >
      <h2
        id="section-lorebook-heading"
        className="font-heading text-lg font-semibold"
      >
        {t("characters.sectionLorebook")}
      </h2>

      {lorebookSummary ? (
        <div className="flex flex-col gap-3 rounded-xl border p-4">
          <p className="text-sm">
            <span className="font-medium">
              {t(STATUS_KEYS[lorebookSummary.status])}
            </span>
            {" · "}
            {lorebookSummary.name ?? t("common.untitled")}
            {` v${lorebookSummary.versionNumber}`}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={openBook}>
              <BookOpenIcon />
              {t("characters.lorebookOpen")}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setPickerOpen((open) => !open)}
            >
              <PencilIcon />
              {t("characters.lorebookChange")}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => void removeLorebook()}
            >
              <UnlinkIcon />
              {t("characters.lorebookRemove")}
            </Button>
          </div>
          {pickerOpen ? (
            <>
              <label className="flex flex-col gap-1 text-xs">
                <span className="text-muted-foreground">
                  {t("characters.lorebookPick")}
                </span>
                <select
                  value={lorebookSummary.lorebookId}
                  onChange={(event) => {
                    if (event.target.value) {
                      void changeLorebook(event.target.value)
                    }
                  }}
                  className="h-9 rounded-md border bg-transparent px-2 text-sm"
                >
                  <option value="">{t("characters.lorebookNoSelection")}</option>
                  {lorebooks.map((book) => (
                    <option key={book.id} value={book.id}>
                      {book.name ?? t("common.untitled")}
                      {book.currentVersionNumber
                        ? ` · v${book.currentVersionNumber}`
                        : ""}
                    </option>
                  ))}
                </select>
              </label>
              {lorebookVersions.length > 0 ? (
                <label className="flex flex-col gap-1 text-xs">
                  <span className="text-muted-foreground">
                    {t("characters.lorebookVersionPick")}
                  </span>
                  <select
                    aria-label={t("characters.lorebookVersionPick")}
                    value={lorebookSummary.versionId}
                    onChange={(event) => {
                      if (event.target.value) {
                        void changeLorebook(
                          lorebookSummary.lorebookId,
                          event.target.value,
                        )
                      }
                    }}
                    className="h-9 rounded-md border bg-transparent px-2 text-sm"
                  >
                    {lorebookVersions.map((version) => (
                      <option key={version.id} value={version.id}>
                        {`v${version.versionNumber}`}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
            </>
          ) : null}
        </div>
      ) : (
        <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed p-4">
          <p className="text-sm text-muted-foreground">
            {t("characters.lorebookNone")}
          </p>
          <p className="text-xs text-muted-foreground">
            {t("characters.lorebookLinkHint")}
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={() => setPickerOpen((open) => !open)}
          >
            <BookOpenIcon />
            {t("characters.lorebookPick")}
          </Button>
          {pickerOpen ? (
            <select
              value=""
              onChange={(event) => {
                if (event.target.value) {
                  void changeLorebook(event.target.value)
                }
              }}
              aria-label={t("characters.lorebookPick")}
              className="h-9 rounded-md border bg-transparent px-2 text-sm"
            >
              <option value="">{t("characters.lorebookNoSelection")}</option>
              {lorebooks.map((book) => (
                <option key={book.id} value={book.id}>
                  {book.name ?? t("common.untitled")}
                  {book.currentVersionNumber
                    ? ` · v${book.currentVersionNumber}`
                    : ""}
                </option>
              ))}
            </select>
          ) : null}
        </div>
      )}
    </section>
  )
}
