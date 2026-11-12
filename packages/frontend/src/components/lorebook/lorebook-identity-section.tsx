import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import { Textarea } from "@workspace/ui/components/textarea"

import { SectionPanel } from "@/components/shared/card-first/section-panel"
import { useTranslation } from "@/lib/hooks/use-translation"

import type { LorebookPageState } from "./use-lorebook-page"

export function LorebookIdentitySection({
  state,
}: {
  state: LorebookPageState
}) {
  const { t } = useTranslation()
  const { name, setName, description, setDescription, readOnly } = state

  return (
    <SectionPanel
      id="lorebook-identity"
      kicker={`01 · ${t("lorebooks.identity")}`}
      title={t("lorebooks.identity")}
      description={t("lorebooks.identityHint")}
    >
      <FieldGroup className="rm-field-grid">
        <Field className="rm-field rm-span-2">
          <FieldLabel htmlFor="lorebook-name-field">
            {t("lorebooks.name")}
          </FieldLabel>
          <Input
            id="lorebook-name-field"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={t("lorebooks.namePlaceholder")}
            disabled={readOnly}
            maxLength={200}
          />
        </Field>
        <Field className="rm-field rm-span-2">
          <FieldLabel htmlFor="lorebook-description-field">
            {t("lorebooks.description")}
          </FieldLabel>
          <Textarea
            id="lorebook-description-field"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder={t("lorebooks.descriptionPlaceholder")}
            disabled={readOnly}
            maxLength={2000}
          />
        </Field>
      </FieldGroup>
    </SectionPanel>
  )
}
