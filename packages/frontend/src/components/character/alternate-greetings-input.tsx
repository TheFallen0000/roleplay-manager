import { useState } from "react"
import { XIcon } from "lucide-react"

import { Badge } from "@workspace/ui/components/badge"
import { Input } from "@workspace/ui/components/input"

import { useTranslation } from "@/lib/hooks/use-translation"

interface AlternateGreetingsInputProps {
  value: string[]
  onChange: (greetings: string[]) => void
}

export function AlternateGreetingsInput({
  value,
  onChange,
}: AlternateGreetingsInputProps) {
  const { t } = useTranslation()
  const [draft, setDraft] = useState("")

  const addGreeting = () => {
    const greeting = draft.trim()
    if (greeting === "" || value.includes(greeting)) {
      setDraft("")
      return
    }
    onChange([...value, greeting])
    setDraft("")
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium">
        {t("characters.alternateGreetingsLabel")}
      </span>
      {value.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {t("characters.alternateGreetingsEmpty")}
        </p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {value.map((greeting, index) => (
            <li key={`${greeting}-${index}`}>
              <Badge
                variant="secondary"
                className="h-auto max-w-full items-start gap-1 py-1 pr-1 text-left"
              >
                <span className="whitespace-pre-wrap break-words">
                  {greeting}
                </span>
                <button
                  type="button"
                  aria-label={t("characters.alternateGreetingsRemove", {
                    index: index + 1,
                  })}
                  className="shrink-0 rounded-full p-0.5 hover:bg-foreground/10"
                  onClick={() =>
                    onChange(
                      value.filter((_, itemIndex) => itemIndex !== index),
                    )
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
        placeholder={t("characters.alternateGreetingsPlaceholder")}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key !== "Enter") return
          event.preventDefault()
          addGreeting()
        }}
      />
    </div>
  )
}
