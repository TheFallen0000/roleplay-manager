import type { PlayerCharacterDTO } from "@workspace/shared/types/player-character"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardTitle,
} from "@workspace/ui/components/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import { DownloadIcon, EllipsisIcon, PencilIcon, Trash2Icon } from "lucide-react"

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
      <CardFooter className="mt-auto justify-end">
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="ghost" size="sm" />}>
            <EllipsisIcon />
            {t("players.options")}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-44">
            <DropdownMenuItem onClick={() => onEdit(playerCharacter)}>
              <PencilIcon />
              {t("players.edit")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onExport(playerCharacter)}>
              <DownloadIcon />
              {t("players.export")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={() => onDelete(playerCharacter)}
            >
              <Trash2Icon />
              {t("players.delete")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardFooter>
    </Card>
  )
}
