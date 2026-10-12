import { LightbulbIcon } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"

import { useTranslation } from "@/lib/hooks/use-translation"
import type { TutorialEntry } from "@/lib/tutorials/catalog"

export interface TutorialDialogProps {
  entry: TutorialEntry | null
  onClose: () => void
}

export function TutorialDialog({ entry, onClose }: TutorialDialogProps) {
  const { t } = useTranslation()

  return (
    <Dialog
      open={entry !== null}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogContent className="max-h-[85dvh] overflow-y-auto overscroll-contain sm:max-w-lg">
        {entry ? (
          <>
            <DialogHeader className="pr-8">
              <DialogTitle>{entry.content.title}</DialogTitle>
              <DialogDescription>{entry.content.description}</DialogDescription>
            </DialogHeader>

            <ol className="flex flex-col gap-4">
              {entry.content.steps.map((step, index) => (
                <li key={step.title} className="flex gap-3">
                  <span
                    aria-hidden
                    className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-semibold text-primary tabular-nums"
                  >
                    {index + 1}
                  </span>
                  <span className="flex flex-col gap-1">
                    <span className="text-sm font-medium">{step.title}</span>
                    <span className="text-sm text-muted-foreground">
                      {step.body}
                    </span>
                  </span>
                </li>
              ))}
            </ol>

            <div className="flex flex-col gap-2 rounded-lg border bg-muted/40 p-3">
              <span className="flex items-center gap-2 text-sm font-medium">
                <LightbulbIcon aria-hidden className="size-4 text-primary" />
                {t("tutorials.tipsTitle")}
              </span>
              <ul className="flex list-disc flex-col gap-1 pl-5 text-sm text-muted-foreground">
                {entry.content.tips.map((tip) => (
                  <li key={tip}>{tip}</li>
                ))}
              </ul>
            </div>

            {entry.content.action ? (
              <DialogFooter>
                <Button render={<a href={entry.content.action.href} />}>
                  {entry.content.action.label}
                </Button>
              </DialogFooter>
            ) : null}
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
