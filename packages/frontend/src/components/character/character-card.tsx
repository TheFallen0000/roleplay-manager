import type {
  CharacterSummary,
  CharacterVersionDTO,
} from "@workspace/shared/types/character"
import type { ConversationSummary } from "@workspace/shared/types/conversation"
import { BookOpenIcon, MessageSquarePlusIcon } from "lucide-react"

import { getCharacterAssetUrl } from "@/lib/api/client"
import { createAssetSrcSet } from "@/lib/asset-srcset"
import { useTranslation } from "@/lib/hooks/use-translation"

import { CharacterContextMenu } from "./character-context-menu"

export interface CharacterCardProps {
  character: CharacterSummary
  conversations: ConversationSummary[]
  lastActivityAt: string | null
  getVersions: (characterId: string) => Promise<CharacterVersionDTO[]>
  onImageClick: (character: CharacterSummary) => void
  onOpenConversation: (conversationId: string) => void
  onCreateConversation: (characterId: string, versionId: string) => void
  onEdit: (characterId: string) => void
  onDelete: (characterId: string) => void
}

export function CharacterCard({
  character,
  conversations,
  lastActivityAt,
  getVersions,
  onImageClick,
  onOpenConversation,
  onCreateConversation,
  onEdit,
  onDelete,
}: CharacterCardProps) {
  const { t } = useTranslation()
  const canUseVariants =
    character.profileImageAssetId !== null &&
    character.profileImageMimeType !== "image/gif"
  const imageSrc = character.profileImageAssetId
    ? getCharacterAssetUrl(
        character.id,
        character.profileImageAssetId,
        canUseVariants ? "medium" : undefined,
      )
    : null
  const imageSrcSet =
    canUseVariants && character.profileImageDimensions
      ? createAssetSrcSet(
          character.id,
          character.profileImageAssetId!,
          character.profileImageDimensions.width,
          "profile",
        )
      : undefined
  const initial = Array.from(character.name.trim())[0]?.toUpperCase() ?? "?"
  const tags = character.tags ?? []
  const lorebook = character.lorebook

  return (
    <CharacterContextMenu
      character={character}
      conversations={conversations}
      getVersions={getVersions}
      onOpenConversation={onOpenConversation}
      onCreateConversation={onCreateConversation}
      onEdit={onEdit}
      onDelete={onDelete}
    >
      <article className="rm-character-card">
        <button
          type="button"
          onClick={() => onImageClick(character)}
          className="rm-character-cover"
          aria-label={t("characters.openMostRecent", { name: character.name })}
        >
          {imageSrc ? (
            <img
              src={imageSrc}
              srcSet={imageSrcSet}
              sizes="(min-width: 64rem) calc((100vw - 20rem) / 3), (min-width: 48rem) calc((100vw - 19rem) / 2), (min-width: 40rem) calc((100vw - 3rem) / 2), calc(100vw - 2rem)"
              width={character.profileImageDimensions?.width}
              height={character.profileImageDimensions?.height}
              loading="lazy"
              decoding="async"
              alt={`${character.name} avatar`}
            />
          ) : (
            <span className="initial">{initial}</span>
          )}
        </button>

        <div className="rm-character-card-body">
          <div className="flex items-start justify-between gap-2">
            <h2>
              <a href={`/characters/${character.id}`}>{character.name}</a>
            </h2>
            <span className="rm-chip rm-chip--violet">v{character.versionNumber}</span>
          </div>

          <p className="sub">
            {character.subtitle || t("characters.cardFallbackDescription")}
          </p>

          {tags.length > 0 ? (
            <div className="rm-chip-list">
              {tags.slice(0, 3).map((tag, index) => (
                <span
                  key={`${tag}-${index}`}
                  className={index === 0 ? "rm-chip rm-chip--violet" : "rm-chip"}
                >
                  {tag}
                </span>
              ))}
            </div>
          ) : null}

          <div className="rm-character-card-meta">
            {lorebook ? (
              <span className="flex items-center gap-1">
                <BookOpenIcon className="size-3" />
                {lorebook.name ?? t("common.untitled")} v{lorebook.versionNumber}
              </span>
            ) : (
              <span>{t("characters.lorebookNone")}</span>
            )}
            {character.creator ? <span>{character.creator}</span> : null}
            <span>
              {t("characters.createdAt", {
                date: new Date(character.createdAt).toLocaleDateString(),
              })}
            </span>
            <span>
              {t("characters.lastActivity", {
                date: lastActivityAt
                  ? new Date(lastActivityAt).toLocaleDateString()
                  : t("characters.noConversations"),
              })}
            </span>
          </div>

          <div className="rm-character-card-actions">
            <a
              className="rm-btn rm-btn--ghost rm-btn--sm"
              href={`/characters/${character.id}`}
            >
              {t("characters.openCard")}
            </a>
            <button
              type="button"
              className="rm-btn rm-btn--sm"
              onClick={() => onImageClick(character)}
            >
              <MessageSquarePlusIcon className="size-4" />
              {t("characters.startConversation")}
            </button>
          </div>
        </div>
      </article>
    </CharacterContextMenu>
  )
}
