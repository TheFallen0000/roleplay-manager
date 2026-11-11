import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import { Textarea } from "@workspace/ui/components/textarea"

import { useTranslation } from "@/lib/hooks/use-translation"

import { ProfileImageInput } from "@/components/shared/images/profile-image-input"
import type { CharacterPageState } from "../use-character-page"

export function IdentitySection({ state }: { state: CharacterPageState }) {
  const { t } = useTranslation()
  const { character, name, setName, subtitle, setSubtitle } = state
  const { profileImageAssetId, pendingFile, handleImageSelected, handleImageClear } =
    state
  const { description, setDescription, instructions, setInstructions } = state
  const { greeting, setGreeting } = state

  return (
    <section
      id="section-identity"
      aria-labelledby="section-identity-heading"
      className="flex scroll-mt-24 flex-col gap-4"
    >
      <h2
        id="section-identity-heading"
        className="font-heading text-lg font-semibold"
      >
        {t("characters.sectionIdentity")}
      </h2>

      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="character-name">
            {t("characters.fieldName")}
          </FieldLabel>
          <Input
            id="character-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={t("characters.namePlaceholder")}
            maxLength={50}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="character-subtitle">
            {t("characters.fieldSubtitle")}
          </FieldLabel>
          <Input
            id="character-subtitle"
            value={subtitle}
            onChange={(event) => setSubtitle(event.target.value)}
            placeholder={t("characters.subtitlePlaceholder")}
            maxLength={80}
          />
          <FieldDescription>{t("characters.subtitleHint")}</FieldDescription>
        </Field>

        <Field>
          <FieldLabel htmlFor="character-profile-image">
            {t("characters.fieldProfileImage")}
          </FieldLabel>
          <ProfileImageInput
            characterId={character?.id ?? ""}
            name={name}
            profileImageAssetId={profileImageAssetId}
            pendingFile={pendingFile}
            recropAssetId={profileImageAssetId}
            onFileSelected={handleImageSelected}
            onClear={handleImageClear}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="character-greeting">
            {t("characters.fieldGreeting")}
          </FieldLabel>
          <Textarea
            id="character-greeting"
            value={greeting}
            onChange={(event) => setGreeting(event.target.value)}
            placeholder={t("characters.greetingPlaceholder")}
            maxLength={2000}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="character-description">
            {t("characters.fieldDescription")}
          </FieldLabel>
          <Textarea
            id="character-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder={t("characters.descriptionPlaceholder")}
            maxLength={2000}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="character-instructions">
            {t("characters.fieldInstructions")}
          </FieldLabel>
          <Textarea
            id="character-instructions"
            value={instructions}
            onChange={(event) => setInstructions(event.target.value)}
            placeholder={t("characters.instructionsPlaceholder")}
            maxLength={1500}
          />
          <FieldDescription>{t("characters.instructionsHint")}</FieldDescription>
        </Field>
      </FieldGroup>
    </section>
  )
}
