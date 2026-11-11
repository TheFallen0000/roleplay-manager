import { useTranslation } from "@/lib/hooks/use-translation"

import { CharacterCardFields } from "../character-card-fields"
import type { CharacterPageState } from "../use-character-page"

export function CardSection({ state }: { state: CharacterPageState }) {
  const { t } = useTranslation()
  const { cardFields, setCardField } = state

  return (
    <section
      id="section-card"
      aria-labelledby="section-card-heading"
      className="flex scroll-mt-24 flex-col gap-4"
    >
      <h2
        id="section-card-heading"
        className="font-heading text-lg font-semibold"
      >
        {t("characters.sectionCard")}
      </h2>
      <CharacterCardFields values={cardFields} onChange={setCardField} />
    </section>
  )
}
