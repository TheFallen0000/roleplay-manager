import { MonitorIcon, MoonIcon, SunIcon } from "lucide-react"

import { SUPPORTED_LOCALES, type Locale } from "@workspace/shared/i18n"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { Logo } from "@workspace/ui/components/logo"
import { ToggleGroup, ToggleGroupItem } from "@workspace/ui/components/toggle-group"

import { I18nProvider } from "@/lib/hooks/i18n-provider"
import { ThemeProvider } from "@/lib/hooks/theme-provider"
import { useTheme } from "@/lib/hooks/use-theme"
import { useTranslation } from "@/lib/hooks/use-translation"
import { setOnboardedCookie } from "@/lib/onboarding"
import { COLOR_MODES, THEMES, type ColorMode, type ThemeId } from "@/lib/themes"

const MODE_ICONS = {
  light: SunIcon,
  dark: MoonIcon,
  system: MonitorIcon,
} as const

export function Welcome({ locale }: { locale: Locale }) {
  return (
    <I18nProvider initialLocale={locale}>
      <ThemeProvider>
        <WelcomeContent />
      </ThemeProvider>
    </I18nProvider>
  )
}

function WelcomeContent() {
  const { locale, setLocale, t } = useTranslation()
  const { theme, mode, setTheme, setMode } = useTheme()

  const handleContinue = () => {
    setOnboardedCookie()
    try {
      window.location.reload()
    } catch {
      // reload unavailable (tests)
    }
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-xl">
        <CardHeader className="items-center text-center">
          <div className="mb-2 flex items-center gap-2">
            <Logo />
            <span className="font-semibold">Roleplay Manager</span>
          </div>
          <CardTitle className="text-2xl">{t("welcome.title")}</CardTitle>
          <CardDescription>{t("welcome.description")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium">{t("welcome.language")}</span>
            <ToggleGroup
              value={[locale]}
              onValueChange={(value) => {
                const next = value[0]
                if (next) setLocale(next as Locale, { reload: false })
              }}
              variant="outline"
              className="w-full"
            >
              {SUPPORTED_LOCALES.map((code) => (
                <ToggleGroupItem key={code} value={code} className="flex-1">
                  {t(`language.${code}`)}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium">{t("welcome.theme")}</span>
            <ToggleGroup
              value={[theme]}
              onValueChange={(value) => {
                const next = value[0]
                if (next) setTheme(next as ThemeId)
              }}
              variant="outline"
              className="w-full"
            >
              {THEMES.map((definition) => (
                <ToggleGroupItem
                  key={definition.id}
                  value={definition.id}
                  className="flex-1"
                >
                  <span
                    aria-hidden
                    className="size-3 shrink-0 rounded-full ring-1 ring-foreground/15"
                    style={{ backgroundColor: definition.swatch }}
                  />
                  {t(definition.labelKey)}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium">{t("welcome.mode")}</span>
            <ToggleGroup
              value={[mode]}
              onValueChange={(value) => {
                const next = value[0]
                if (next) setMode(next as ColorMode)
              }}
              variant="outline"
              className="w-full"
            >
              {COLOR_MODES.map((definition) => {
                const Icon = MODE_ICONS[definition.id]
                return (
                  <ToggleGroupItem
                    key={definition.id}
                    value={definition.id}
                    className="flex-1"
                  >
                    <Icon data-icon="inline-start" />
                    {t(definition.labelKey)}
                  </ToggleGroupItem>
                )
              })}
            </ToggleGroup>
          </div>

          <Button size="lg" onClick={handleContinue} className="w-full">
            {t("welcome.continue")}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
