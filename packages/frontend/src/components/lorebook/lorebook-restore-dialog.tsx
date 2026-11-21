import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { Button } from "@workspace/ui/components/button"

import type {
  ImportLorebookAction,
  ImportLorebookPreview,
} from "@workspace/shared/types/lorebook"

import { useTranslation } from "@/lib/hooks/use-translation"

const ACTION_LABEL_KEYS = {
  restore: "lorebooks.restoreHistory",
  "new-version": "lorebooks.createNewVersion",
  reuse: "lorebooks.reuse",
  "new-book": "lorebooks.createNewBook",
} as const

interface LorebookRestoreDialogProps {
  open: boolean
  preview: ImportLorebookPreview
  onOpenChange: (open: boolean) => void
  onConfirm: (action: ImportLorebookAction) => void
}

export function LorebookRestoreDialog({
  open,
  preview,
  onOpenChange,
  onConfirm,
}: LorebookRestoreDialogProps) {
  const { t } = useTranslation()
  const book = preview.book

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("lorebooks.importPreview")}</DialogTitle>
          <DialogDescription>{t("lorebooks.restoreHint")}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2 text-sm">
          {book ? (
            <>
              <p className="font-medium">{book.name ?? t("common.untitled")}</p>
              {book.usedByCharacters !== undefined ? (
                <p className="text-muted-foreground">
                  {t("lorebooks.usageCharacters", {
                    count: book.usedByCharacters,
                  })}
                </p>
              ) : null}
            </>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button onClick={() => onConfirm(preview.suggestedAction)}>
            {t(ACTION_LABEL_KEYS[preview.suggestedAction])}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
