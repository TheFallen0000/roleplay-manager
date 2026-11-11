import { useTranslation } from "@/lib/hooks/use-translation"

interface CreatorNotesPanelProps {
  notes: string | null
}

export function CreatorNotesPanel({ notes }: CreatorNotesPanelProps) {
  const { t } = useTranslation()
  const hasNotes = notes !== null && notes.trim() !== ""

  return (
    <section className="flex flex-col gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
      <h3 className="text-sm font-medium">{t("characters.creatorNotesTitle")}</h3>
      <p className="text-xs text-amber-700 dark:text-amber-400">
        {t("characters.creatorNotesWarning")}
      </p>
      {hasNotes ? (
        <p className="whitespace-pre-wrap break-words text-sm">{notes}</p>
      ) : (
        <p className="text-sm text-muted-foreground">
          {t("characters.creatorNotesEmpty")}
        </p>
      )}
    </section>
  )
}
