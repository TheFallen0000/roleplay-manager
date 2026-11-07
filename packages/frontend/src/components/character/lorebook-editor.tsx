import { useRef } from "react"
import { PlusIcon, UploadIcon } from "lucide-react"

import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Field, FieldLabel } from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"

import { useTranslation } from "@/lib/hooks/use-translation"

export interface LorebookEditorEntry {
  id?: string
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
}

export interface LorebookEditorValue {
  name: string
  entries: LorebookEditorEntry[]
}

interface LorebookEditorProps {
  value: LorebookEditorValue
  onChange: (value: LorebookEditorValue) => void
  onImportRequest?: () => void
  onImportFile?: (file: File) => void
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
}: LorebookEditorProps) {
  const { t } = useTranslation()
  const inputRef = useRef<HTMLInputElement>(null)

  const addEntry = () => {
    onChange({ ...value, entries: [...value.entries, emptyEntry()] })
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
      <Field>
        <FieldLabel htmlFor="lorebook-name">
          {t("characters.lorebookName")}
        </FieldLabel>
        <Input
          id="lorebook-name"
          value={value.name}
          placeholder={t("characters.lorebookNamePlaceholder")}
          onChange={(event) => onChange({ ...value, name: event.target.value })}
        />
      </Field>

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" onClick={addEntry}>
          <PlusIcon />
          {t("characters.lorebookAddEntry")}
        </Button>
        <Button type="button" variant="outline" onClick={requestImport}>
          <UploadIcon />
          {t("characters.lorebookImport")}
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
        <ul className="flex flex-col gap-2">
          {value.entries.map((entry, index) => {
            const label =
              entry.name.trim() ||
              entry.comment?.trim() ||
              t("characters.lorebookEntryFallback")

            return (
              <li
                key={entry.id ?? `${label}-${index}`}
                className="flex flex-col gap-1.5 rounded-lg border p-3"
              >
                <span className="text-sm font-medium">{label}</span>
                {entry.keys.length > 0 ? (
                  <ul className="flex flex-wrap gap-1.5">
                    {entry.keys.map((key) => (
                      <li key={key}>
                        <Badge variant="secondary">{key}</Badge>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
