import { useEffect, useState } from "react"
import { MonitorIcon, MoonIcon, SmartphoneIcon, SunIcon } from "lucide-react"

import { SUPPORTED_LOCALES, type Locale } from "@workspace/shared/i18n"
import {
  Menubar,
  MenubarContent,
  MenubarGroup,
  MenubarItem,
  MenubarLabel,
  MenubarMenu,
  MenubarRadioGroup,
  MenubarRadioItem,
  MenubarSeparator,
  MenubarTrigger,
} from "@workspace/ui/components/menubar"

import { PhoneAccessDialog } from "@/components/tunnel/phone-access-dialog"
import { useTheme } from "@/lib/hooks/use-theme"
import { useTranslation } from "@/lib/hooks/use-translation"
import { useTunnelStore } from "@/lib/stores/tunnel.store"
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

export function AppMenubar() {
  const { theme, mode, setTheme, setMode } = useTheme()
  const { locale, setLocale, t } = useTranslation()
  const tunnelStatus = useTunnelStore((state) => state.status)
  const lanStatus = useTunnelStore((state) => state.lanStatus)
  const hydrateTunnelStatus = useTunnelStore((state) => state.hydrateFromCache)
  const [phoneDialogOpen, setPhoneDialogOpen] = useState(false)

  useEffect(() => {
    hydrateTunnelStatus()
  }, [hydrateTunnelStatus])

  return (
    <>
      <Menubar>
        <MenubarMenu>
          <MenubarTrigger>{t("theme.theme")}</MenubarTrigger>
          <MenubarContent>
            <MenubarGroup>
              <MenubarRadioGroup
                value={theme}
                onValueChange={(value) => {
                  if (value) setTheme(value as ThemeId)
                }}
              >
                {THEMES.map((definition) => (
                  <MenubarRadioItem key={definition.id} value={definition.id}>
                    <span
                      aria-hidden
                      className="size-3 shrink-0 rounded-full ring-1 ring-foreground/15"
                      style={{ backgroundColor: definition.swatch }}
                    />
                    {t(definition.labelKey)}
                  </MenubarRadioItem>
                ))}
              </MenubarRadioGroup>
            </MenubarGroup>
            <MenubarSeparator />
            <MenubarGroup>
              <MenubarLabel>{t("theme.mode")}</MenubarLabel>
              <MenubarRadioGroup
                value={mode}
                onValueChange={(value) => {
                  if (value) setMode(value as ColorMode)
                }}
              >
                {COLOR_MODES.map((definition) => {
                  const Icon = MODE_ICONS[definition.id]
                  return (
                    <MenubarRadioItem key={definition.id} value={definition.id}>
                      <Icon />
                      {t(definition.labelKey)}
                    </MenubarRadioItem>
                  )
                })}
              </MenubarRadioGroup>
            </MenubarGroup>
          </MenubarContent>
        </MenubarMenu>
        <MenubarMenu>
          <MenubarTrigger>{t("language.label")}</MenubarTrigger>
          <MenubarContent>
            <MenubarRadioGroup
              value={locale}
              onValueChange={(value) => {
                if (value) setLocale(value as Locale)
              }}
            >
              {SUPPORTED_LOCALES.map((code) => (
                <MenubarRadioItem key={code} value={code}>
                  {t(`language.${code}`)}
                </MenubarRadioItem>
              ))}
            </MenubarRadioGroup>
          </MenubarContent>
        </MenubarMenu>
        <MenubarMenu>
          <MenubarTrigger>
            <SmartphoneIcon />
            {t("tunnel.menuLabel")}
            {tunnelStatus?.active || lanStatus?.active ? (
              <span
                aria-hidden
                data-testid="tunnel-status-dot"
                className="ml-1 size-2 shrink-0 rounded-full bg-emerald-500"
              />
            ) : null}
          </MenubarTrigger>
          <MenubarContent>
            <MenubarGroup>
              <MenubarItem onClick={() => setPhoneDialogOpen(true)}>
                {t("tunnel.menuOpen")}
              </MenubarItem>
            </MenubarGroup>
          </MenubarContent>
        </MenubarMenu>
      </Menubar>
      <PhoneAccessDialog
        open={phoneDialogOpen}
        onOpenChange={setPhoneDialogOpen}
      />
    </>
  )
}
