import type { CharacterVersionDTO } from "@workspace/shared/types/character"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"

import { useTranslation } from "@/lib/hooks/use-translation"

interface VersionPreviewDialogProps {
  version: CharacterVersionDTO | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function VersionPreviewDialog({
  version,
  open,
  onOpenChange,
}: VersionPreviewDialogProps) {
  const { t } = useTranslation()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {t("characters.versionPreviewTitle", {
              number: version?.versionNumber ?? 0,
            })}
          </DialogTitle>
          <DialogDescription>
            {t("characters.versionPreviewDescription")}
          </DialogDescription>
        </DialogHeader>

        {version ? (
          <div className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto pr-1">
            <div className="rm-field-grid">
              <div className="rm-field">
                <span className="label">{t("characters.fieldName")}</span>
                <p>{version.name}</p>
              </div>
              <div className="rm-field">
                <span className="label">{t("characters.fieldSubtitle")}</span>
                <p>{version.subtitle || "—"}</p>
              </div>
            </div>
            <div className="rm-field">
              <span className="label">{t("characters.fieldGreeting")}</span>
              <p className="whitespace-pre-wrap">{version.greeting}</p>
            </div>
            <div className="rm-field">
              <span className="label">{t("characters.fieldDescription")}</span>
              <p className="whitespace-pre-wrap">{version.description}</p>
            </div>
            {version.cards.length > 0 ? (
              <div className="rm-field">
                <span className="label">{t("characters.sectionFichas")}</span>
                <ul className="rm-ficha-list">
                  {version.cards.map((card) => (
                    <li key={card.id} className="rm-ficha">
                      <span className="handle" aria-hidden="true">
                        {card.position + 1}
                      </span>
                      <div>
                        <p className="title">{card.title}</p>
                        <p className="text">{card.content}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            <div className="rm-kv">
              <span className="k">{t("characters.sectionLorebook")}</span>
              <span className="v">
                {version.lorebookVersion
                  ? `${version.lorebookVersion.name ?? t("common.untitled")} v${version.lorebookVersion.versionNumber}`
                  : t("characters.lorebookNone")}
              </span>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
