import { Badge } from "@workspace/ui/components/badge"

import { useTranslation } from "@/lib/hooks/use-translation"

interface GenderPronounsChipsProps {
  gender: string | null
  pronouns: string | null
  tagline: string | null
}

const hasContent = (value: string | null): value is string =>
  value !== null && value.trim() !== ""

export function GenderPronounsChips({
  gender,
  pronouns,
  tagline,
}: GenderPronounsChipsProps) {
  const { t } = useTranslation()
  const showGender = hasContent(gender)
  const showPronouns = hasContent(pronouns)
  const showTagline = hasContent(tagline)

  if (!showGender && !showPronouns && !showTagline) return null

  return (
    <div className="flex flex-wrap items-center gap-3">
      {showGender ? (
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground">
            {t("characters.genderLabel")}
          </span>
          <Badge variant="outline">{gender}</Badge>
        </div>
      ) : null}
      {showPronouns ? (
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground">
            {t("characters.pronounsLabel")}
          </span>
          <Badge variant="outline">{pronouns}</Badge>
        </div>
      ) : null}
      {showTagline ? (
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground">
            {t("characters.taglineLabel")}
          </span>
          <Badge variant="secondary">{tagline}</Badge>
        </div>
      ) : null}
    </div>
  )
}
