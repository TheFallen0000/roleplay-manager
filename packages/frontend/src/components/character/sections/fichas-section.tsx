import { PlusIcon, Trash2Icon } from "lucide-react"

import { Input } from "@workspace/ui/components/input"
import { Textarea } from "@workspace/ui/components/textarea"

import { SectionPanel } from "@/components/shared/card-first/section-panel"
import { useTranslation } from "@/lib/hooks/use-translation"

import type { CharacterPageState } from "../use-character-page"

export function FichasSection({ state }: { state: CharacterPageState }) {
  const { t } = useTranslation()
  const { cards, addCard, removeCard, updateCard } = state
  const hasCards = cards.length > 0

  return (
    <SectionPanel
      id="section-fichas"
      kicker={`03 · ${t("characters.sectionFichas")}`}
      title={t("characters.sectionFichas")}
      description={t("characters.fichasHint")}
    >
      {hasCards ? (
        <ul className="rm-ficha-list">
          {cards.map((card, index) => (
            <li key={card.id} className="rm-ficha">
              <span className="handle rm-mono" aria-hidden="true">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div className="flex min-w-0 flex-col gap-2">
                <Input
                  value={card.title}
                  onChange={(event) =>
                    updateCard(index, "title", event.target.value)
                  }
                  placeholder={t("characters.cardTitlePlaceholder")}
                  maxLength={50}
                />
                <Textarea
                  value={card.content}
                  onChange={(event) =>
                    updateCard(index, "content", event.target.value)
                  }
                  placeholder={t("characters.cardContentPlaceholder")}
                  maxLength={2500}
                />
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
              </div>
              <button
                type="button"
                onClick={() => removeCard(index)}
                className="rm-btn rm-btn--quiet rm-btn--icon rm-btn--sm"
                aria-label={t("common.delete")}
                title={t("common.delete")}
              >
                <Trash2Icon className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="rm-empty">
          <h2>{t("characters.fichasEmpty")}</h2>
          <p>{t("characters.fichasEmptyHint")}</p>
        </div>
      )}

      <button
        type="button"
        className="rm-ficha-add"
        style={{ width: "100%", marginTop: "0.65rem" }}
        onClick={addCard}
      >
        <span className="flex items-center gap-2">
          <PlusIcon className="size-4" />
          {t("characters.fichasAdd")}
        </span>
      </button>
    </SectionPanel>
  )
}
