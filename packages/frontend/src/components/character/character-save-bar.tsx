import { Button } from "@workspace/ui/components/button"

import { useTranslation } from "@/lib/hooks/use-translation"

import type { CharacterPageState } from "./use-character-page"

export function CharacterSaveBar({ state }: { state: CharacterPageState }) {
  const { t } = useTranslation()
  const { isEditing, saving, dirty, save, saveError } = state

  return (
    <div className="sticky bottom-0 z-10 -mx-4 mt-2 flex flex-col gap-2 border-t bg-background/90 px-4 py-3 backdrop-blur-sm sm:mx-0 sm:flex-row sm:items-center sm:justify-between sm:rounded-lg sm:border">
      <div className="min-w-0 text-xs text-muted-foreground">
        {isEditing ? <p>{t("characters.saveCreatesVersion")}</p> : null}
        {saveError ? (
          <p role="alert" className="text-destructive">
            {saveError}
          </p>
        ) : null}
      </div>
      <Button
        onClick={() => void save()}
        disabled={saving || (isEditing && !dirty)}
      >
        {saving ? t("common.loading") : t("characters.save")}
      </Button>
    </div>
  )
}
