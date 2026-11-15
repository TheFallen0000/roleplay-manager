import { SearchIcon } from "lucide-react"

import { useTranslation } from "@/lib/hooks/use-translation"
import type { CharacterSortKey } from "@/lib/sort-characters"

const SORT_OPTIONS: {
  value: CharacterSortKey
  labelKey:
    | "characters.sortRecencyDesc"
    | "characters.sortRecencyAsc"
    | "characters.sortActivityDesc"
    | "characters.sortActivityAsc"
}[] = [
  { value: "recency-desc", labelKey: "characters.sortRecencyDesc" },
  { value: "recency-asc", labelKey: "characters.sortRecencyAsc" },
  { value: "activity-desc", labelKey: "characters.sortActivityDesc" },
  { value: "activity-asc", labelKey: "characters.sortActivityAsc" },
]

interface CharacterListToolbarProps {
  search: string
  onSearchChange: (value: string) => void
  sort: CharacterSortKey
  onSortChange: (value: CharacterSortKey) => void
  resultCount: number
  totalCount: number
}

export function CharacterListToolbar({
  search,
  onSearchChange,
  sort,
  onSortChange,
  resultCount,
  totalCount,
}: CharacterListToolbarProps) {
  const { t } = useTranslation()
  const searching = search.trim().length > 0

  return (
    <div className="rm-toolbar">
      <label className="rm-search">
        <SearchIcon className="size-4" aria-hidden="true" />
        <input
          type="search"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={t("characters.searchPlaceholder")}
          aria-label={t("characters.searchLabel")}
        />
      </label>
      <span className="rm-chip">
        {searching
          ? t("characters.results", { count: resultCount })
          : t("characters.count", { count: totalCount })}
      </span>
      <label className="rm-field" style={{ marginLeft: "auto" }}>
        <span className="rm-sr-only">{t("characters.sortLabel")}</span>
        <select
          value={sort}
          aria-label={t("characters.sortLabel")}
          onChange={(event) =>
            onSortChange(event.target.value as CharacterSortKey)
          }
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {t(option.labelKey)}
            </option>
          ))}
        </select>
      </label>
    </div>
  )
}
