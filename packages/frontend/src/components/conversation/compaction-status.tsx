import { useState } from "react"
import { Button } from "@workspace/ui/components/button"
import { AlertTriangle, Info, Loader2, X } from "lucide-react"

import { useChatStore } from "@/lib/stores/chat.store"
import { useTranslation } from "@/lib/hooks/use-translation"

/**
 * Status strip above the composer: automatic compaction progress, a trimming
 * warning, or the disabled state when the context window is unknown.
 */
export function CompactionStatus({
  contextWindow,
}: {
  contextWindow: number | null
}) {
  const { t } = useTranslation()
  const compacting = useChatStore((state) => state.compacting)
  const contextWarning = useChatStore((state) => state.contextWarning)
  const setContextWarning = useChatStore((state) => state.setContextWarning)
  const [dismissedUnknown, setDismissedUnknown] = useState(false)

  if (compacting) {
    return (
      <div
        role="status"
        className="flex items-center gap-2 border-b bg-muted/40 px-4 py-2 text-xs text-muted-foreground"
      >
        <Loader2 className="size-4 animate-spin" aria-hidden />
        {t("chat.compacting")}
      </div>
    )
  }

  if (contextWarning) {
    return (
      <div
        role="alert"
        className="flex items-start gap-2 border-b bg-amber-500/10 px-4 py-2 text-xs text-amber-800 dark:text-amber-300"
      >
        <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
        <span className="flex-1">{contextWarning}</span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-6 shrink-0"
          aria-label={t("chat.compactionDismiss")}
          onClick={() => setContextWarning(null)}
        >
          <X className="size-3.5" />
        </Button>
      </div>
    )
  }

  if (contextWindow === null && !dismissedUnknown) {
    return (
      <div
        role="status"
        className="flex items-start gap-2 border-b bg-muted/40 px-4 py-2 text-xs text-muted-foreground"
      >
        <Info className="mt-0.5 size-3.5 shrink-0" />
        <span className="flex-1">{t("chat.compactionWindowUnknown")}</span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-6 shrink-0"
          aria-label={t("chat.compactionDismiss")}
          onClick={() => setDismissedUnknown(true)}
        >
          <X className="size-3.5" />
        </Button>
      </div>
    )
  }

  return null
}
