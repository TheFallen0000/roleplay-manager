import { useEffect, useState } from "react"
import { toast } from "@workspace/ui/components/sonner"

import type { PlayerCharacterExport } from "@workspace/shared/types/export"
import type {
  PlayerCharacterDTO,
  UpdatePlayerCharacterInput,
} from "@workspace/shared/types/player-character"
import { Button } from "@workspace/ui/components/button"
import { Spinner } from "@workspace/ui/components/spinner"
import { Input } from "@workspace/ui/components/input"
import { Textarea } from "@workspace/ui/components/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { PlusIcon, UploadIcon } from "lucide-react"

import { MascotPose } from "@/components/layout/brand"
import {
  createPlayerCharacter,
  deletePlayerCharacter,
  listPlayerCharacters,
  updatePlayerCharacter,
} from "@/lib/api/player-characters"
import { useTranslation } from "@/lib/hooks/use-translation"
import { I18nProvider } from "@/lib/hooks/i18n-provider"
import type { Locale } from "@workspace/shared/i18n"
import { downloadJson } from "@/lib/download-json"
import {
  buildPlayerCharacterExport,
  playerCharacterExportFilename,
} from "@/lib/player-character-export"
import { translateApiError } from "@/lib/translate-api-error"
import { ImportPlayerCharacterDialog } from "./import-player-character-dialog"
import { PlayerCharacterCard } from "./player-character-card"

interface FormState {
  id: string | null
  name: string
  description: string
}

const EMPTY_FORM: FormState = { id: null, name: "", description: "" }

export function PlayerCharacterManager({ locale }: { locale: Locale }) {
  return (
    <I18nProvider initialLocale={locale}>
      <PlayerCharacterManagerContent />
    </I18nProvider>
  )
}

function PlayerCharacterManagerContent() {
  const { t, tRaw } = useTranslation()

  const [playerCharacters, setPlayerCharacters] = useState<PlayerCharacterDTO[]>(
    [],
  )
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState<FormState | null>(null)
  const [importOpen, setImportOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<PlayerCharacterDTO | null>(
    null,
  )

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const items = await listPlayerCharacters()
        if (active) setPlayerCharacters(items)
      } catch (error) {
        if (active) {
          toast.error(t("players.loadFailed"), {
            description: translateApiError(error, tRaw, t("common.unknownError")),
          })
        }
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [t, tRaw])

  const refresh = async () => {
    const items = await listPlayerCharacters()
    setPlayerCharacters(items)
  }

  const handleSave = async () => {
    if (!form) return
    if (!form.name.trim() || !form.description.trim()) {
      toast.error(t("players.required"))
      return
    }

    setSaving(true)
    try {
      const input: UpdatePlayerCharacterInput = {
        name: form.name.trim(),
        description: form.description.trim(),
      }
      if (form.id) {
        await updatePlayerCharacter(form.id, input)
        toast.success(t("players.saved"))
      } else {
        await createPlayerCharacter({
          name: input.name as string,
          description: input.description as string,
        })
        toast.success(t("players.created"))
      }
      setForm(null)
      await refresh()
    } catch (error) {
      toast.error(t("players.saveFailed"), {
        description: translateApiError(error, tRaw, t("common.unknownError")),
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await deletePlayerCharacter(deleteTarget.id)
      toast.success(t("players.deleted"))
      setDeleteTarget(null)
      await refresh()
    } catch (error) {
      toast.error(t("players.deleteFailed"), {
        description: translateApiError(error, tRaw, t("common.unknownError")),
      })
    }
  }

  const handleExport = (playerCharacter: PlayerCharacterDTO) => {
    try {
      downloadJson(
        playerCharacterExportFilename(
          playerCharacter.name,
          t("players.slugFallback"),
        ),
        buildPlayerCharacterExport(playerCharacter),
      )
      toast.success(t("players.exportDone"))
    } catch {
      toast.error(t("players.exportFailed"))
    }
  }

  const handleImport = async (
    payload: PlayerCharacterExport,
  ): Promise<{ ok: boolean; error?: string }> => {
    try {
      const imported = await createPlayerCharacter({
        name: payload.playerCharacter.name.trim(),
        description: payload.playerCharacter.description.trim(),
      })
      await refresh()
      toast.success(t("players.imported", { name: imported.name }))
      return { ok: true }
    } catch (error) {
      return {
        ok: false,
        error: translateApiError(error, tRaw, t("players.importFailed")),
      }
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="font-heading text-3xl font-black tracking-tight">
            {t("players.title")}
          </h1>
          <p className="text-sm text-muted-foreground">{t("players.subtitle")}</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button variant="outline" onClick={() => setImportOpen(true)}>
            <UploadIcon />
            {t("players.import")}
          </Button>
          <Button onClick={() => setForm(EMPTY_FORM)}>
            <PlusIcon />
            {t("players.create")}
          </Button>
        </div>
      </header>

      {playerCharacters.length === 0 ? (
        <div className="flex flex-col items-center gap-5 rounded-2xl border border-dashed border-border bg-card/50 px-6 py-14 text-center">
          <MascotPose pose="hello" className="h-36 w-36" />
          <div className="grid gap-1.5">
            <h2 className="font-heading text-xl font-bold">
              {t("players.emptyTitle")}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t("players.emptyDescription")}
            </p>
          </div>
          <Button onClick={() => setForm(EMPTY_FORM)}>
            <PlusIcon />
            {t("players.create")}
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 items-stretch gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {playerCharacters.map((playerCharacter) => (
            <PlayerCharacterCard
              key={playerCharacter.id}
              playerCharacter={playerCharacter}
              onEdit={(persona) =>
                setForm({
                  id: persona.id,
                  name: persona.name,
                  description: persona.description,
                })
              }
              onExport={handleExport}
              onDelete={setDeleteTarget}
            />
          ))}
        </div>
      )}

      <Dialog open={form !== null} onOpenChange={(open) => !open && setForm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {form?.id ? t("players.editTitle") : t("players.createTitle")}
            </DialogTitle>
            <DialogDescription>{t("players.formDescription")}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <Input
              value={form?.name ?? ""}
              onChange={(event) =>
                setForm((prev) =>
                  prev ? { ...prev, name: event.target.value } : prev,
                )
              }
              placeholder={t("players.namePlaceholder")}
              aria-label={t("players.namePlaceholder")}
              autoFocus
            />
            <Textarea
              value={form?.description ?? ""}
              onChange={(event) =>
                setForm((prev) =>
                  prev ? { ...prev, description: event.target.value } : prev,
                )
              }
              placeholder={t("players.descriptionPlaceholder")}
              aria-label={t("players.descriptionPlaceholder")}
              className="min-h-24 resize-none"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setForm(null)}
              disabled={saving}
            >
              {t("common.cancel")}
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Spinner /> : null}
              {t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("players.deleteTitle")}</DialogTitle>
            <DialogDescription>
              {t("players.deleteDescription", { name: deleteTarget?.name ?? "" })}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              {t("common.cancel")}
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              {t("common.delete")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ImportPlayerCharacterDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onImport={handleImport}
      />
    </div>
  )
}
