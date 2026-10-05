import { LanguagesIcon } from "lucide-react"

import { SUPPORTED_LOCALES, type Locale } from "@workspace/shared/i18n"
import { Button } from "@workspace/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"

import { useTranslation } from "@/lib/hooks/use-translation"

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useTranslation()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon" aria-label={t("language.label")}>
            <LanguagesIcon className="size-4" />
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuGroup>
          <DropdownMenuLabel>{t("language.label")}</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={locale}
            onValueChange={(value) => {
              if (value) setLocale(value as Locale)
            }}
          >
            {SUPPORTED_LOCALES.map((code) => (
              <DropdownMenuRadioItem key={code} value={code}>
                {t(`language.${code}`)}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
