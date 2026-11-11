import {
  ArrowRightIcon,
  BookOpenIcon,
  FileJsonIcon,
  UserRoundIcon,
} from "lucide-react"

import type { Locale } from "@workspace/shared/i18n"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"

import { I18nProvider } from "@/lib/hooks/i18n-provider"
import { useTranslation } from "@/lib/hooks/use-translation"

interface CreateDialogProps {
  open: boolean
  locale: Locale
  onOpenChange: (open: boolean) => void
  onImportCard?: () => void
}

export function CreateDialog({
  open,
  locale,
  onOpenChange,
  onImportCard,
}: CreateDialogProps) {
  return (
    <I18nProvider initialLocale={locale}>
      <CreateDialogContent
        open={open}
        onOpenChange={onOpenChange}
        onImportCard={onImportCard}
      />
    </I18nProvider>
  )
}

function CreateDialogContent({
  open,
  onOpenChange,
  onImportCard,
}: Pick<CreateDialogProps, "open" | "onOpenChange" | "onImportCard">) {
  const { t } = useTranslation()

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next)
      }}
    >
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("createDialog.title")}</DialogTitle>
          <DialogDescription>{t("createDialog.description")}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-2">
          <a
            href="/characters/new"
            className="group flex flex-col gap-3 rounded-xl border bg-card p-5 transition-colors hover:border-primary/50 hover:bg-accent/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <span className="flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <UserRoundIcon className="size-5" />
            </span>
            <span className="flex flex-col gap-1">
              <span className="font-heading text-base font-semibold">
                {t("createDialog.character")}
              </span>
              <span className="text-sm text-muted-foreground">
                {t("createDialog.characterDescription")}
              </span>
            </span>
            <span className="mt-auto flex items-center gap-1 text-sm font-medium text-primary">
              {t("createDialog.character")}
              <ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-0.5" />
            </span>
          </a>

          <a
            href="/lorebooks/new"
            className="group flex flex-col gap-3 rounded-xl border bg-card p-5 transition-colors hover:border-primary/50 hover:bg-accent/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <span className="flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <BookOpenIcon className="size-5" />
            </span>
            <span className="flex flex-col gap-1">
              <span className="font-heading text-base font-semibold">
                {t("createDialog.lorebook")}
              </span>
              <span className="text-sm text-muted-foreground">
                {t("createDialog.lorebookDescription")}
              </span>
            </span>
            <span className="mt-auto flex items-center gap-1 text-sm font-medium text-primary">
              {t("createDialog.lorebook")}
              <ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-0.5" />
            </span>
          </a>
        </div>

        <div className="flex justify-center border-t pt-3">
          <a
            href="#import-card"
            onClick={(event) => {
              if (!onImportCard) return
              event.preventDefault()
              onImportCard()
            }}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            <FileJsonIcon className="size-4" />
            {t("createDialog.importCard")}
          </a>
        </div>
      </DialogContent>
    </Dialog>
  )
}
