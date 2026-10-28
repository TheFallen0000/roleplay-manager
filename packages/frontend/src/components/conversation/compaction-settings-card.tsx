import { Field, FieldDescription, FieldGroup, FieldLabel } from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"

import { resolveCompactionTarget } from "@workspace/shared/lib/compaction"

import { useTranslation } from "@/lib/hooks/use-translation"

interface CompactionSettingsCardProps {
  value: number
  contextWindow: number | null
  onChange: (value: number) => void
}

export function CompactionSettingsCard({
  value,
  contextWindow,
  onChange,
}: CompactionSettingsCardProps) {
  const { t } = useTranslation()
  const target = resolveCompactionTarget(value)

  return (
    <FieldGroup className="p-1">
      <Field>
        <FieldLabel htmlFor="compaction-threshold">
          {t("settings.compactionThreshold", { value })}
        </FieldLabel>
        <Input
          id="compaction-threshold"
          type="number"
          min={50}
          max={95}
          value={value}
          onChange={(event) => {
            const next = Number(event.target.value)
            onChange(Number.isFinite(next) ? next : 50)
          }}
        />
        <FieldDescription>
          {t("settings.compactionThresholdHint", { target })}
        </FieldDescription>
        {contextWindow === null ? (
          <p className="text-xs text-amber-600 dark:text-amber-400">
            {t("settings.compactionWindowMissing")}
          </p>
        ) : null}
      </Field>
    </FieldGroup>
  )
}
