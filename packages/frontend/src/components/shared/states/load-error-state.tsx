import { RefreshCwIcon } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { Spinner } from "@workspace/ui/components/spinner"

import { useTranslation } from "@/lib/hooks/use-translation"

interface LoadErrorStateProps {
  message: string
  onRetry: () => void
  retrying?: boolean
}

export function LoadErrorState({
  message,
  onRetry,
  retrying = false,
}: LoadErrorStateProps) {
  const { t } = useTranslation()

  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-destructive/40 bg-destructive/5 px-6 py-10 text-center"
    >
      <p className="text-sm text-destructive">{message}</p>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onRetry}
        disabled={retrying}
      >
        {retrying ? <Spinner aria-label={t("common.loading")} /> : <RefreshCwIcon />}
        {t("common.retry")}
      </Button>
    </div>
  )
}
