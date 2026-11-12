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
      <DialogContent className="rm-create-dialog sm:max-w-2xl">
        <DialogHeader className="sr-only">
          <DialogTitle>{t("createDialog.title")}</DialogTitle>
          <DialogDescription>{t("createDialog.description")}</DialogDescription>
        </DialogHeader>

        <div className="rm-create-dialog-head">
          <h2>{t("createDialog.title")}</h2>
          <p>{t("createDialog.description")}</p>
        </div>

        <div className="rm-create-dialog-body">
          <div className="rm-create-plates">
            <a href="/characters/new" className="rm-create-plate">
              <span className="art">
                <UserRoundIcon aria-hidden="true" />
              </span>
              <span className="body">
                <span className="kicker">{t("createDialog.characterKicker")}</span>
                <h3>{t("createDialog.character")}</h3>
                <p>{t("createDialog.characterDescription")}</p>
              </span>
              <span className="go">
                {t("createDialog.characterAction")}
                <ArrowRightIcon className="size-4" aria-hidden="true" />
              </span>
            </a>

            <a href="/lorebooks/new" className="rm-create-plate">
              <span className="art">
                <BookOpenIcon aria-hidden="true" />
              </span>
              <span className="body">
                <span className="kicker">{t("createDialog.lorebookKicker")}</span>
                <h3>{t("createDialog.lorebook")}</h3>
                <p>{t("createDialog.lorebookDescription")}</p>
              </span>
              <span className="go">
                {t("createDialog.lorebookAction")}
                <ArrowRightIcon className="size-4" aria-hidden="true" />
              </span>
            </a>
          </div>
        </div>

        <div className="rm-create-dialog-foot">
          <span>{t("createDialog.footHint")}</span>
          {onImportCard ? (
            <a
              href="#import-card"
              onClick={(event) => {
                event.preventDefault()
                onImportCard()
              }}
            >
              <FileJsonIcon className="mr-1 inline size-4" aria-hidden="true" />
              {t("createDialog.importCard")}
            </a>
          ) : (
            <span className="inline-flex items-center gap-1 text-muted-foreground">
              <FileJsonIcon className="size-4" aria-hidden="true" />
              {t("createDialog.importCard")}
            </span>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
