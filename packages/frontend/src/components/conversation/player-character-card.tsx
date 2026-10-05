import { useEffect, useState } from "react"
import { toast } from "@workspace/ui/components/sonner"

import type { ConversationDetail } from "@workspace/shared/types/conversation"
import type { PlayerCharacterDTO } from "@workspace/shared/types/player-character"
import { Button } from "@workspace/ui/components/button"
import { Spinner } from "@workspace/ui/components/spinner"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"

import { listPlayerCharacters } from "@/lib/api/player-characters"
import { updateConversationSettings } from "@/lib/api/conversations"
import { ApiClientError } from "@/lib/api/client"
import { useTranslation } from "@/lib/hooks/use-translation"

const NONE = "none"

interface PlayerCharacterCardProps {
  conversation: ConversationDetail
  onSettingsChanged: (updated: ConversationDetail) => void
}

export function PlayerCharacterCard({
  conversation,
  onSettingsChanged,
}: PlayerCharacterCardProps) {
  const { t } = useTranslation()
  const [playerCharacters, setPlayerCharacters] = useState<PlayerCharacterDTO[]>(
    [],
  )
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [selected, setSelected] = useState<string>(
    conversation.playerCharacterId ?? NONE,
  )

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const items = await listPlayerCharacters()
        if (active) setPlayerCharacters(items)
      } catch {
        if (active) toast.error(t("settings.personaLoadFailed"))
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [t])

  const current = conversation.playerCharacterId ?? NONE
  const selectedPlayerCharacter = playerCharacters.find(
    (playerCharacter) => playerCharacter.id === selected,
  )
  const selectedLabel = loading
    ? t("settings.personaLoading")
    : (selectedPlayerCharacter?.name ?? t("settings.personaNone"))

  const handleSave = async () => {
    setSaving(true)
    try {
      const updated = await updateConversationSettings(conversation.id, {
        playerCharacterId: selected === NONE ? null : selected,
      })
      onSettingsChanged(updated)
      toast.success(t("players.saved"), {
        description: t("settings.personaSavedDescription"),
      })
    } catch (error) {
      toast.error(t("settings.personaSaveFailed"), {
        description:
          error instanceof ApiClientError
            ? `[${error.code}] ${error.message}`
            : "Error desconocido",
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-muted-foreground text-sm">
        {t("settings.personaHint")}
      </p>

      <Select
        value={selected}
        onValueChange={(value) => {
          if (value) setSelected(value)
        }}
        disabled={loading}
      >
        <SelectTrigger className="w-full" aria-label={t("settings.personaTitle")}>
          <SelectValue>{selectedLabel}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>{t("settings.personaNone")}</SelectItem>
          {playerCharacters.map((playerCharacter) => (
            <SelectItem key={playerCharacter.id} value={playerCharacter.id}>
              {playerCharacter.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {selectedPlayerCharacter ? (
        <p className="text-muted-foreground text-xs">
          {selectedPlayerCharacter.description}
        </p>
      ) : null}

      <div className="flex items-center justify-between gap-2">
        <a
          href="/player-characters"
          className="text-muted-foreground text-xs underline underline-offset-4"
        >
          {t("settings.personaManage")}
        </a>
        <Button
          onClick={handleSave}
          disabled={saving || loading || selected === current}
        >
          {saving ? <Spinner /> : null}
          {t("common.apply")}
        </Button>
      </div>
    </div>
  )
}
