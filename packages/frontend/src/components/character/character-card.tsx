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
import { UsersIcon } from "lucide-react"
import { getCharacterAssetUrl } from "@/lib/api/client"
import {
  CHARACTER_ASSET_VARIANTS,
  getCharacterAssetVariantWidth,
} from "@workspace/shared/types/image"
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
      ? createImageSrcSet(
          character.id,
          character.profileImageAssetId!,
          character.profileImageDimensions.width,
        )
      : undefined

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
      <Card className="relative overflow-hidden pt-0 transition-shadow hover:shadow-md" size="sm">
        <button
          type="button"
          onClick={() => onImageClick(character)}
          className="block w-full cursor-pointer text-left"
          aria-label={t("characters.openMostRecent", { name: character.name })}
        >
          {imageSrc ? (
            <>
              <div className="absolute inset-0 z-30 aspect-video" />
              <img
                src={imageSrc}
                srcSet={imageSrcSet}
                sizes="(min-width: 64rem) calc((100vw - 20rem) / 3), (min-width: 48rem) calc((100vw - 19rem) / 2), (min-width: 40rem) calc((100vw - 3rem) / 2), calc(100vw - 2rem)"
                width={character.profileImageDimensions?.width}
                height={character.profileImageDimensions?.height}
                loading="lazy"
                decoding="async"
                alt={`${character.name} avatar`}
                className="relative z-20 aspect-video w-full object-cover"
              />
            </>
          ) : (
            <div className="relative z-20 flex aspect-video w-full items-center justify-center bg-muted">
              <UsersIcon className="size-10 text-muted-foreground" />
            </div>
          )}
        </button>
        <CardHeader>
          <CardAction>
            <Badge variant="secondary">v{character.versionNumber}</Badge>
          </CardAction>
          <CardTitle>{character.name}</CardTitle>
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

function createImageSrcSet(
  characterId: string,
  assetId: string,
  originalWidth: number,
): string {
  const candidates = new Map<number, string>()
  for (const variant of CHARACTER_ASSET_VARIANTS) {
    const width = getCharacterAssetVariantWidth(originalWidth, variant)
    if (!candidates.has(width)) {
      candidates.set(
        width,
        `${getCharacterAssetUrl(characterId, assetId, variant)} ${width}w`,
      )
    }
  }
  return [...candidates.values()].join(", ")
}
