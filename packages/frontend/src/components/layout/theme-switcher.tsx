import { MonitorIcon, MoonIcon, PaletteIcon, SunIcon } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"

import { useTheme } from "@/lib/hooks/use-theme"
import { useTranslation } from "@/lib/hooks/use-translation"
import {
  COLOR_MODES,
  THEMES,
  type ColorMode,
  type ThemeId,
} from "@/lib/themes"

const MODE_ICONS = {
  light: SunIcon,
  dark: MoonIcon,
  system: MonitorIcon,
} as const

export function ThemeSwitcher() {
  const { theme, mode, setTheme, setMode } = useTheme()
  const { t } = useTranslation()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon" aria-label={t("theme.label")}>
            <PaletteIcon className="size-4" />
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuGroup>
          <DropdownMenuLabel>{t("theme.theme")}</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={theme}
            onValueChange={(value) => {
              if (value) setTheme(value as ThemeId)
            }}
          >
            {THEMES.map((definition) => (
              <DropdownMenuRadioItem
                key={definition.id}
                value={definition.id}
              >
                <span
                  aria-hidden
                  className="size-3 shrink-0 rounded-full ring-1 ring-foreground/15"
                  style={{ backgroundColor: definition.swatch }}
                />
                {t(definition.labelKey)}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLabel>{t("theme.mode")}</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={mode}
            onValueChange={(value) => {
              if (value) setMode(value as ColorMode)
            }}
          >
            {COLOR_MODES.map((definition) => {
              const Icon = MODE_ICONS[definition.id]
              return (
                <DropdownMenuRadioItem
                  key={definition.id}
                  value={definition.id}
                >
                  <Icon />
                  {t(definition.labelKey)}
                </DropdownMenuRadioItem>
              )
            })}
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
