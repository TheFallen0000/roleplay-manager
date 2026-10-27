import { Button } from "@workspace/ui/components/button"
import { Spinner } from "@workspace/ui/components/spinner"

import { useTranslation } from "@/lib/hooks/use-translation"

export function OlderMessagesControl({
  hasMore,
  isLoading,
  error,
  onLoad,
}: {
  hasMore: boolean
  isLoading: boolean
  error: string | null
  onLoad: () => void
}) {
  const { t } = useTranslation()

  if (!hasMore && !isLoading && !error) return null

  return (
    <div className="flex flex-col items-center gap-2 py-2" aria-live="polite">
      {isLoading ? (
        <span className="flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner />
          {t("chat.loadingOlder")}
        </span>
      ) : error ? (
        <div className="flex flex-col items-center gap-2">
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onLoad}
          >
            {t("chat.loadOlder")}
          </Button>
        </div>
      ) : (
        <Button type="button" variant="ghost" size="sm" onClick={onLoad}>
          {t("chat.loadOlder")}
        </Button>
      )}
    </div>
  )
}
