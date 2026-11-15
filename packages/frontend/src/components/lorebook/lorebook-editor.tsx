import { useRef } from "react"
import {
  ChevronDownIcon,
  PlusIcon,
  Trash2Icon,
  UploadIcon,
} from "lucide-react"

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
        <button
          type="button"
          className="rm-btn rm-btn--ghost rm-btn--sm"
          onClick={addEntry}
          disabled={readOnly}
        >
          <PlusIcon className="size-4" />
          {t("characters.lorebookAddEntry")}
        </button>
        <button
          type="button"
          className="rm-btn rm-btn--ghost rm-btn--sm"
          onClick={requestImport}
          disabled={readOnly}
        >
          <UploadIcon className="size-4" />
          {t("characters.lorebookImport")}
        </button>

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
        <div className="rm-empty">
          <h2>{t("characters.lorebookEmpty")}</h2>
          <p>{t("lorebooks.entriesEmptyHint")}</p>
        </div>
      ) : (
        <ul className="rm-entry-list">
          {value.entries.map((entry, index) => {
            const label =
              entry.name.trim() ||
              entry.comment?.trim() ||
              t("characters.lorebookEntryFallback")
            return (
              <li key={entry.id ?? `${entry.name}-${index}`}>
                <details className="rm-entry" open={index === 0}>
                  <summary className="rm-entry-summary">
                    <span className="rm-entry-title">{label}</span>
                    {entry.keys.length > 0 ? (
                      <span className="rm-chip-list">
                        {entry.keys.slice(0, 5).map((key) => (
                          <span key={key} className="rm-chip">
                            {key}
                          </span>
                        ))}
                      </span>
                    ) : null}
                    {entry.constant ? (
                      <span className="rm-chip rm-chip--violet">
                        {t("characters.lorebookConstant")}
                      </span>
                    ) : null}
                    <ChevronDownIcon
                      className="rm-entry-chevron size-4"
                      aria-hidden="true"
                    />
                    {readOnly ? null : (
                      <button
                        type="button"
                        className="rm-btn rm-btn--quiet rm-btn--icon rm-btn--sm"
                        aria-label={t("characters.lorebookRemoveEntry")}
                        onClick={(event) => {
                          event.preventDefault()
                          event.stopPropagation()
                          removeEntry(index)
                        }}
                      >
                        <Trash2Icon className="size-4" />
                      </button>
                    )}
                  </summary>
                  <div className="rm-entry-body">
                    <LorebookEntryForm
                      entry={entry}
                      readOnly={readOnly}
                      hideHeader
                      onChange={(next) => updateEntry(index, next)}
                      onRemove={() => removeEntry(index)}
                    />
                  </div>
                </details>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
