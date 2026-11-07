import { Field, FieldGroup, FieldLabel } from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import { Textarea } from "@workspace/ui/components/textarea"

import { useTranslation } from "@/lib/hooks/use-translation"

import { AlternateGreetingsInput } from "./alternate-greetings-input"
import { CreatorNotesPanel } from "./creator-notes-panel"
import { GenderPronounsChips } from "./gender-pronouns-chips"
import { TagsInput } from "./tags-input"

export interface CharacterCardFieldValues {
  personality: string
  scenario: string
  mesExample: string
  alternateGreetings: string[]
  creatorNotes: string
  tags: string[]
  creator: string
  cardCharacterVersion: string
  gender: string
  pronouns: string
  tagline: string
  systemPrompt: string
  postHistoryInstructions: string
  extensions: unknown
  unknownFields: unknown
  unknownRootFields: unknown
}

export type CharacterCardFieldKey = keyof CharacterCardFieldValues

interface CharacterCardFieldsProps {
  values: CharacterCardFieldValues
  onChange: <K extends CharacterCardFieldKey>(
    field: K,
    value: CharacterCardFieldValues[K],
  ) => void
}

export function CharacterCardFields({
  values,
  onChange,
}: CharacterCardFieldsProps) {
  const { t } = useTranslation()

  return (
    <FieldGroup>
      <Field>
        <FieldLabel htmlFor="card-personality">
          {t("characters.fieldPersonality")}
        </FieldLabel>
        <Textarea
          id="card-personality"
          value={values.personality}
          onChange={(event) => onChange("personality", event.target.value)}
          maxLength={20_000}
        />
      </Field>

      <Field>
        <FieldLabel htmlFor="card-scenario">
          {t("characters.fieldScenario")}
        </FieldLabel>
        <Textarea
          id="card-scenario"
          value={values.scenario}
          onChange={(event) => onChange("scenario", event.target.value)}
          maxLength={20_000}
        />
      </Field>

      <Field>
        <FieldLabel htmlFor="card-mes-example">
          {t("characters.fieldMesExample")}
        </FieldLabel>
        <Textarea
          id="card-mes-example"
          value={values.mesExample}
          onChange={(event) => onChange("mesExample", event.target.value)}
          maxLength={20_000}
        />
      </Field>

      <AlternateGreetingsInput
        value={values.alternateGreetings}
        onChange={(alternateGreetings) =>
          onChange("alternateGreetings", alternateGreetings)
        }
      />

      <CreatorNotesPanel notes={values.creatorNotes || null} />

      <TagsInput
        value={values.tags}
        onChange={(tags) => onChange("tags", tags)}
      />

      <Field>
        <FieldLabel htmlFor="card-creator">
          {t("characters.fieldCreator")}
        </FieldLabel>
        <Input
          id="card-creator"
          value={values.creator}
          onChange={(event) => onChange("creator", event.target.value)}
          maxLength={200}
        />
      </Field>

      <Field>
        <FieldLabel htmlFor="card-version">
          {t("characters.fieldCardVersion")}
        </FieldLabel>
        <Input
          id="card-version"
          value={values.cardCharacterVersion}
          onChange={(event) =>
            onChange("cardCharacterVersion", event.target.value)
          }
          maxLength={200}
        />
      </Field>

      <Field>
        <FieldLabel htmlFor="card-gender">
          {t("characters.fieldGender")}
        </FieldLabel>
        <Input
          id="card-gender"
          value={values.gender}
          onChange={(event) => onChange("gender", event.target.value)}
          maxLength={200}
        />
      </Field>

      <Field>
        <FieldLabel htmlFor="card-pronouns">
          {t("characters.fieldPronouns")}
        </FieldLabel>
        <Input
          id="card-pronouns"
          value={values.pronouns}
          onChange={(event) => onChange("pronouns", event.target.value)}
          maxLength={200}
        />
      </Field>

      <Field>
        <FieldLabel htmlFor="card-tagline">
          {t("characters.fieldTagline")}
        </FieldLabel>
        <Input
          id="card-tagline"
          value={values.tagline}
          onChange={(event) => onChange("tagline", event.target.value)}
          maxLength={500}
        />
      </Field>

      <GenderPronounsChips
        gender={values.gender}
        pronouns={values.pronouns}
        tagline={values.tagline}
      />

      <Field>
        <FieldLabel htmlFor="card-system-prompt">
          {t("characters.fieldSystemPrompt")}
        </FieldLabel>
        <Textarea
          id="card-system-prompt"
          value={values.systemPrompt}
          onChange={(event) => onChange("systemPrompt", event.target.value)}
          maxLength={20_000}
        />
      </Field>

      <Field>
        <FieldLabel htmlFor="card-post-history">
          {t("characters.fieldPostHistoryInstructions")}
        </FieldLabel>
        <Textarea
          id="card-post-history"
          value={values.postHistoryInstructions}
          onChange={(event) =>
            onChange("postHistoryInstructions", event.target.value)
          }
          maxLength={20_000}
        />
      </Field>
    </FieldGroup>
  )
}
