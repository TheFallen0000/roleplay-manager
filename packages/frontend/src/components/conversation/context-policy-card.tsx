import type { TranslationKey } from "@workspace/shared/i18n"
import type { ContextPolicyId } from "@workspace/shared/lib/context-policy"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@workspace/ui/components/field"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"

import { useTranslation } from "@/lib/hooks/use-translation"

const POLICY_IDS: ContextPolicyId[] = ["fast", "balanced", "deep"]

const LABEL_KEYS: Record<ContextPolicyId, TranslationKey> = {
  fast: "settings.contextPolicyFast",
  balanced: "settings.contextPolicyBalanced",
  deep: "settings.contextPolicyDeep",
}

const DESCRIPTION_KEYS: Record<ContextPolicyId, TranslationKey> = {
  fast: "settings.contextPolicyFastDescription",
  balanced: "settings.contextPolicyBalancedDescription",
  deep: "settings.contextPolicyDeepDescription",
}

interface ContextPolicyCardProps {
  value: ContextPolicyId
  onChange: (value: ContextPolicyId) => void
}

export function ContextPolicyCard({ value, onChange }: ContextPolicyCardProps) {
  const { t } = useTranslation()

  return (
    <FieldGroup className="p-1">
      <Field>
        <FieldLabel htmlFor="context-policy">
          {t("settings.contextPolicyTitle")}
        </FieldLabel>
        <Select
          value={value}
          onValueChange={(next) => {
            if (next) onChange(next as ContextPolicyId)
          }}
        >
          <SelectTrigger
            id="context-policy"
            className="w-full"
            aria-label={t("settings.contextPolicyTitle")}
          >
            <SelectValue>{t(LABEL_KEYS[value])}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {POLICY_IDS.map((id) => (
              <SelectItem key={id} value={id}>
                <span className="flex flex-col gap-0.5 whitespace-normal">
                  <span>{t(LABEL_KEYS[id])}</span>
                  <span className="text-xs text-muted-foreground">
                    {t(DESCRIPTION_KEYS[id])}
                  </span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <FieldDescription>
          {t("settings.contextPolicyDescription")}
        </FieldDescription>
        <p className="text-xs text-muted-foreground">{t(DESCRIPTION_KEYS[value])}</p>
        {value === "deep" ? (
          <p className="text-xs text-muted-foreground">
            {t("settings.contextPolicyDeepHint")}{" "}
            <a
              href="/settings/providers"
              className="underline underline-offset-4"
            >
              {t("settings.contextPolicyOpenProviders")}
            </a>
          </p>
        ) : null}
      </Field>
    </FieldGroup>
  )
}
