import { useState } from "react"

import type { TranslationKey } from "@workspace/shared/i18n"

import { useTranslation } from "@/lib/hooks/use-translation"

const SECTIONS: { id: string; labelKey: TranslationKey }[] = [
  { id: "identity", labelKey: "lorebooks.identity" },
  { id: "settings", labelKey: "lorebooks.settings" },
  { id: "entries", labelKey: "lorebooks.entries" },
]

export function LorebookSectionNav() {
  const { t } = useTranslation()
  const [active, setActive] = useState("identity")

  return (
    <nav
      aria-label={t("lorebooks.sectionNavLabel")}
      className="sticky top-12 z-10 -mx-4 overflow-x-auto border-b bg-background/90 px-4 py-2 backdrop-blur-sm sm:mx-0 sm:rounded-lg sm:border"
    >
      <ul className="flex min-w-max items-center gap-1">
        {SECTIONS.map((section) => {
          const isActive = active === section.id
          return (
            <li key={section.id}>
              <a
                href={`#lorebook-${section.id}`}
                aria-current={isActive ? "location" : undefined}
                onClick={() => setActive(section.id)}
                className="inline-flex rounded-full px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground aria-[current=location]:bg-primary/10 aria-[current=location]:text-primary"
              >
                {t(section.labelKey)}
              </a>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
