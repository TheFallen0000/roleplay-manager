import { useTranslation } from "@/lib/hooks/use-translation"

import { SectionPanel } from "@/components/shared/card-first/section-panel"
import { CharacterCardFields } from "../character-card-fields"
import type { CharacterPageState } from "../use-character-page"

export function CardSection({ state }: { state: CharacterPageState }) {
  const { t } = useTranslation()
  const { cardFields, setCardField } = state

  return (
    <SectionPanel
      id="section-card"
      kicker={`02 · ${t("characters.sectionCard")}`}
      title={t("characters.sectionCard")}
      description={t("characters.cardHint")}
    >
      <div className="rm-card-fields">
        <CharacterCardFields values={cardFields} onChange={setCardField} />
      </div>
    </SectionPanel>
  )
}
