import { SearchIcon } from "lucide-react"

import { Input } from "@workspace/ui/components/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"

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
}

export function CharacterListToolbar({
  search,
  onSearchChange,
  sort,
  onSortChange,
  resultCount,
}: CharacterListToolbarProps) {
  const { t } = useTranslation()

  const selectedOption =
    SORT_OPTIONS.find((option) => option.value === sort) ?? SORT_OPTIONS[0]
  const searching = search.trim().length > 0

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <SearchIcon className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
        <Input
          type="search"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={t("characters.searchPlaceholder")}
          aria-label={t("characters.searchLabel")}
          className="pl-8"
        />
      </div>
      <div className="flex items-center justify-between gap-2 sm:justify-end">
        {searching ? (
          <span className="text-muted-foreground text-sm whitespace-nowrap">
            {t("characters.results", { count: resultCount })}
          </span>
        ) : null}
        <Select
          value={sort}
          onValueChange={(value) => {
            if (value) {
              onSortChange(value as CharacterSortKey)
            }
          }}
        >
          <SelectTrigger
            className="w-full sm:w-64"
            aria-label={t("characters.sortLabel")}
          >
            <SelectValue>{t(selectedOption.labelKey)}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {t(option.labelKey)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
