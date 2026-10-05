import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { Button } from "@workspace/ui/components/button"

import { useTranslation } from "@/lib/hooks/use-translation"

interface ChatConfirmDialogsProps {
  confirmDelete: string | null
  confirmRewind: string | null
  affectedSummariesCount: number
  onCloseDelete: () => void
  onCloseRewind: () => void
  onConfirmDelete: () => void
  onConfirmRewind: () => void
}

export function ChatConfirmDialogs({
  confirmDelete,
  confirmRewind,
  affectedSummariesCount,
  onCloseDelete,
  onCloseRewind,
  onConfirmDelete,
  onConfirmRewind,
}: ChatConfirmDialogsProps) {
  const { t } = useTranslation()

  return (
    <>
      <Dialog open={confirmDelete !== null} onOpenChange={onCloseDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("chat.confirmDeleteTitle")}</DialogTitle>
            <DialogDescription>
              {t("chat.confirmDeleteDescription")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={onCloseDelete}>
              {t("common.cancel")}
            </Button>
            <Button variant="destructive" onClick={onConfirmDelete}>
              {t("common.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmRewind !== null} onOpenChange={onCloseRewind}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("chat.confirmRewindTitle")}</DialogTitle>
            <DialogDescription>
              {t("chat.confirmRewindDescription")}
            </DialogDescription>
            {affectedSummariesCount > 0 && (
              <p className="text-sm text-muted-foreground">
                {t("chat.confirmRewindSummaries", {
                  count: affectedSummariesCount,
                })}
              </p>
            )}
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={onCloseRewind}>
              {t("common.cancel")}
            </Button>
            <Button variant="destructive" onClick={onConfirmRewind}>
              {t("chat.confirmRewind")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
