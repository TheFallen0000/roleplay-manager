import { useEffect, useState } from "react"
import { UserRoundPlusIcon } from "lucide-react"
import { toast } from "@workspace/ui/components/sonner"

import type { CharacterSummary } from "@workspace/shared/types/character"
import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { Label } from "@workspace/ui/components/label"
import { Spinner } from "@workspace/ui/components/spinner"

import { listCharactersPage } from "@/lib/api/characters"
import { ApiClientError } from "@/lib/api/client"
import { linkLorebook } from "@/lib/api/lorebooks"
import { useTranslation } from "@/lib/hooks/use-translation"

interface LorebookLinkDialogProps {
  open: boolean
  lorebookId: string
  versionId: string
  onOpenChange: (open: boolean) => void
  onLinked?: () => void
}

export function LorebookLinkDialog({
  open,
  lorebookId,
  versionId,
  onOpenChange,
  onLinked,
}: LorebookLinkDialogProps) {
  const { t } = useTranslation()
  const [characters, setCharacters] = useState<CharacterSummary[]>([])
  const [characterId, setCharacterId] = useState("")
  const [loading, setLoading] = useState(false)
  const [linking, setLinking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    let active = true
    setLoading(true)
    setError(null)
    listCharactersPage({ limit: 200 })
      .then((page) => {
        if (active) setCharacters(page.characters)
      })
      .catch(() => {
        if (active) setError(t("characters.loadFailed"))
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [open, t])

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setCharacterId("")
      setError(null)
    }
    onOpenChange(next)
  }

  const handleLink = async () => {
    const character = characters.find((item) => item.id === characterId)
    if (!character) return
    setError(null)
    setLinking(true)
    try {
      await linkLorebook(lorebookId, { characterId, versionId })
      toast.success(t("lorebooks.linked", { name: character.name }))
      onLinked?.()
      handleOpenChange(false)
    } catch (caught) {
      if (
        caught instanceof ApiClientError &&
        caught.code === "LOREBOOK_LINK_UNCHANGED"
      ) {
        toast.error(t("lorebooks.linkUnchanged"))
      } else {
        setError(
          caught instanceof ApiClientError
            ? caught.message
            : t("characters.loadFailed"),
        )
      }
    } finally {
      setLinking(false)
    }
  }

  const busy = loading || linking

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("lorebooks.link")}</DialogTitle>
          <DialogDescription>{t("lorebooks.linkCreatesVersion")}</DialogDescription>
        </DialogHeader>

        <div className="rm-field">
          <Label htmlFor="lorebook-link-character">
            {t("createDialog.character")}
          </Label>
          <select
            id="lorebook-link-character"
            value={characterId}
            onChange={(event) => setCharacterId(event.target.value)}
            disabled={busy}
          >
            <option value="">{t("createDialog.character")}</option>
            {characters.map((character) => (
              <option key={character.id} value={character.id}>
                {character.name}
              </option>
            ))}
          </select>
        </div>

        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={busy}
          >
            {t("common.cancel")}
          </Button>
          <Button onClick={() => void handleLink()} disabled={busy || !characterId}>
            {linking ? <Spinner /> : <UserRoundPlusIcon className="size-4" />}
            {t("lorebooks.linkToCharacter")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
