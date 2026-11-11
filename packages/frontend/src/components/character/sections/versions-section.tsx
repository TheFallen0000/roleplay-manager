import type { TranslationKey } from "@workspace/shared/i18n"

import { useTranslation } from "@/lib/hooks/use-translation"

import type { CharacterPageState } from "../use-character-page"

const STATUS_KEYS: Record<
  "current" | "outdated" | "deleted",
  TranslationKey
> = {
  current: "characters.versionCurrent",
  outdated: "characters.versionOutdated",
  deleted: "characters.versionDeleted",
}

export function VersionsSection({ state }: { state: CharacterPageState }) {
  const { t } = useTranslation()
  const { versions } = state

  return (
    <section
      id="section-versions"
      aria-labelledby="section-versions-heading"
      className="flex scroll-mt-24 flex-col gap-4"
    >
      <h2
        id="section-versions-heading"
        className="font-heading text-lg font-semibold"
      >
        {t("characters.sectionVersions")}
      </h2>

      {versions.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {t("characters.versionsEmpty")}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {versions.map((version) => (
            <li
              key={version.id}
              className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border px-4 py-3 text-sm"
            >
              <span className="font-medium">{`v${version.versionNumber}`}</span>
              <span className="text-muted-foreground">
                {version.createdAt.slice(0, 10)}
              </span>
              {version.lorebookVersion ? (
                <>
                  <span>{version.lorebookVersion.name ?? t("common.untitled")}</span>
                  <span className="text-muted-foreground">
                    {`v${version.lorebookVersion.versionNumber}`}
                  </span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {t(STATUS_KEYS[version.lorebookVersion.status])}
                  </span>
                </>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
