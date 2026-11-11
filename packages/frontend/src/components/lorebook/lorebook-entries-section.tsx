import { useRef } from "react"
import { PlusIcon, Trash2Icon } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Textarea } from "@workspace/ui/components/textarea"

import { useTranslation } from "@/lib/hooks/use-translation"

import {
  parseLorebookPayload,
} from "./character-form-fields"
import { LorebookEditor, type LorebookEditorEntry } from "./lorebook-editor"
import type { LorebookPageState } from "./use-lorebook-page"

const splitKeys = (value: string): string[] =>
  value
    .split(",")
    .map((key) => key.trim())
    .filter((key) => key !== "")

const emptyEntry = (): LorebookEditorEntry => ({
  id: crypto.randomUUID(),
  name: "",
  keys: [],
  content: "",
  secondaryKeys: [],
  constant: false,
  selective: false,
  selectiveLogic: 0,
  insertionOrder: 100,
  position: "after_char",
  priority: 0,
  enabled: true,
  caseSensitive: false,
  wholeWords: false,
  comment: null,
})

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

  const addEntry = () => setEntries([...entries, emptyEntry()])
  const removeEntry = (index: number) =>
    setEntries(entries.filter((_, itemIndex) => itemIndex !== index))
  const updateEntry = (index: number, entry: LorebookEditorEntry) =>
    setEntries(
      entries.map((item, itemIndex) => (itemIndex === index ? entry : item)),
    )

  return (
    <section
      id="lorebook-entries"
      aria-labelledby="lorebook-entries-heading"
      className="flex scroll-mt-24 flex-col gap-4"
    >
      <h2
        id="lorebook-entries-heading"
        className="font-heading text-lg font-semibold"
      >
        {t("lorebooks.entries")}
      </h2>

      {isEditing ? (
        <>
          {entries.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("lorebooks.entriesEmpty")}
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {entries.map((entry, index) => (
                <li
                  key={entry.id ?? `${entry.name}-${index}`}
                  className="flex flex-col gap-2 rounded-xl border p-3"
                >
                  <Input
                    value={entry.name}
                    placeholder={t("characters.lorebookEntryName")}
                    disabled={readOnly}
                    onChange={(event) =>
                      updateEntry(index, { ...entry, name: event.target.value })
                    }
                  />
                  <Input
                    value={entry.keys.join(", ")}
                    placeholder={t("characters.lorebookKeysLabel")}
                    disabled={readOnly}
                    onChange={(event) =>
                      updateEntry(index, {
                        ...entry,
                        keys: splitKeys(event.target.value),
                      })
                    }
                  />
                  <Textarea
                    value={entry.content}
                    placeholder={t("characters.lorebookEntryContent")}
                    disabled={readOnly}
                    onChange={(event) =>
                      updateEntry(index, { ...entry, content: event.target.value })
                    }
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={readOnly}
                    onClick={() => removeEntry(index)}
                  >
                    <Trash2Icon />
                    {t("lorebooks.removeEntry")}
                  </Button>
                </li>
              ))}
            </ul>
          )}
          <Button
            type="button"
            variant="outline"
            disabled={readOnly}
            onClick={addEntry}
          >
            <PlusIcon />
            {t("characters.lorebookAddEntry")}
          </Button>
        </>
      ) : (
        <>
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
        </>
      )}
    </section>
  )
}
