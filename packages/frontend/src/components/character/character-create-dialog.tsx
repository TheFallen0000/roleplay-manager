import { translate } from "@workspace/shared/i18n"
import type { CharacterDetail } from "@workspace/shared/types/character"
import type { Locale } from "@workspace/shared/i18n"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@workspace/ui/components/dialog"

import { CharacterForm } from "./character-form"

interface CharacterCreateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  locale: Locale
  onCreated?: (character: CharacterDetail) => void
}

export function CharacterCreateDialog({
  open,
  onOpenChange,
  locale,
  onCreated,
}: CharacterCreateDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90svh] max-w-3xl overflow-y-auto">
        <DialogTitle>{translate(locale, "characters.createTitle")}</DialogTitle>
        <DialogDescription className="sr-only">
          {translate(locale, "characters.newTitle")}
        </DialogDescription>
        <CharacterForm locale={locale} onCreated={onCreated} />
      </DialogContent>
    </Dialog>
  )
}
