import { useEffect, useState } from "react"
import { toast } from "@workspace/ui/components/sonner"

import type {
  PlayerCharacterDTO,
  UpdatePlayerCharacterInput,
} from "@workspace/shared/types/player-character"
import { Button } from "@workspace/ui/components/button"
import { Spinner } from "@workspace/ui/components/spinner"
import { Input } from "@workspace/ui/components/input"
import { Textarea } from "@workspace/ui/components/textarea"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { PencilIcon, PlusIcon, Trash2Icon, UserRoundIcon } from "lucide-react"

import {
  createPlayerCharacter,
  deletePlayerCharacter,
  listPlayerCharacters,
  updatePlayerCharacter,
} from "@/lib/api/player-characters"
import { ApiClientError } from "@/lib/api/client"

interface FormState {
  id: string | null
  name: string
  description: string
}

const EMPTY_FORM: FormState = { id: null, name: "", description: "" }

function errorMessage(error: unknown): string {
  return error instanceof ApiClientError
    ? `[${error.code}] ${error.message}`
    : "Error desconocido"
}

export function PlayerCharacterManager() {
  const [playerCharacters, setPlayerCharacters] = useState<PlayerCharacterDTO[]>(
    [],
  )
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState<FormState | null>(null)
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
        if (active) toast.error("No se pudieron cargar", {
          description: errorMessage(error),
        })
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [])

  const refresh = async () => {
    const items = await listPlayerCharacters()
    setPlayerCharacters(items)
  }

  const handleSave = async () => {
    if (!form) return
    if (!form.name.trim() || !form.description.trim()) {
      toast.error("Nombre y descripción son obligatorios")
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
        toast.success("Persona actualizada")
      } else {
        await createPlayerCharacter({
          name: input.name as string,
          description: input.description as string,
        })
        toast.success("Persona creada")
      }
      setForm(null)
      await refresh()
    } catch (error) {
      toast.error("No se pudo guardar", { description: errorMessage(error) })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await deletePlayerCharacter(deleteTarget.id)
      toast.success("Persona eliminada")
      setDeleteTarget(null)
      await refresh()
    } catch (error) {
      toast.error("No se pudo eliminar", { description: errorMessage(error) })
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
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Personajes jugados</h1>
          <p className="text-muted-foreground text-sm">
            A quién interpretas tú. La IA lo sabrá en las conversaciones donde lo
            elijas.
          </p>
        </div>
        <Button onClick={() => setForm(EMPTY_FORM)}>
          <PlusIcon />
          Crear persona
        </Button>
      </header>

      {playerCharacters.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed p-12 text-center">
          <UserRoundIcon className="text-muted-foreground size-8" />
          <p className="text-muted-foreground text-sm">
            Todavía no has creado ninguna persona. Crea una para que la IA sepa
            quién eres.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {playerCharacters.map((playerCharacter) => (
            <Card key={playerCharacter.id}>
              <CardHeader>
                <CardTitle>{playerCharacter.name}</CardTitle>
                <CardDescription>{playerCharacter.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setForm({
                      id: playerCharacter.id,
                      name: playerCharacter.name,
                      description: playerCharacter.description,
                    })
                  }
                >
                  <PencilIcon />
                  Editar
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDeleteTarget(playerCharacter)}
                >
                  <Trash2Icon />
                  Eliminar
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={form !== null} onOpenChange={(open) => !open && setForm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {form?.id ? "Editar persona" : "Nueva persona"}
            </DialogTitle>
            <DialogDescription>
              Nombre y descripción de tu personaje jugado. Sin versiones.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <Input
              value={form?.name ?? ""}
              onChange={(event) =>
                setForm((prev) =>
                  prev ? { ...prev, name: event.target.value } : prev,
                )
              }
              placeholder="Nombre"
              aria-label="Nombre"
              autoFocus
            />
            <Textarea
              value={form?.description ?? ""}
              onChange={(event) =>
                setForm((prev) =>
                  prev ? { ...prev, description: event.target.value } : prev,
                )
              }
              placeholder="Descripción"
              aria-label="Descripción"
              className="min-h-24 resize-none"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setForm(null)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Spinner /> : null}
              Guardar
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
            <DialogTitle>¿Eliminar persona?</DialogTitle>
            <DialogDescription>
              Se eliminará "{deleteTarget?.name}". Las conversaciones que la
              usaban se quedarán sin persona asignada.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Eliminar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
