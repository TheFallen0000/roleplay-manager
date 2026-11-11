import { useState } from "react"
import { Trash2Icon } from "lucide-react"

import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { Textarea } from "@workspace/ui/components/textarea"

import { useTranslation } from "@/lib/hooks/use-translation"

import type { LorebookEditorEntry } from "./lorebook-editor"

interface LorebookEntryFormProps {
  entry: LorebookEditorEntry
  onChange: (entry: LorebookEditorEntry) => void
  onRemove: () => void
  readOnly?: boolean
}

const SELECTIVE_LOGIC_KEYS = [
  "characters.lorebookSelectiveLogicAndAny",
  "characters.lorebookSelectiveLogicNotAll",
  "characters.lorebookSelectiveLogicNotAny",
  "characters.lorebookSelectiveLogicAndAll",
] as const

const splitKeys = (value: string): string[] =>
  value
    .split(",")
    .map((key) => key.trim())
    .filter((key) => key !== "")

const asNumber = (value: string, fallback: number): number => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

export function LorebookEntryForm({
  entry,
  onChange,
  onRemove,
  readOnly = false,
}: LorebookEntryFormProps) {
  const { t } = useTranslation()
  const label =
    entry.name.trim() ||
    entry.comment?.trim() ||
    t("characters.lorebookEntryFallback")

  const patch = <K extends keyof LorebookEditorEntry>(
    field: K,
    value: LorebookEditorEntry[K],
  ) => onChange({ ...entry, [field]: value })

  return (
    <div className="flex flex-col gap-3 rounded-lg border p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-col gap-1.5">
          <span className="truncate text-sm font-medium">{label}</span>
          {entry.keys.length > 0 ? (
            <ul className="flex flex-wrap gap-1.5">
              {entry.keys.map((key) => (
                <li key={key}>
                  <Badge variant="secondary">{key}</Badge>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onRemove}
          disabled={readOnly}
          aria-label={t("characters.lorebookRemoveEntry")}
        >
          <Trash2Icon className="size-4" />
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-xs">
          <span className="text-muted-foreground">
            {t("characters.lorebookEntryName")}
          </span>
          <Input
            value={entry.name}
            maxLength={200}
            disabled={readOnly}
            onChange={(event) => patch("name", event.target.value)}
          />
        </label>

        <label className="flex flex-col gap-1 text-xs">
          <span className="text-muted-foreground">
            {t("characters.lorebookEntryComment")}
          </span>
          <Input
            value={entry.comment ?? ""}
            maxLength={500}
            disabled={readOnly}
            onChange={(event) =>
              patch("comment", event.target.value.trim() === "" ? null : event.target.value)
            }
          />
        </label>

        <KeyListInput
          label={t("characters.lorebookKeysLabel")}
          placeholder="dragon, forest"
          value={entry.keys}
          readOnly={readOnly}
          onChange={(keys) => patch("keys", keys)}
        />

        <KeyListInput
          label={t("characters.lorebookEntrySecondaryKeys")}
          placeholder="fire, wings"
          value={entry.secondaryKeys}
          readOnly={readOnly}
          onChange={(keys) => patch("secondaryKeys", keys)}
        />

        <label className="col-span-full flex flex-col gap-1 text-xs">
          <span className="text-muted-foreground">
            {t("characters.lorebookEntryContent")}
          </span>
          <Textarea
            value={entry.content}
            rows={4}
            disabled={readOnly}
            onChange={(event) => patch("content", event.target.value)}
          />
        </label>

        <label className="flex flex-col gap-1 text-xs">
          <span className="text-muted-foreground">
            {t("characters.lorebookInsertionOrder")}
          </span>
          <Input
            type="number"
            value={entry.insertionOrder}
            disabled={readOnly}
            onChange={(event) =>
              patch("insertionOrder", asNumber(event.target.value, 0))
            }
          />
        </label>

        <div className="flex flex-col gap-1 text-xs">
          <span className="text-muted-foreground">
            {t("characters.lorebookPosition")}
          </span>
          <Select
            value={entry.position}
            disabled={readOnly}
            onValueChange={(value) => {
              if (value === "before_char" || value === "after_char") {
                onChange({
                  ...entry,
                  position: value,
                  rawPosition: value === "before_char" ? "0" : "1",
                })
              }
            }}
          >
            <SelectTrigger>
              <SelectValue>
                {entry.position === "before_char"
                  ? t("characters.lorebookPositionBefore")
                  : t("characters.lorebookPositionAfter")}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="before_char">
                {t("characters.lorebookPositionBefore")}
              </SelectItem>
              <SelectItem value="after_char">
                {t("characters.lorebookPositionAfter")}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <label className="flex flex-col gap-1 text-xs">
          <span className="text-muted-foreground">
            {t("characters.lorebookPriority")}
          </span>
          <Input
            type="number"
            value={entry.priority}
            disabled={readOnly}
            onChange={(event) => patch("priority", asNumber(event.target.value, 0))}
          />
        </label>

        <div className="flex flex-col gap-1 text-xs">
          <span className="text-muted-foreground">
            {t("characters.lorebookSelectiveLogic")}
          </span>
          <Select
            value={String(entry.selectiveLogic)}
            disabled={readOnly}
            onValueChange={(value) => {
              if (value) {
                patch(
                  "selectiveLogic",
                  Number(value) as LorebookEditorEntry["selectiveLogic"],
                )
              }
            }}
          >
            <SelectTrigger>
              <SelectValue>
                {t(SELECTIVE_LOGIC_KEYS[entry.selectiveLogic])}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {SELECTIVE_LOGIC_KEYS.map((key, value) => (
                <SelectItem key={key} value={String(value)}>
                  {t(key)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-2">
        <CheckboxField
          label={t("characters.lorebookEnabled")}
          checked={entry.enabled}
          disabled={readOnly}
          onChange={(checked) => patch("enabled", checked)}
        />
        <CheckboxField
          label={t("characters.lorebookConstant")}
          checked={entry.constant}
          disabled={readOnly}
          onChange={(checked) => patch("constant", checked)}
        />
        <CheckboxField
          label={t("characters.lorebookSelective")}
          checked={entry.selective}
          disabled={readOnly}
          onChange={(checked) => patch("selective", checked)}
        />
        <CheckboxField
          label={t("characters.lorebookCaseSensitive")}
          checked={entry.caseSensitive}
          disabled={readOnly}
          onChange={(checked) => patch("caseSensitive", checked)}
        />
        <CheckboxField
          label={t("characters.lorebookWholeWords")}
          checked={entry.wholeWords}
          disabled={readOnly}
          onChange={(checked) => patch("wholeWords", checked)}
        />
      </div>
    </div>
  )
}

function KeyListInput({
  label,
  placeholder,
  value,
  onChange,
  readOnly = false,
}: {
  label: string
  placeholder: string
  value: string[]
  onChange: (keys: string[]) => void
  readOnly?: boolean
}) {
  // Keep the typed text local so a trailing comma is not normalized away while
  // the user is still writing the next key.
  const [text, setText] = useState(value.join(", "))

  return (
    <label className="flex flex-col gap-1 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <Input
        value={text}
        placeholder={placeholder}
        disabled={readOnly}
        onChange={(event) => {
          setText(event.target.value)
          onChange(splitKeys(event.target.value))
        }}
        onBlur={() => setText(splitKeys(text).join(", "))}
      />
    </label>
  )
}

function CheckboxField({
  label,
  checked,
  onChange,
  disabled = false,
}: {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
}) {
  return (
    <label className="flex items-center gap-2 text-xs text-muted-foreground">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      {label}
    </label>
  )
}
