import { useEffect, useMemo } from "react"

import type { LorebookVersionSummary } from "@workspace/shared/types/lorebook"

import { getCharacterAssetUrl } from "@/lib/api/client"
import { useTranslation } from "@/lib/hooks/use-translation"

interface CharacterCoverProps {
  characterId?: string
  name: string
  subtitle: string
  profileImageAssetId: string | null
  pendingFile: File | null
  versionNumber?: number
  cardSpec?: string | null
  creator?: string | null
  tags?: string[]
  lorebook?: LorebookVersionSummary | null
  updatedAt?: string
  onImageClick?: () => void
  children?: React.ReactNode
}

export function CharacterCover({
  characterId,
  name,
  subtitle,
  profileImageAssetId,
  pendingFile,
  versionNumber,
  cardSpec,
  creator,
  tags = [],
  lorebook,
  updatedAt,
  onImageClick,
  children,
}: CharacterCoverProps) {
  const { t } = useTranslation()
  const pendingUrl = useMemo(
    () => (pendingFile ? URL.createObjectURL(pendingFile) : null),
    [pendingFile],
  )

  useEffect(() => {
    return () => {
      if (pendingUrl) URL.revokeObjectURL(pendingUrl)
    }
  }, [pendingUrl])

  const imageUrl =
    pendingUrl ??
    (characterId && profileImageAssetId
      ? getCharacterAssetUrl(characterId, profileImageAssetId, "thumbnail")
      : null)

  const spec = cardSpec?.startsWith("3") ? "V3" : "V2"
  const initial = name.trim().charAt(0).toUpperCase() || "?"
  const avatar = imageUrl ? (
    <img src={imageUrl} alt="" />
  ) : (
    <span aria-hidden="true">{initial}</span>
  )

  return (
    <header className="rm-cover">
      <div className="rm-cover-inner">
        {onImageClick ? (
          <button
            type="button"
            className="rm-cover-avatar"
            onClick={onImageClick}
            aria-label={t("characters.fieldProfileImage")}
            title={t("characters.fieldProfileImage")}
          >
            {avatar}
          </button>
        ) : (
          <div className="rm-cover-avatar">{avatar}</div>
        )}

        <div className="rm-cover-identity">
          <h1>{name.trim() || t("characters.createTitle")}</h1>
          <p className="sub">
            {subtitle.trim() || t("characters.newTitle")}
          </p>
          <div className="rm-meta-row">
            {versionNumber ? (
              <span className="rm-chip rm-chip--violet">v{versionNumber}</span>
            ) : null}
            <span>
              <strong>Card</strong> {spec}
            </span>
            {lorebook ? (
              <span>
                <strong>{t("characters.sectionLorebook")}</strong>{" "}
                {lorebook.name ?? t("common.untitled")} v
                {lorebook.versionNumber}
              </span>
            ) : null}
            {creator ? (
              <span>
                <strong>{t("characters.creator")}</strong> {creator}
              </span>
            ) : null}
            {updatedAt ? (
              <span>
                <strong>{t("characters.updatedLabel")}</strong>{" "}
                {updatedAt.slice(0, 10)}
              </span>
            ) : null}
          </div>
          {tags.length > 0 ? (
            <div className="rm-chip-list" style={{ marginTop: "0.55rem" }}>
              {tags.slice(0, 6).map((tag, index) => (
                <span
                  key={`${tag}-${index}`}
                  className={index === 0 ? "rm-chip rm-chip--violet" : "rm-chip"}
                >
                  {tag}
                </span>
              ))}
            </div>
          ) : null}
        </div>

        {children ? <div className="rm-cover-actions">{children}</div> : null}
      </div>
    </header>
  )
}
