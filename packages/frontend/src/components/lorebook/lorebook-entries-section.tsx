import { useRef } from "react"

import { SectionPanel } from "@/components/shared/card-first/section-panel"
import { useTranslation } from "@/lib/hooks/use-translation"

import { parseLorebookPayload } from "./character-form-fields"
import { LorebookEditor } from "./lorebook-editor"
import type { LorebookPageState } from "./use-lorebook-page"

export function LorebookEntriesSection({
  state,
}: {
  state: LorebookPageState
}) {
  const { t } = useTranslation()
  const {
    isEditing,
    name,
    description,
    scanDepth,
    tokenBudget,
    recursiveScanning,
    entries,
    setEntries,
    readOnly,
  } = state
  const fileInputRef = useRef<HTMLInputElement>(null)

  const applyImported = (payload: string) => {
    try {
      const imported = parseLorebookPayload(payload)
      setEntries(imported.entries)
      if (!isEditing) {
        state.setName(imported.name)
        state.setDescription(imported.description ?? "")
        if (imported.scanDepth !== undefined) state.setScanDepth(imported.scanDepth)
        if (imported.tokenBudget !== undefined) state.setTokenBudget(imported.tokenBudget)
        if (imported.recursiveScanning !== undefined) {
          state.setRecursiveScanning(imported.recursiveScanning)
        }
      }
    } catch {
      // Invalid JSON is ignored; the editor keeps its current value.
    }
  }

  return (
    <SectionPanel
      id="lorebook-entries"
      kicker={`03 · ${t("lorebooks.entries")}`}
      title={t("lorebooks.entries")}
      description={t("lorebooks.entriesHint", { count: entries.length })}
      actions={
        <span className="rm-chip">
          {t("lorebooks.entryCount", { count: entries.length })}
        </span>
      }
    >
      <LorebookEditor
        value={{
          name,
          description,
          scanDepth,
          tokenBudget,
          recursiveScanning,
          entries,
        }}
        showName={false}
        readOnly={readOnly}
        onChange={(value) => {
          state.setName(value.name)
          state.setDescription(value.description ?? "")
          state.setScanDepth(value.scanDepth ?? 4)
          state.setTokenBudget(value.tokenBudget ?? 400)
          state.setRecursiveScanning(value.recursiveScanning ?? false)
          setEntries(value.entries)
        }}
        onImportFile={(file) => {
          void file.text().then(applyImported)
        }}
        onImportRequest={() => fileInputRef.current?.click()}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) void file.text().then(applyImported)
          event.target.value = ""
        }}
      />
    </SectionPanel>
  )
}
