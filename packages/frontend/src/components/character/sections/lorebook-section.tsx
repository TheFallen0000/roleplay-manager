import { useState } from "react"
import { BookOpenIcon, PencilIcon, UnlinkIcon } from "lucide-react"

import type { TranslationKey } from "@workspace/shared/i18n"

import { SectionPanel } from "@/components/shared/card-first/section-panel"
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
    <SectionPanel
      id="section-lorebook"
      kicker={`04 · ${t("characters.sectionLorebook")}`}
      title={t("characters.sectionLorebook")}
      description={t("characters.lorebookSectionHint")}
    >
      {lorebookSummary ? (
        <div className="rm-book-summary">
          <span className="spine" aria-hidden="true" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3>{lorebookSummary.name ?? t("common.untitled")}</h3>
              <span className="rm-chip rm-chip--violet">
                v{lorebookSummary.versionNumber}
              </span>
              <span className="rm-chip">{t(STATUS_KEYS[lorebookSummary.status])}</span>
            </div>
            <p className="meta">
              {t("lorebooks.entryCount", { count: lorebookSummary.entryCount })}
              {" · "}
              {t("characters.lorebookVersionPin")}
            </p>
          </div>
          <div className="actions">
            {lorebookSummary.status === "deleted" ? (
              <span className="rm-chip rm-chip--dashed">
                {t("characters.lorebookStatusDeleted")}
              </span>
            ) : (
              <button
                type="button"
                className="rm-btn rm-btn--ghost rm-btn--sm"
                onClick={openBook}
              >
                <BookOpenIcon className="size-4" />
                {t("characters.lorebookOpen")}
              </button>
            )}
            <button
              type="button"
              className="rm-btn rm-btn--ghost rm-btn--sm"
              onClick={() => setPickerOpen((open) => !open)}
            >
              <PencilIcon className="size-4" />
              {t("characters.lorebookChange")}
            </button>
            <button
              type="button"
              className="rm-btn rm-btn--ghost rm-btn--sm"
              onClick={() => void removeLorebook()}
            >
              <UnlinkIcon className="size-4" />
              {t("characters.lorebookRemove")}
            </button>
          </div>
        </div>
      ) : (
        <div className="rm-empty">
          <h2>{t("characters.lorebookNone")}</h2>
          <p>{t("characters.lorebookLinkHint")}</p>
          <button
            type="button"
            className="rm-btn rm-btn--ghost"
            onClick={() => setPickerOpen((open) => !open)}
          >
            <BookOpenIcon className="size-4" />
            {t("characters.lorebookPick")}
          </button>
        </div>
      )}

      {pickerOpen ? (
        <div className="rm-field-grid" style={{ marginTop: "0.85rem" }}>
          <label className="rm-field">
            <span className="label">{t("characters.lorebookPick")}</span>
            <select
              value={lorebookSummary?.lorebookId ?? ""}
              onChange={(event) => {
                if (event.target.value) {
                  void changeLorebook(event.target.value)
                }
              }}
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
          {lorebookSummary && lorebookVersions.length > 0 ? (
            <label className="rm-field">
              <span className="label">{t("characters.lorebookVersionPick")}</span>
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
              >
                {lorebookVersions.map((version) => (
                  <option key={version.id} value={version.id}>
                    {`v${version.versionNumber}`}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </div>
      ) : null}
    </SectionPanel>
  )
}
