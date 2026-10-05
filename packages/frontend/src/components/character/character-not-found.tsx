import { Button } from "@workspace/ui/components/button"
import { AlertCircleIcon } from "lucide-react"

import { useTranslation } from "@/lib/hooks/use-translation"

export function CharacterNotFound({ error }: { error?: string | null }) {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed p-12 text-center">
      <AlertCircleIcon className="size-8 text-muted-foreground" />
      <div>
        <h2 className="text-lg font-semibold">{t("characters.notFoundTitle")}</h2>
        {error ? (
          <p className="text-muted-foreground text-sm">{error}</p>
        ) : (
          <p className="text-muted-foreground text-sm">
            {t("characters.notFoundDescription")}
          </p>
        )}
      </div>
      <Button render={<a href="/" />} variant="outline" nativeButton={false}>
        {t("characters.backToList")}
      </Button>
    </div>
  )
}
