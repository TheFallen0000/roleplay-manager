import { PlusIcon, Trash2Icon } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Textarea } from "@workspace/ui/components/textarea"

import { useTranslation } from "@/lib/hooks/use-translation"

import type { CharacterPageState } from "../use-character-page"

export function FichasSection({ state }: { state: CharacterPageState }) {
  const { t } = useTranslation()
  const { cards, addCard, removeCard, updateCard } = state
  const hasCards = cards.length > 0

  return (
    <section
      id="section-fichas"
      aria-labelledby="section-fichas-heading"
      className="flex scroll-mt-24 flex-col gap-4"
    >
      <h2
        id="section-fichas-heading"
        className="font-heading text-lg font-semibold"
      >
        {t("characters.sectionFichas")}
      </h2>
      <p className="text-sm text-muted-foreground">
        {t("characters.fichasHint")}
      </p>

      {hasCards ? null : (
        <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed p-4">
          <p className="text-sm text-muted-foreground">
            {t("characters.fichasEmpty")}
          </p>
          <Button type="button" variant="outline" onClick={addCard}>
            <PlusIcon />
            {t("characters.fichasAdd")}
          </Button>
        </div>
      )}

      {hasCards ? (
        <ul className="flex flex-col gap-3">
          {cards.map((card, index) => (
            <li key={card.id} className="flex flex-col gap-2 rounded-xl border p-3">
              <Input
                value={card.title}
                onChange={(event) => updateCard(index, "title", event.target.value)}
                placeholder={t("characters.cardTitlePlaceholder")}
                maxLength={50}
              />
              <Textarea
                value={card.content}
                onChange={(event) => updateCard(index, "content", event.target.value)}
                placeholder={t("characters.cardContentPlaceholder")}
                maxLength={2500}
              />
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={card.active}
                    onChange={(event) =>
                      updateCard(index, "active", event.target.checked)
                    }
                  />
                  {t("characters.cardActive")}
                </label>
                <button
                  type="button"
                  onClick={() => removeCard(index)}
                  className="ml-auto flex items-center gap-1 text-xs text-destructive hover:underline"
                >
                  <Trash2Icon className="size-3" />
                  {t("common.delete")}
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      {hasCards ? (
        <Button type="button" variant="outline" onClick={addCard}>
          <PlusIcon />
          {t("characters.fichasAdd")}
        </Button>
      ) : null}
    </section>
  )
}
