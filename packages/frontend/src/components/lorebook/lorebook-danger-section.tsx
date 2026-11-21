import { useState } from "react"
import { Trash2Icon } from "lucide-react"
import { toast } from "@workspace/ui/components/sonner"

import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { Spinner } from "@workspace/ui/components/spinner"

import { SectionPanel } from "@/components/shared/card-first/section-panel"
import { ApiClientError } from "@/lib/api/client"
import { deleteLorebook } from "@/lib/api/lorebooks"
import { useTranslation } from "@/lib/hooks/use-translation"

interface LorebookDangerSectionProps {
  lorebookId: string
  lorebookName: string | null
}

export function LorebookDangerSection({
  lorebookId,
  lorebookName,
}: LorebookDangerSectionProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDelete = async () => {
    setError(null)
    setDeleting(true)
    try {
      await deleteLorebook(lorebookId)
      toast.success(t("lorebooks.deleted"))
      globalThis.location.href = "/lorebooks"
    } catch (caught) {
      setError(
        caught instanceof ApiClientError
          ? caught.message
          : t("common.unknownError"),
      )
    } finally {
      setDeleting(false)
    }
  }

  return (
    <SectionPanel
      id="lorebook-danger"
      kicker={`06 · ${t("lorebooks.danger")}`}
      title={t("lorebooks.danger")}
    >
      <Button
        variant="outline"
        className="text-destructive"
        onClick={() => setOpen(true)}
      >
        <Trash2Icon className="size-4" />
        {t("lorebooks.delete")}
      </Button>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!next) setError(null)
          setOpen(next)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("lorebooks.deleteTitle")}</DialogTitle>
            <DialogDescription>
              {t("lorebooks.deleteWarning", {
                name: lorebookName ?? t("common.untitled"),
              })}
            </DialogDescription>
          </DialogHeader>

          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={deleting}
            >
              {t("common.cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={() => void handleDelete()}
              disabled={deleting}
            >
              {deleting ? <Spinner /> : <Trash2Icon className="size-4" />}
              {t("lorebooks.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SectionPanel>
  )
}
