import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { Input } from "@workspace/ui/components/input"
import { Spinner } from "@workspace/ui/components/spinner"

import { MAX_CONTEXT_WINDOW } from "@workspace/shared/lib/inference"
import type { ModelCapabilitiesResult } from "@workspace/shared/types/model-capabilities"

import { useTranslation } from "@/lib/hooks/use-translation"

import { ModelCapabilitiesSuggestion } from "./model-capabilities-suggestion"

export interface ContextWindowCardProps {
  model: string | null
  contextWindow: number | null
  detecting: boolean
  capabilities: ModelCapabilitiesResult | null
  capabilitiesLoading: boolean
  onDetect: () => void
  onContextWindowChange: (value: string) => void
  onPreset: (value: number) => void
  onApplyDetected: (workingWindow: number | null) => void
}

const CONTEXT_WINDOW_PRESETS = [4_096, 8_192, 16_384, 32_768, 131_072]

export function ContextWindowCard({
  model,
  contextWindow,
  detecting,
  capabilities,
  capabilitiesLoading,
  onDetect,
  onContextWindowChange,
  onPreset,
  onApplyDetected,
}: ContextWindowCardProps) {
  const { t } = useTranslation()

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("settings.contextWindowTitle")}</CardTitle>
        <CardDescription>
          {t("settings.contextWindowDescription")}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="context-window" className="text-sm font-medium">
            {t("settings.contextWindowLabel")}
          </label>
          <div className="flex gap-2">
            <Input
              id="context-window"
              type="number"
              min={1}
              max={MAX_CONTEXT_WINDOW}
              inputMode="numeric"
              value={contextWindow ?? ""}
              placeholder={t("settings.contextWindowPlaceholder")}
              onChange={(event) => onContextWindowChange(event.target.value)}
            />
            <Button
              type="button"
              variant="outline"
              onClick={onDetect}
              disabled={!model || detecting}
            >
              {detecting ? <Spinner /> : null}
              {detecting
                ? t("settings.contextWindowDetecting")
                : t("settings.contextWindowAuto")}
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1">
          <span className="text-xs text-muted-foreground">
            {t("settings.contextWindowPresets")}:
          </span>
          {CONTEXT_WINDOW_PRESETS.map((preset) => (
            <Button
              key={preset}
              type="button"
              size="sm"
              variant={contextWindow === preset ? "default" : "outline"}
              aria-pressed={contextWindow === preset}
              onClick={() => onPreset(preset)}
            >
              {preset / 1024}k
            </Button>
          ))}
        </div>
        {contextWindow === null ? (
          <p className="text-xs text-muted-foreground">
            {t("settings.contextWindowUnknownWarning")}
          </p>
        ) : null}
        {contextWindow !== null && contextWindow < 8192 ? (
          <p className="text-xs text-amber-600 dark:text-amber-400">
            {t("settings.contextWindowSmallWarning")}
          </p>
        ) : null}
        <p className="text-xs text-muted-foreground">
          {t("settings.contextWindowHint")}
        </p>
        <ModelCapabilitiesSuggestion
          capabilities={capabilities}
          loading={capabilitiesLoading}
          typedContextWindow={contextWindow}
          onApply={onApplyDetected}
        />
      </CardContent>
    </Card>
  )
}
