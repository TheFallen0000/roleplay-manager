import type { Locale } from "@workspace/shared/i18n"

import { I18nProvider } from "@/lib/hooks/i18n-provider"
import { useTranslation } from "@/lib/hooks/use-translation"

import { SectionNav } from "@/components/shared/card-first/section-nav"
import { CharacterCover } from "./character-cover"
import { CharacterPageActions } from "./character-page-actions"
import { CharacterRail } from "./character-rail"
import { CharacterSaveBar } from "./character-save-bar"
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
      <div className="rm-content">
        <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="rm-content">
        <div className="rm-empty">
          <h1>{t("characters.notFoundTitle")}</h1>
          <p role="alert">{loadError}</p>
        </div>
      </div>
    )
  }

  const sections = [
    { id: "section-identity", label: t("characters.sectionIdentity"), number: "01" },
    { id: "section-card", label: t("characters.sectionCard"), number: "02" },
    { id: "section-fichas", label: t("characters.sectionFichas"), number: "03" },
    { id: "section-lorebook", label: t("characters.sectionLorebook"), number: "04" },
    ...(isEditing
      ? [
          {
            id: "section-versions",
            label: t("characters.sectionVersions"),
            number: "05",
          },
        ]
      : []),
  ]

  const scrollToIdentity = () => {
    document.getElementById("section-identity")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    })
  }

  return (
    <div className="rm-content">
      <div className="rm-breadcrumb">
        <a href="/">{t("nav.groupLibrary")}</a>
        <span className="sep">/</span>
        <a href="/">{t("nav.characters")}</a>
        <span className="sep">/</span>
        <span>
          {isEditing && character ? character.name : t("characters.createTitle")}
        </span>
      </div>

      <CharacterCover
        characterId={character?.id}
        name={state.name}
        subtitle={state.subtitle}
        profileImageAssetId={state.profileImageAssetId}
        pendingFile={state.pendingFile}
        versionNumber={character?.currentVersion.versionNumber}
        cardSpec={character?.currentVersion.cardCharacterVersion}
        creator={character?.currentVersion.creator}
        tags={character?.currentVersion.tags}
        lorebook={state.lorebookSummary}
        updatedAt={character?.updatedAt}
        onImageClick={scrollToIdentity}
      >
        {isEditing ? (
          <CharacterPageActions state={state} />
        ) : (
          <button
            type="button"
            className="rm-btn"
            onClick={() => void state.save()}
            disabled={state.saving}
          >
            {state.saving ? t("common.loading") : t("characters.save")}
          </button>
        )}
      </CharacterCover>

      <div className="rm-page-grid rm-page-grid--rail">
        <SectionNav
          ariaLabel={t("characters.sectionNavLabel")}
          caption={t("characters.sectionNavCaption")}
          sections={sections}
        />

        <div>
          <IdentitySection state={state} />
          <CardSection state={state} />
          <FichasSection state={state} />
          <LorebookSection state={state} />
          {isEditing ? <VersionsSection state={state} /> : null}
          <CharacterSaveBar state={state} />
        </div>

        <CharacterRail state={state} />
      </div>
    </div>
  )
}
