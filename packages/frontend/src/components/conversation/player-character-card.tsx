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

const NONE = "none"

interface PlayerCharacterCardProps {
  conversation: ConversationDetail
  onSettingsChanged: (updated: ConversationDetail) => void
}

export function PlayerCharacterCard({
  conversation,
  onSettingsChanged,
}: PlayerCharacterCardProps) {
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
        if (active) toast.error("No se pudieron cargar los personajes jugados")
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [])

  const current = conversation.playerCharacterId ?? NONE
  const selectedPlayerCharacter = playerCharacters.find(
    (playerCharacter) => playerCharacter.id === selected,
  )
  const selectedLabel = loading
    ? "Cargando…"
    : (selectedPlayerCharacter?.name ?? "Ninguna")

  const handleSave = async () => {
    setSaving(true)
    try {
      const updated = await updateConversationSettings(conversation.id, {
        playerCharacterId: selected === NONE ? null : selected,
      })
      onSettingsChanged(updated)
      toast.success("Persona actualizada", {
        description: "Se aplicará en la próxima respuesta.",
      })
    } catch (error) {
      toast.error("No se pudo guardar la persona", {
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
        Elige a quién interpretas en esta conversación. La IA lo incluirá en el
        contexto y se dirigirá a ti en consecuencia.
      </p>

      <Select
        value={selected}
        onValueChange={(value) => {
          if (value) setSelected(value)
        }}
        disabled={loading}
      >
        <SelectTrigger className="w-full" aria-label="Persona">
          <SelectValue>{selectedLabel}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>Ninguna</SelectItem>
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
          href="/settings/player-characters"
          className="text-muted-foreground text-xs underline underline-offset-4"
        >
          Gestionar personajes jugados
        </a>
        <Button
          onClick={handleSave}
          disabled={saving || loading || selected === current}
        >
          {saving ? <Spinner /> : null}
          Aplicar
        </Button>
      </div>
    </div>
  )
}
