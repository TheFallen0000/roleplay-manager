import type { Locale } from "@workspace/shared/i18n"

import { I18nProvider } from "@/lib/hooks/i18n-provider"
import { useTranslation } from "@/lib/hooks/use-translation"

import { CharacterSaveBar } from "./character-save-bar"
import { CharacterSectionNav } from "./character-section-nav"
import { CardSection } from "./sections/card-section"
import { FichasSection } from "./sections/fichas-section"
import { IdentitySection } from "./sections/identity-section"
import { LorebookSection } from "./sections/lorebook-section"
import { VersionsSection } from "./sections/versions-section"
import { useCharacterPage } from "./use-character-page"

interface CharacterPageProps {
  locale: Locale
  characterId?: string
}

export function CharacterPage({ locale, characterId }: CharacterPageProps) {
  return (
    <I18nProvider initialLocale={locale}>
      <CharacterPageContent characterId={characterId} />
    </I18nProvider>
  )
}

function CharacterPageContent({ characterId }: { characterId?: string }) {
  const { t } = useTranslation()
  const state = useCharacterPage(characterId)
  const { isEditing, character, loading, loadError } = state

  if (loading) {
    return (
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
        <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-2 rounded-2xl border border-dashed p-6">
        <h1 className="font-heading text-xl font-bold">
          {t("characters.notFoundTitle")}
        </h1>
        <p role="alert" className="text-sm text-muted-foreground">
          {loadError}
        </p>
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="font-heading text-2xl font-black tracking-tight">
          {isEditing && character
            ? character.name
            : t("characters.createTitle")}
        </h1>
        <p className="text-sm text-muted-foreground">
          {isEditing && character
            ? character.currentVersion.subtitle
            : t("characters.newTitle")}
        </p>
      </header>

      <CharacterSectionNav />

      <div className="flex flex-col gap-8">
        <IdentitySection state={state} />
        <CardSection state={state} />
        <FichasSection state={state} />
        <LorebookSection state={state} />
        <VersionsSection state={state} />
      </div>

      <CharacterSaveBar state={state} />
    </div>
  )
}
