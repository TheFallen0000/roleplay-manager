import { useRef } from "react"
import { DownloadIcon, PlusIcon, UploadIcon } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { Field, FieldLabel } from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"

import { useTranslation } from "@/lib/hooks/use-translation"

import { LorebookEntryForm } from "./lorebook-entry-form"

export interface LorebookEditorEntry {
  id?: string
  sourceId?: string | null
  name: string
  keys: string[]
  content: string
  secondaryKeys: string[]
  constant: boolean
  selective: boolean
  selectiveLogic: 0 | 1 | 2 | 3
  insertionOrder: number
  position: "before_char" | "after_char"
  priority: number
  enabled: boolean
  caseSensitive: boolean
  wholeWords: boolean
  comment: string | null
  rawPosition?: string | null
  order?: number
  extensions?: unknown
  unknownFields?: unknown
}

export interface LorebookEditorValue {
  name: string
  description?: string | null
  scanDepth?: number
  tokenBudget?: number
  recursiveScanning?: boolean
  extensions?: unknown
  unknownFields?: unknown
  entries: LorebookEditorEntry[]
}

interface LorebookEditorProps {
  value: LorebookEditorValue
  onChange: (value: LorebookEditorValue) => void
  onImportRequest?: () => void
  onImportFile?: (file: File) => void
  onExport?: () => void
  showName?: boolean
  readOnly?: boolean
}

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

export function LorebookEditor({
  value,
  onChange,
  onImportRequest,
  onImportFile,
  onExport,
  showName = true,
  readOnly = false,
}: LorebookEditorProps) {
  const { t } = useTranslation()
  const inputRef = useRef<HTMLInputElement>(null)

  const addEntry = () => {
    onChange({ ...value, entries: [...value.entries, emptyEntry()] })
  }

  const updateEntry = (index: number, entry: LorebookEditorEntry) => {
    onChange({
      ...value,
      entries: value.entries.map((item, itemIndex) =>
        itemIndex === index ? entry : item,
      ),
    })
  }

  const removeEntry = (index: number) => {
    onChange({
      ...value,
      entries: value.entries.filter((_, itemIndex) => itemIndex !== index),
    })
  }

  const requestImport = () => {
    if (onImportRequest) {
      onImportRequest()
      return
    }
    inputRef.current?.click()
  }

  return (
    <div className="flex flex-col gap-4">
      {showName ? (
        <Field>
          <FieldLabel htmlFor="lorebook-name">
            {t("characters.lorebookName")}
          </FieldLabel>
          <Input
            id="lorebook-name"
            value={value.name}
            placeholder={t("characters.lorebookNamePlaceholder")}
            disabled={readOnly}
            onChange={(event) => onChange({ ...value, name: event.target.value })}
          />
        </Field>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={addEntry}
          disabled={readOnly}
        >
          <PlusIcon />
          {t("characters.lorebookAddEntry")}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={requestImport}
          disabled={readOnly}
        >
          <UploadIcon />
          {t("characters.lorebookImport")}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onExport}
          disabled={readOnly}
        >
          <DownloadIcon />
          {t("characters.lorebookExport")}
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) onImportFile?.(file)
            event.target.value = ""
          }}
        />
      </div>

      {value.entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {t("characters.lorebookEmpty")}
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {value.entries.map((entry, index) => (
            <li key={entry.id ?? `${entry.name}-${index}`}>
              <LorebookEntryForm
                entry={entry}
                readOnly={readOnly}
                onChange={(next) => updateEntry(index, next)}
                onRemove={() => removeEntry(index)}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
