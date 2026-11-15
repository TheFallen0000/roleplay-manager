import { Field, FieldGroup, FieldLabel } from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"

import { SectionPanel } from "@/components/shared/card-first/section-panel"
import { useTranslation } from "@/lib/hooks/use-translation"

import type { LorebookPageState } from "./use-lorebook-page"

const asNumber = (value: string, fallback: number): number => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

export function LorebookSettingsSection({
  state,
}: {
  state: LorebookPageState
}) {
  const { t } = useTranslation()
  const {
    scanDepth,
    setScanDepth,
    tokenBudget,
    setTokenBudget,
    recursiveScanning,
    setRecursiveScanning,
    readOnly,
  } = state

  return (
    <SectionPanel
      id="lorebook-settings"
      kicker={`02 · ${t("lorebooks.settings")}`}
      title={t("lorebooks.settings")}
      description={t("lorebooks.settingsHint")}
    >
      <FieldGroup className="rm-field-grid">
        <Field className="rm-field">
          <FieldLabel htmlFor="lorebook-scan-depth">
            {t("lorebooks.scanDepth")}
          </FieldLabel>
          <Input
            id="lorebook-scan-depth"
            type="number"
            min={0}
            max={64}
            value={scanDepth}
            disabled={readOnly}
            onChange={(event) =>
              setScanDepth(asNumber(event.target.value, scanDepth))
            }
          />
        </Field>
        <Field className="rm-field">
          <FieldLabel htmlFor="lorebook-token-budget">
            {t("lorebooks.tokenBudget")}
          </FieldLabel>
          <Input
            id="lorebook-token-budget"
            type="number"
            min={0}
            max={100000}
            value={tokenBudget}
            disabled={readOnly}
            onChange={(event) =>
              setTokenBudget(asNumber(event.target.value, tokenBudget))
            }
          />
        </Field>
        <label className="rm-span-2 flex items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={recursiveScanning}
            disabled={readOnly}
            onChange={(event) => setRecursiveScanning(event.target.checked)}
          />
          {t("lorebooks.recursiveScanning")}
        </label>
      </FieldGroup>
    </SectionPanel>
  )
}
