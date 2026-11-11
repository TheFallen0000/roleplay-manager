import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import { Textarea } from "@workspace/ui/components/textarea"

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
    <section
      id="lorebook-identity"
      aria-labelledby="lorebook-identity-heading"
      className="flex scroll-mt-24 flex-col gap-4"
    >
      <h2
        id="lorebook-identity-heading"
        className="font-heading text-lg font-semibold"
      >
        {t("lorebooks.identity")}
      </h2>
      <FieldGroup>
        <Field>
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
        <Field>
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
    </section>
  )
}
