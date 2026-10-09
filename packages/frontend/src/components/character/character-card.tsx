import type {
  CharacterSummary,
  CharacterVersionDTO,
} from "@workspace/shared/types/character"
import type { ConversationSummary } from "@workspace/shared/types/conversation"
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { Badge } from "@workspace/ui/components/badge"
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
      <Card
        className="relative overflow-hidden pt-0 transition-[transform,box-shadow,border-color] duration-200 ease-out hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg"
        size="sm"
      >
        <button
          type="button"
          onClick={() => onImageClick(character)}
          className="block w-full cursor-pointer text-left"
          aria-label={t("characters.openMostRecent", { name: character.name })}
        >
          {imageSrc ? (
            <>
              <div className="absolute inset-0 z-30 aspect-[16/10]" />
              <img
                src={imageSrc}
                srcSet={imageSrcSet}
                sizes="(min-width: 64rem) calc((100vw - 20rem) / 3), (min-width: 48rem) calc((100vw - 19rem) / 2), (min-width: 40rem) calc((100vw - 3rem) / 2), calc(100vw - 2rem)"
                width={character.profileImageDimensions?.width}
                height={character.profileImageDimensions?.height}
                loading="lazy"
                decoding="async"
                alt={`${character.name} avatar`}
                className="relative z-20 aspect-[16/10] w-full object-cover"
              />
            </>
          ) : (
            <div
              aria-hidden
              className="relative z-20 flex aspect-[16/10] w-full items-center justify-center bg-muted"
            >
              <span className="font-display text-4xl text-muted-foreground/50">
                {initial}
              </span>
            </div>
          )}
        </button>
        <CardHeader>
          <CardAction>
            <Badge
              variant="outline"
              className="border-primary/35 bg-primary-soft text-primary"
            >
              v{character.versionNumber}
            </Badge>
          </CardAction>
          <CardTitle className="font-heading font-bold">
            {character.name}
          </CardTitle>
          {character.subtitle ? (
            <CardDescription>{character.subtitle}</CardDescription>
          ) : null}
        </CardHeader>
        <CardFooter className="flex flex-col items-start text-xs text-muted-foreground">
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
        </CardFooter>
      </Card>
    </CharacterContextMenu>
  )
}
