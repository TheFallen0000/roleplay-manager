import type { PlayerCharacterDTO } from "@workspace/shared/types/player-character"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardTitle,
} from "@workspace/ui/components/card"
import { PencilIcon, Trash2Icon, DownloadIcon } from "lucide-react"

import { useTranslation } from "@/lib/hooks/use-translation"

export interface PlayerCharacterCardProps {
  playerCharacter: PlayerCharacterDTO
  onEdit: (playerCharacter: PlayerCharacterDTO) => void
  onDelete: (playerCharacter: PlayerCharacterDTO) => void
  onExport: (playerCharacter: PlayerCharacterDTO) => void
}

/** Persona plate: monogram, name and description with its actions on a hairline footer. */
export function PlayerCharacterCard({
  playerCharacter,
  onEdit,
  onDelete,
  onExport,
}: PlayerCharacterCardProps) {
  const { t } = useTranslation()
  const initial =
    Array.from(playerCharacter.name.trim())[0]?.toUpperCase() ?? "?"

  return (
    <Card size="sm" className="h-full">
      <CardContent className="flex items-start gap-3">
        <span
          aria-hidden
          className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-muted"
        >
          <span className="font-display text-xl text-muted-foreground/60">
            {initial}
          </span>
        </span>
        <div className="flex min-w-0 flex-col items-start gap-1">
          <CardTitle>{playerCharacter.name}</CardTitle>
          <CardDescription className="line-clamp-3">
            {playerCharacter.description}
          </CardDescription>
        </div>
      </CardContent>
      <CardFooter className="mt-auto justify-end gap-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onEdit(playerCharacter)}
        >
          <PencilIcon />
          {t("players.edit")}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onExport(playerCharacter)}
        >
          <DownloadIcon />
          {t("players.export")}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-destructive"
          onClick={() => onDelete(playerCharacter)}
        >
          <Trash2Icon />
          {t("players.delete")}
        </Button>
      </CardFooter>
    </Card>
  )
}
