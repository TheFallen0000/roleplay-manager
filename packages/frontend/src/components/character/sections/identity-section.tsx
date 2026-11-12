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
import { SectionPanel } from "@/components/shared/card-first/section-panel"
import type { CharacterPageState } from "../use-character-page"

export function IdentitySection({ state }: { state: CharacterPageState }) {
  const { t } = useTranslation()
  const { character, name, setName, subtitle, setSubtitle } = state
  const { profileImageAssetId, pendingFile, handleImageSelected, handleImageClear } =
    state
  const { description, setDescription, instructions, setInstructions } = state
  const { greeting, setGreeting } = state

  return (
    <SectionPanel
      id="section-identity"
      kicker={`01 · ${t("characters.sectionIdentity")}`}
      title={t("characters.sectionIdentity")}
      description={t("characters.identityHint")}
    >
      <FieldGroup className="rm-field-grid">
        <Field className="rm-field">
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

        <Field className="rm-field">
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

        <Field className="rm-field rm-span-2">
          <FieldLabel htmlFor="character-profile-image">
            {t("characters.fieldProfileImage")}
          </FieldLabel>
          <ProfileImageInput
            characterId={character?.id ?? ""}
            name={name}
            profileImageAssetId={profileImageAssetId}
            pendingFile={pendingFile}
            recropAssetId={profileImageAssetId}
            variant={state.isEditing ? "row" : "dropzone"}
            onFileSelected={handleImageSelected}
            onClear={handleImageClear}
          />
        </Field>

        <Field className="rm-field rm-span-2">
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

        <Field className="rm-field rm-span-2">
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

        <Field className="rm-field rm-span-2">
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
    </SectionPanel>
  )
}
