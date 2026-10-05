import { Field, FieldDescription, FieldGroup, FieldLabel } from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"

import { useTranslation } from "@/lib/hooks/use-translation"

interface SummarySettingsCardProps {
  recentMessageCount: number
  summaryFrequency: number
  onRecentMessageCountChange: (v: number) => void
  onSummaryFrequencyChange: (v: number) => void
}

export function SummarySettingsCard({
  recentMessageCount,
  summaryFrequency,
  onRecentMessageCountChange,
  onSummaryFrequencyChange,
}: SummarySettingsCardProps) {
  const { t } = useTranslation()

  const handleSummaryFrequencyChange = (raw: number) => {
    const next = Math.max(1, Math.floor(raw) || 1)
    onSummaryFrequencyChange(next)
    if (recentMessageCount >= next) {
      onRecentMessageCountChange(Math.max(1, next - 1))
    }
  }

  const recentMax = Math.max(1, summaryFrequency - 1)

  return (
        <FieldGroup className="p-1">
          <Field>
            <FieldLabel htmlFor="summary-freq">{t("settings.summaryFrequency")}</FieldLabel>
            <Input
              id="summary-freq"
              type="number"
              min={1}
              value={summaryFrequency}
              onChange={(e) => handleSummaryFrequencyChange(Number(e.target.value))}
            />
            <FieldDescription>
              {t("settings.summaryFrequencyHint")}
            </FieldDescription>
          </Field>
          <Field>
            <FieldLabel htmlFor="recent-count">{t("settings.recentMessages")}</FieldLabel>
            <Input
              id="recent-count"
              type="number"
              min={1}
              max={recentMax}
              value={recentMessageCount}
              onChange={(e) => onRecentMessageCountChange(Math.max(1, Math.floor(Number(e.target.value)) || 1))}
            />
            <FieldDescription>
              {t("settings.recentMessagesHint", { max: recentMax })}
            </FieldDescription>
          </Field>
        </FieldGroup>
  )
}
