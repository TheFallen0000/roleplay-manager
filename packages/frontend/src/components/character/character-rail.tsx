import { useEffect, useMemo } from "react"
import { BookOpenIcon } from "lucide-react"

import { getCharacterAssetUrl } from "@/lib/api/client"
import { useTranslation } from "@/lib/hooks/use-translation"

import type { CharacterPageState } from "./use-character-page"

const STATUS_KEYS = {
  current: "characters.lorebookStatusCurrent",
  outdated: "characters.lorebookStatusOutdated",
  deleted: "characters.lorebookStatusDeleted",
} as const

export function CharacterRail({ state }: { state: CharacterPageState }) {
  const { t } = useTranslation()
  const { character, cards, cardFields, lorebookSummary, versions } = state
  const version = character?.currentVersion
  const tags = version?.tags ?? []
  const creator = version?.creator
  const spec = version?.cardCharacterVersion?.startsWith("3")
    ? "V3"
    : version
      ? "V2"
      : "—"
  const pendingPreviewUrl = useMemo(
    () => (state.pendingFile ? URL.createObjectURL(state.pendingFile) : null),
    [state.pendingFile],
  )

  useEffect(() => {
    return () => {
      if (pendingPreviewUrl) URL.revokeObjectURL(pendingPreviewUrl)
    }
  }, [pendingPreviewUrl])

  const previewImage =
    pendingPreviewUrl ??
    (state.character && state.profileImageAssetId
      ? getCharacterAssetUrl(
          state.character.id,
          state.profileImageAssetId,
        )
      : null)

  return (
    <aside className="rm-rail" aria-label={t("characters.cardSummary")}>
      {character ? (
        <div className="rm-rail-card">
          <h3>{t("characters.cardSummary")}</h3>
          <div className="rm-kv">
            <span className="k">{t("characters.versionLabel")}</span>
            <span className="v">v{character.currentVersion.versionNumber}</span>
          </div>
          <div className="rm-kv">
            <span className="k">Card</span>
            <span className="v">{spec}</span>
          </div>
          <div className="rm-kv">
            <span className="k">{t("characters.sectionFichas")}</span>
            <span className="v">{cards.length}</span>
          </div>
          <div className="rm-kv">
            <span className="k">{t("characters.tags")}</span>
            <span className="v">{tags.length > 0 ? tags.join(", ") : "—"}</span>
          </div>
          <div className="rm-kv">
            <span className="k">{t("characters.creator")}</span>
            <span className="v">{creator || "—"}</span>
          </div>
          <div className="rm-kv">
            <span className="k">{t("characters.sectionVersions")}</span>
            <span className="v">{versions.length}</span>
          </div>
          <div className="rm-kv">
            <span className="k">{t("characters.updatedLabel")}</span>
            <span className="v">{character.updatedAt.slice(0, 10)}</span>
          </div>
        </div>
      ) : null}

      <div className="rm-rail-card">
        <h3>{t("characters.sectionLorebook")}</h3>
        {lorebookSummary ? (
          <>
            <div className="rm-kv">
              <span className="k">{t("lorebooks.title")}</span>
              <span className="v">
                {lorebookSummary.name ?? t("common.untitled")}
              </span>
            </div>
            <div className="rm-kv">
              <span className="k">{t("lorebooks.versionLabel")}</span>
              <span className="v">v{lorebookSummary.versionNumber}</span>
            </div>
            <div className="rm-kv">
              <span className="k">{t("lorebooks.entries")}</span>
              <span className="v">{lorebookSummary.entryCount}</span>
            </div>
            <div className="rm-kv">
              <span className="k">{t("characters.status")}</span>
              <span className="v">
                {t(STATUS_KEYS[lorebookSummary.status])}
              </span>
            </div>
            {lorebookSummary.status === "deleted" ? (
              <span
                className="rm-chip rm-chip--dashed"
                style={{ marginTop: "0.55rem" }}
              >
                {t("characters.lorebookStatusDeleted")}
              </span>
            ) : (
              <a
                className="rm-btn rm-btn--ghost rm-btn--sm"
                style={{ width: "100%", marginTop: "0.55rem" }}
                href={`/lorebooks/${lorebookSummary.lorebookId}`}
              >
                <BookOpenIcon className="size-4" />
                {t("characters.lorebookOpen")}
              </a>
            )}
          </>
        ) : (
          <p>{t("characters.lorebookNoSelection")}</p>
        )}
      </div>

      <div className="rm-rail-card rm-rail-preview">
        <h3>{t("characters.cardPreview")}</h3>
        <div className="rm-preview-card">
          <div className="rm-preview-cover">
            {previewImage ? (
              <img
                src={previewImage}
                alt=""
                loading="lazy"
                decoding="async"
              />
            ) : (
              <span aria-hidden="true">
                {state.name.trim().charAt(0).toUpperCase() || "?"}
              </span>
            )}
          </div>
          <div className="rm-preview-body">
            <div className="rm-preview-title-row">
              <p className="rm-preview-name">
                {state.name.trim() || t("characters.createTitle")}
              </p>
              {state.character ? (
                <span className="rm-chip rm-chip--violet">
                  v{state.character.currentVersion.versionNumber}
                </span>
              ) : null}
            </div>
            <p className="rm-preview-sub">
              {state.subtitle.trim() || t("characters.newTitle")}
            </p>
            <p className="rm-preview-desc">
              {cardFields.tagline?.trim() ||
                state.description.trim() ||
                t("characters.cardFallbackDescription")}
            </p>
            {cardFields.tags.length > 0 ? (
              <div className="rm-chip-list">
                {cardFields.tags.slice(0, 4).map((tag, index) => (
                  <span
                    key={`${tag}-${index}`}
                    className={
                      index === 0 ? "rm-chip rm-chip--violet" : "rm-chip"
                    }
                  >
                    {tag}
                  </span>
                ))}
              </div>
            ) : null}
            <div className="rm-preview-meta">
              <span>
                <strong>Card</strong> {spec}
              </span>
              {lorebookSummary ? (
                <span>
                  <strong>{t("lorebooks.title")}</strong>{" "}
                  {lorebookSummary.name ?? t("common.untitled")} v
                  {lorebookSummary.versionNumber}
                </span>
              ) : null}
            </div>
          </div>
        </div>
        <p className="rm-preview-note">{t("characters.cardPreviewHint")}</p>
      </div>
    </aside>
  )
}
