import { useState } from "react"
import { XIcon } from "lucide-react"

import { Badge } from "@workspace/ui/components/badge"
import { Input } from "@workspace/ui/components/input"

import { useTranslation } from "@/lib/hooks/use-translation"

interface TagsInputProps {
  value: string[]
  onChange: (tags: string[]) => void
}

export function TagsInput({ value, onChange }: TagsInputProps) {
  const { t } = useTranslation()
  const [draft, setDraft] = useState("")

  const addTag = () => {
    const tag = draft.trim()
    if (tag === "" || value.includes(tag)) {
      setDraft("")
      return
    }
    onChange([...value, tag])
    setDraft("")
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium">{t("characters.tagsLabel")}</span>
      {value.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {t("characters.tagsEmpty")}
        </p>
      ) : (
        <ul className="flex flex-wrap gap-1.5">
          {value.map((tag, index) => (
            <li key={`${tag}-${index}`}>
              <Badge variant="secondary" className="gap-1 pr-1">
                {tag}
                <button
                  type="button"
                  aria-label={t("characters.tagsRemove", { tag })}
                  className="rounded-full p-0.5 hover:bg-foreground/10"
                  onClick={() =>
                    onChange(value.filter((_, itemIndex) => itemIndex !== index))
                  }
                >
                  <XIcon className="size-3" />
                </button>
              </Badge>
            </li>
          ))}
        </ul>
      )}
      <Input
        value={draft}
        placeholder={t("characters.tagsPlaceholder")}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key !== "Enter") return
          event.preventDefault()
          addTag()
        }}
      />
    </div>
  )
}
