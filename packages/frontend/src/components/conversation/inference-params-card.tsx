import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Slider } from "@workspace/ui/components/slider"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"

import { MAX_OUTPUT_TOKENS } from "@workspace/shared/lib/inference"

import { formatTokenCount } from "@/lib/format-token-count"
import { useTranslation } from "@/lib/hooks/use-translation"

interface InferenceParamsCardProps {
  temperature: number
  topP: number
  frequencyPenalty: number
  presencePenalty: number
  maxTokens: number
  contextWindow?: number | null
  stopSequences: string
  onTemperatureChange: (v: number) => void
  onTopPChange: (v: number) => void
  onFrequencyPenaltyChange: (v: number) => void
  onPresencePenaltyChange: (v: number) => void
  onMaxTokensChange: (v: number) => void
  onStopSequencesChange: (v: string) => void
}

export function InferenceParamsCard({
  temperature,
  topP,
  frequencyPenalty,
  presencePenalty,
  maxTokens,
  contextWindow,
  stopSequences,
  onTemperatureChange,
  onTopPChange,
  onFrequencyPenaltyChange,
  onPresencePenaltyChange,
  onMaxTokensChange,
  onStopSequencesChange,
}: InferenceParamsCardProps) {
  const { t, locale } = useTranslation()

  const sliderHandler = (setter: (v: number) => void) => (v: number | readonly number[]) =>
    setter(Array.isArray(v) ? v[0] : v)

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("settings.inferenceTitle")}</CardTitle>
        <CardDescription>
          {t("settings.inferenceDescription")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <FieldGroup>
          <Field>
            <FieldLabel>
              {t("settings.temperature", { value: temperature.toFixed(1) })}
            </FieldLabel>
            <Slider
              value={[temperature]}
              onValueChange={sliderHandler(onTemperatureChange)}
              min={0}
              max={2}
              step={0.1}
              aria-label={t("settings.temperature", { value: temperature.toFixed(1) })}
            />
            <FieldDescription>{t("settings.temperatureHint")}</FieldDescription>
          </Field>
          <Field>
            <FieldLabel>
              {t("settings.topP", { value: topP.toFixed(2) })}
            </FieldLabel>
            <Slider
              value={[topP]}
              onValueChange={sliderHandler(onTopPChange)}
              min={0}
              max={1}
              step={0.05}
              aria-label={t("settings.topP", { value: topP.toFixed(2) })}
            />
            <FieldDescription>{t("settings.topPHint")}</FieldDescription>
          </Field>
          <Field>
            <FieldLabel>
              {t("settings.frequencyPenalty", {
                value: frequencyPenalty.toFixed(1),
              })}
            </FieldLabel>
            <Slider
              value={[frequencyPenalty]}
              onValueChange={sliderHandler(onFrequencyPenaltyChange)}
              min={-2}
              max={2}
              step={0.1}
              aria-label={t("settings.frequencyPenalty", {
                value: frequencyPenalty.toFixed(1),
              })}
            />
            <FieldDescription>{t("settings.frequencyPenaltyHint")}</FieldDescription>
          </Field>
          <Field>
            <FieldLabel>
              {t("settings.presencePenalty", {
                value: presencePenalty.toFixed(1),
              })}
            </FieldLabel>
            <Slider
              value={[presencePenalty]}
              onValueChange={sliderHandler(onPresencePenaltyChange)}
              min={-2}
              max={2}
              step={0.1}
              aria-label={t("settings.presencePenalty", {
                value: presencePenalty.toFixed(1),
              })}
            />
            <FieldDescription>{t("settings.presencePenaltyHint")}</FieldDescription>
          </Field>
          <Field>
            <FieldLabel htmlFor="max-tokens">{t("settings.maxTokens")}</FieldLabel>
            <Input
              id="max-tokens"
              type="number"
              min={1}
              max={MAX_OUTPUT_TOKENS}
              value={maxTokens}
              onChange={(e) => onMaxTokensChange(Number(e.target.value))}
            />
            <FieldDescription>{t("settings.maxTokensHint")}</FieldDescription>
            {contextWindow !== null && contextWindow !== undefined && maxTokens >= contextWindow ? (
              <p role="status" className="text-xs text-destructive">
                {t("settings.contextWindowMaxTokensWarning", {
                  maxTokens,
                  window: formatTokenCount(contextWindow, locale),
                })}
              </p>
            ) : null}
          </Field>
          <Field>
            <FieldLabel htmlFor="stop-sequences">{t("settings.stopSequences")}</FieldLabel>
            <Input
              id="stop-sequences"
              value={stopSequences}
              onChange={(e) => onStopSequencesChange(e.target.value)}
              placeholder={t("settings.stopSequencesPlaceholder")}
            />
            <FieldDescription>{t("settings.stopSequencesHint")}</FieldDescription>
          </Field>
        </FieldGroup>
      </CardContent>
    </Card>
  )
}
