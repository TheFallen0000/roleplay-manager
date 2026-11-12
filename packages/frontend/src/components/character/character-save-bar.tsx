import { useTranslation } from "@/lib/hooks/use-translation"

import type { CharacterPageState } from "./use-character-page"

export function CharacterSaveBar({ state }: { state: CharacterPageState }) {
  const { t } = useTranslation()
  const { isEditing, saving, dirty, save, saveError } = state

  return (
    <div className="rm-save-bar" data-dirty={dirty ? "true" : "false"}>
      <div className="rm-save-status" data-dirty={dirty ? "true" : "false"}>
        <span className={dirty ? "dot is-dirty" : "dot"} />
        <span>
          {dirty
            ? t("characters.unsavedChanges")
            : t("characters.allSaved")}
        </span>
        {isEditing ? (
          <span className="hidden text-xs text-muted-foreground sm:inline">
            · {t("characters.saveCreatesVersion")}
          </span>
        ) : null}
      </div>
      <div className="rm-save-actions">
        {saveError ? (
          <p role="alert" className="text-xs text-destructive">
            {saveError}
          </p>
        ) : null}
        <button
          type="button"
          className="rm-btn"
          onClick={() => void save()}
          disabled={saving || (isEditing && !dirty)}
        >
          {saving ? t("common.loading") : t("characters.save")}
        </button>
      </div>
    </div>
  )
}
