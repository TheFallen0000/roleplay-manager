import { Button } from "@workspace/ui/components/button"

import { useTranslation } from "@/lib/hooks/use-translation"
import { MascotPose } from "../layout/brand"

export function CharacterNotFound({ error }: { error?: string | null }) {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border px-6 py-12 text-center">
      <MascotPose pose="sorry" className="h-28 w-28" />
      <div>
        <h2 className="font-heading text-lg font-bold">
          {t("characters.notFoundTitle")}
        </h2>
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
