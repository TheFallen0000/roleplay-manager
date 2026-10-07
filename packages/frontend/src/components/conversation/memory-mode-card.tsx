"use client"

import { Field, FieldContent, FieldDescription, FieldGroup, FieldLabel, FieldLegend, FieldSet, FieldTitle } from "@workspace/ui/components/field"
import { RadioGroup, RadioGroupItem } from "@workspace/ui/components/radio-group"
import type { MemoryProposalMode } from "@workspace/shared/types/conversation"
import { useTranslation } from "@/lib/hooks/use-translation"

interface MemoryModeCardProps {
  current: MemoryProposalMode
  onChange: (mode: MemoryProposalMode) => void
}

export function MemoryModeCard({ current, onChange }: MemoryModeCardProps) {
  const { t } = useTranslation()

  return (
    <FieldGroup>
      <FieldSet>
        <FieldLegend variant="label">{t("memory.modeTitle")}</FieldLegend>
        <FieldDescription>
          {t("memory.modeDescription")}
        </FieldDescription>
        <RadioGroup value={current} onValueChange={(value) => onChange(value as MemoryProposalMode)}>
          <FieldLabel htmlFor="mode-auto">
            <Field orientation="horizontal">
              <FieldContent>
                <FieldTitle>{t("memory.modeAuto")}</FieldTitle>
                <FieldDescription>
                  {t("memory.modeAutoDescription")}
                </FieldDescription>
              </FieldContent>
              <RadioGroupItem value="auto" id="mode-auto" />
            </Field>
          </FieldLabel>
          <FieldLabel htmlFor="mode-manual">
            <Field orientation="horizontal">
              <FieldContent>
                <FieldTitle>{t("memory.modeManual")}</FieldTitle>
                <FieldDescription>
                  {t("memory.modeManualDescription")}
                </FieldDescription>
              </FieldContent>
              <RadioGroupItem value="manual" id="mode-manual" />
            </Field>
          </FieldLabel>
        </RadioGroup>
      </FieldSet>
    </FieldGroup>
  )
}
